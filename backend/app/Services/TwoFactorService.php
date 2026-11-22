<?php

namespace App\Services;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Throwable;

class TwoFactorService
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    private const PERIOD = 30;

    private const DIGITS = 6;

    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    public function provisioningUri(User $user, string $secret): string
    {
        $issuer = (string) config('app.name', 'Eclat');
        $account = $user->email ?: $user->name;

        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            rawurlencode($issuer),
            rawurlencode($account),
            $secret,
            rawurlencode($issuer),
            self::DIGITS,
            self::PERIOD
        );
    }

    public function qrDataUri(string $uri): ?string
    {
        try {
            $renderer = new ImageRenderer(new RendererStyle(240, 2), new SvgImageBackEnd);
            $svg = (new Writer($renderer))->writeString($uri);

            return 'data:image/svg+xml;base64,'.base64_encode($svg);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Verify a TOTP code and return the accepted time counter, or null.
     * Counters at or below $lastCounter are rejected so a code cannot be replayed.
     */
    public function verify(string $secret, string $code, ?int $lastCounter = null): ?int
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';

        if (! preg_match('/^\d{'.self::DIGITS.'}$/', $code)) {
            return null;
        }

        $key = $this->base32Decode($secret);

        if ($key === '') {
            return null;
        }

        $counter = intdiv(time(), self::PERIOD);

        for ($offset = -1; $offset <= 1; $offset++) {
            $candidate = $counter + $offset;

            if ($candidate < 0 || ($lastCounter !== null && $candidate <= $lastCounter)) {
                continue;
            }

            if (hash_equals($this->codeFor($key, $candidate), $code)) {
                return $candidate;
            }
        }

        return null;
    }

    public function consume(User $user, string $code): bool
    {
        if ($user->two_factor_secret !== null) {
            $counter = $this->verify($user->two_factor_secret, $code, $user->two_factor_last_counter);

            if ($counter !== null) {
                $user->forceFill(['two_factor_last_counter' => $counter])->save();

                return true;
            }
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    /**
     * @return list<string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $raw = $this->base32Encode(random_bytes(8));
            $codes[] = substr($raw, 0, 5).'-'.substr($raw, 5, 5).'-'.substr($raw, 10, 3);
        }

        return $codes;
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];
        $normalized = $this->normalizeRecoveryCode($code);

        if ($normalized === '') {
            return false;
        }

        foreach ($codes as $index => $stored) {
            if (hash_equals($this->normalizeRecoveryCode((string) $stored), $normalized)) {
                unset($codes[$index]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

                return true;
            }
        }

        return false;
    }

    private function normalizeRecoveryCode(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    }

    private function codeFor(string $key, int $counter): string
    {
        $hash = hash_hmac('sha1', pack('J', $counter), $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $bytes): string
    {
        $bits = '';

        foreach (str_split($bytes) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';

        foreach (str_split($bits, 5) as $chunk) {
            $encoded .= self::ALPHABET[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
        }

        return $encoded;
    }

    private function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret) ?? '');

        if ($secret === '') {
            return '';
        }

        $bits = '';

        foreach (str_split($secret) as $character) {
            $position = strpos(self::ALPHABET, $character);

            if ($position === false) {
                return '';
            }

            $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }

        $decoded = '';

        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $decoded .= chr(bindec($byte));
            }
        }

        return $decoded;
    }
}
