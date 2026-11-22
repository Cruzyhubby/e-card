<?php

namespace App\Services;

use App\Mail\InvitationMail;
use App\Models\Event;
use App\Models\Guest;
use App\Models\MessageDispatch;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class MessagingService
{
    /** @var array<int, bool> */
    private array $designGate = [];

    public function __construct(
        private readonly EcardRendererService $ecards,
        private readonly DesignService $designs,
        private readonly PlatformSettings $settings,
    ) {}

    /**
     * Dispatch invitations for an event.
     *
     * @param  list<int>|null  $guestIds
     * @return array{sent: int, skipped: int, failed: int, errors: list<string>, event: Event}
     */
    public function dispatchToEvent(Event $event, string $channel, ?array $guestIds = null, ?string $template = null): array
    {
        $query = $event->guests();

        if ($guestIds !== null) {
            $query->whereIn('id', $guestIds);
        } else {
            $query->where('status', 'pending');
        }

        $sent = 0;
        $skipped = 0;
        $failed = 0;
        $errors = [];

        foreach ($query->orderBy('name')->get() as $guest) {
            if ($guest->status === 'cancelled' || $this->recipient($guest, $channel) === null) {
                $skipped++;

                continue;
            }

            $result = $this->sendToGuest($event, $guest, $channel, $template);

            if ($result['sent']) {
                $sent++;

                continue;
            }

            $failed++;

            if ($result['error'] !== null && ! in_array($result['error'], $errors, true)) {
                $errors[] = $result['error'];
            }
        }

        if ($sent > 0 && $event->invitation_status !== 'live') {
            $event->update(['invitation_status' => 'live']);
        }

        return [
            'sent' => $sent,
            'skipped' => $skipped,
            'failed' => $failed,
            'errors' => array_slice($errors, 0, 3),
            'event' => $event->refresh()->loadGuestStats(),
        ];
    }

    /**
     * @return array{sent: bool, message: string, error: string|null}
     */
    public function sendToGuest(Event $event, Guest $guest, string $channel, ?string $template = null): array
    {
        $this->designGate[$event->id] ??= $this->designs->availableForSending($event);

        if (! $this->designGate[$event->id]) {
            throw ValidationException::withMessages([
                'design' => ['The latest e-card design is awaiting customer approval. Sending unlocks once it is approved.'],
            ]);
        }

        $message = $this->compose($event, $guest, $channel, $template);
        $recipient = $this->recipient($guest, $channel) ?? '';

        $dispatch = MessageDispatch::create([
            'event_id' => $event->id,
            'guest_id' => $guest->id,
            'channel' => $channel,
            'recipient' => $recipient,
            'status' => 'queued',
        ]);

        try {
            $providerMessageId = $this->deliver($event, $guest, $recipient, $channel, $message);
        } catch (Throwable $exception) {
            $dispatch->update([
                'status' => 'failed',
                'error' => $exception->getMessage(),
            ]);

            Log::error('Invitation dispatch failed.', [
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'channel' => $channel,
                'error' => $exception->getMessage(),
            ]);

            return ['sent' => false, 'message' => $message, 'error' => $exception->getMessage()];
        }

        $dispatch->update([
            'status' => 'sent',
            'provider_message_id' => $providerMessageId,
            'sent_at' => now(),
        ]);

        if (! in_array($guest->status, ['checked_in', 'cancelled'], true)) {
            $guest->update(['status' => 'sent']);
        }

        if ($event->invitation_status !== 'live') {
            $event->update(['invitation_status' => 'live']);
        }

        return ['sent' => true, 'message' => $message, 'error' => null];
    }

    public function compose(Event $event, Guest $guest, string $channel, ?string $template = null): string
    {
        $template = $template ?: (string) config("eclat.message_templates.{$channel}", '');

        $tableNumber = $guest->table_number !== null
            ? (string) $guest->table_number
            : (string) config('eclat.unassigned_table_label');

        return strtr($template, [
            '{guest_name}' => $guest->name,
            '{table_number}' => $tableNumber,
            '{event_title}' => $event->title,
            '{qr_link}' => rtrim((string) config('app.url'), '/').'/i/'.$guest->qr_token,
        ]);
    }

    private function deliver(Event $event, Guest $guest, string $recipient, string $channel, string $message): ?string
    {
        if ($channel === 'email') {
            return $this->deliverEmail($event, $guest, $recipient, $message);
        }

        if ($channel === 'sms') {
            return $this->deliverSms($event, $guest, $recipient, $message);
        }

        return $this->deliverWhatsApp($event, $guest, $recipient, $message);
    }

    private function deliverSms(Event $event, Guest $guest, string $recipient, string $message): ?string
    {
        $provider = trim((string) $this->platformValue('sms.provider', (string) config('services.sms.provider', 'kilakona')));
        $driver = $this->driver();
        $apiKey = trim((string) $this->platformValue('sms.api_key', (string) config('services.sms.api_key', '')));
        $apiSecret = trim((string) $this->platformValue('sms.api_secret', (string) config('services.sms.api_secret', '')));

        if ($driver !== 'live' || $provider !== 'kilakona' || $apiKey === '' || $apiSecret === '') {
            Log::info('SMS invitation dispatched through the log driver.', [
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'to' => $recipient,
                'message' => $message,
            ]);

            return null;
        }

        $countryCode = trim((string) $this->settings->get('sms.country_code', (string) config('services.sms.country_code', '255')));
        $phone = $this->normalizeWithCountryCode($recipient, $countryCode !== '' ? $countryCode : '255');

        if ($phone === null) {
            throw new RuntimeException('Guest phone number cannot be used for SMS.');
        }

        $baseUrl = rtrim((string) $this->platformValue('sms.base_url', (string) config('services.sms.base_url', 'https://messaging.kilakona.co.tz')), '/');
        $path = '/'.ltrim((string) $this->platformValue('sms.send_path', (string) config('services.sms.send_path', '/api/v1/vendor/message/send')), '/');
        $senderId = trim((string) $this->platformValue('sms.sender_id', (string) config('services.sms.sender_id', '')));

        if ($senderId === '') {
            throw new RuntimeException('Kilakona sender ID is not configured.');
        }

        $response = Http::withHeaders([
            'api_key' => $apiKey,
            'api_secret' => $apiSecret,
        ])
            ->acceptJson()
            ->timeout(20)
            ->post($baseUrl.$path, [
                'senderId' => $senderId,
                'messageType' => 'text',
                'message' => $message,
                'contacts' => $phone,
            ]);

        $payload = $response->json();

        if ($response->failed() || ! is_array($payload) || ($payload['success'] ?? false) !== true) {
            throw new RuntimeException('Kilakona SMS API error: '.$response->body());
        }

        $validContacts = $payload['data']['validContacts'] ?? null;

        if (is_numeric($validContacts) && (int) $validContacts < 1) {
            throw new RuntimeException('Kilakona rejected the recipient phone number.');
        }

        $providerMessageId = $payload['data']['shootId']
            ?? $payload['data']['id']
            ?? $payload['message_id']
            ?? $payload['id'];

        return is_scalar($providerMessageId) ? (string) $providerMessageId : null;
    }

    private function deliverWhatsApp(Event $event, Guest $guest, string $recipient, string $message): ?string
    {
        $driver = $this->driver();
        $token = $this->platformValue('whatsapp.token', (string) config('services.whatsapp.token'));
        $phoneNumberId = $this->platformValue('whatsapp.phone_number_id', (string) config('services.whatsapp.phone_number_id'));

        if (
            $driver !== 'live'
            || $token === ''
            || $phoneNumberId === ''
        ) {
            Log::info('WhatsApp invitation dispatched through the log driver.', [
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'to' => $recipient,
                'message' => $message,
            ]);

            return null;
        }

        $phone = $this->normalizePhone($recipient);

        if ($phone === null) {
            throw new RuntimeException('Guest phone number cannot be used for WhatsApp.');
        }

        $version = $this->platformValue('whatsapp.api_version', (string) config('services.whatsapp.api_version', 'v21.0'));
        $endpoint = "https://graph.facebook.com/{$version}/{$phoneNumberId}/messages";

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->post($endpoint, [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $phone,
                'type' => 'text',
                'text' => [
                    'preview_url' => true,
                    'body' => $message,
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('WhatsApp Cloud API error: '.$response->body());
        }

        // The QR follows the message and opens the guest's portal, where the e-card can be viewed and downloaded.
        $qrResponse = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->post($endpoint, [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $phone,
                'type' => 'image',
                'image' => [
                    'link' => $guest->qr_image_url,
                ],
            ]);

        if ($qrResponse->failed()) {
            throw new RuntimeException('WhatsApp QR delivery error: '.$qrResponse->body());
        }

        $providerMessageId = $response->json('messages.0.id');

        return is_string($providerMessageId) ? $providerMessageId : null;
    }

    private function deliverEmail(Event $event, Guest $guest, string $recipient, string $message): ?string
    {
        $driver = $this->driver();
        $host = $this->platformValue('mail.host', '');

        if ($driver !== 'live' || ($host === '' && config('mail.default') === 'log')) {
            Log::info('Email invitation dispatched through the log driver.', [
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'to' => $recipient,
                'message' => $message,
            ]);

            return null;
        }

        if ($host !== '') {
            $this->applySmtpSettings($host);
        }

        Mail::to($recipient)->send(new InvitationMail(
            $event,
            $guest,
            $message,
            $this->ecards->render($guest, $event),
        ));

        return null;
    }

    private function driver(): string
    {
        return $this->settings->has('messaging.driver')
            ? (string) $this->settings->get('messaging.driver')
            : (string) config('eclat.messaging_driver', 'log');
    }

    private function platformValue(string $key, string $environment): string
    {
        $value = $this->settings->has($key) ? (string) $this->settings->get($key) : $environment;

        return trim($value);
    }

    private function applySmtpSettings(string $host): void
    {
        $encryption = (string) $this->settings->get('mail.encryption', 'tls');

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.host', $host);
        Config::set('mail.mailers.smtp.port', (int) $this->settings->get('mail.port', 587));
        Config::set('mail.mailers.smtp.username', (string) $this->settings->get('mail.username', ''));
        Config::set('mail.mailers.smtp.password', (string) $this->settings->get('mail.password', ''));
        Config::set('mail.mailers.smtp.encryption', $encryption === 'none' ? null : $encryption);

        $fromAddress = (string) $this->settings->get('mail.from_address', '');

        if ($fromAddress !== '') {
            Config::set('mail.from.address', $fromAddress);
        }

        $fromName = (string) $this->settings->get('mail.from_name', '');

        if ($fromName !== '') {
            Config::set('mail.from.name', $fromName);
        }

        Mail::purge('smtp');
    }

    private function recipient(Guest $guest, string $channel): ?string
    {
        $value = trim((string) ($channel === 'email' ? $guest->email : $guest->phone));

        return $value === '' ? null : $value;
    }

    private function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (! is_string($digits) || $digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = '234'.substr($digits, 1);
        }

        return strlen($digits) >= 8 ? $digits : null;
    }

    private function normalizeWithCountryCode(string $phone, string $countryCode): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        $code = preg_replace('/\D+/', '', $countryCode);

        if (! is_string($digits) || $digits === '' || ! is_string($code) || $code === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = $code.substr($digits, 1);
        }

        return strlen($digits) >= 8 ? $digits : null;
    }
}
