<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\GuestResource;
use App\Models\Guest;
use App\Services\AuditLogger;
use App\Services\EcardRendererService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvitationController extends Controller
{
    /**
     * Guests confirm or decline from their personal invitation. Delivery
     * status is untouched; confirmation is tracked separately so reports stay
     * truthful even after an invitation has been sent.
     */
    public function rsvp(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['confirmed', 'declined'])],
            'attendees_count' => ['sometimes', 'integer', 'min:1', 'max:'.config('eclat.max_group_attendees')],
            'message' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $guest = Guest::query()->with('event')->whereQrToken($token)->firstOrFail();

        if ($guest->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['This invitation has been cancelled.'],
            ]);
        }

        $changes = [
            'confirmation_status' => $data['status'],
            'confirmation_source' => 'rsvp',
            'confirmed_at' => now(),
        ];

        if (isset($data['attendees_count']) && $guest->card_type === 'group') {
            $changes['attendees_count'] = (int) $data['attendees_count'];
        }

        $guest->update($changes);

        AuditLogger::record(
            'guest.rsvp',
            'Guest "'.$guest->name.'" '.($data['status'] === 'confirmed' ? 'confirmed' : 'declined').' their invitation via the guest portal.',
            'Guest',
            $guest->id,
            ['event_id' => $guest->event_id, 'message' => $data['message'] ?? null]
        );

        return response()->json([
            'guest' => new GuestResource($guest->refresh()),
            'message' => $data['status'] === 'confirmed'
                ? 'Your attendance is confirmed. Thank you!'
                : 'Your response has been recorded. We are sorry you cannot make it.',
        ]);
    }

    public function show(string $token, EcardRendererService $renderer): JsonResponse
    {
        $guest = Guest::query()->with('event')->whereQrToken($token)->firstOrFail();
        $event = $guest->event->loadGuestStats();

        return response()->json([
            'guest' => new GuestResource($guest),
            'event' => new EventResource($event),
            'ecard_config' => $renderer->configFor($event),
            'ecard_svg_url' => url('/api/invitations/'.$guest->qr_token.'/ecard.svg'),
        ]);
    }

    public function ecardSvg(Request $request, string $token, EcardRendererService $renderer): Response
    {
        $guest = Guest::query()->with('event')->whereQrToken($token)->firstOrFail();
        $event = $guest->event->loadGuestStats();
        $svg = $renderer->render($guest, $event);

        $headers = [
            'Content-Type' => 'image/svg+xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=600',
            'ETag' => '"'.md5($svg).'"',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($request->boolean('download')) {
            $filename = Str::limit(Str::slug($event->title.' '.$guest->name), 80, '').'.svg';
            $headers['Content-Disposition'] = 'attachment; filename="'.$filename.'"';
        }

        return response($svg, 200, $headers);
    }

    public function ecardQr(string $token, EcardRendererService $renderer): Response
    {
        $guest = Guest::query()->whereQrToken($token)->firstOrFail();
        // Distribution QR opens the guest's portal, where the card can be viewed and downloaded.
        $png = $renderer->qrPng($guest->invitation_url);

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=600',
            'ETag' => '"'.md5($png).'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
