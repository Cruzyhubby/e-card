<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\PlatformSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetController extends Controller
{
    private const CODE_TTL_MINUTES = 15;

    public function __construct(private readonly PlatformSettings $settings) {}

    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($data['email']));
        $user = User::query()->where('email', $email)->first();

        // Ushers use the gate scanner and are managed by their organizer, so the
        // web reset flow never issues codes for usher accounts.
        if ($user !== null && ($user->isOrganizer() || $user->isSuperAdmin()) && $user->isActive()) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($code), 'created_at' => now()]
            );

            $this->sendCode($user, $code);

            AuditLogger::record(
                'auth.password_reset_requested',
                $user->name.' requested a password reset code.',
                'User',
                $user->id
            );
        }

        return response()->json([
            'message' => 'If an organizer or admin account exists for that e-mail, a reset code has been sent.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $email = Str::lower(trim($data['email']));
        $attemptKey = 'password-reset:'.$email.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($attemptKey, 10)) {
            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Request a new code and try again in a few minutes.'],
            ]);
        }

        $record = DB::table('password_reset_tokens')->where('email', $email)->first();
        $user = User::query()->where('email', $email)->first();

        $isRecent = $record !== null
            && $record->created_at !== null
            && Carbon::parse($record->created_at)->gte(now()->subMinutes(self::CODE_TTL_MINUTES));

        $isAllowedRole = $user !== null && ($user->isOrganizer() || $user->isSuperAdmin());
        $matches = $isRecent && $isAllowedRole && Hash::check($data['code'], (string) $record->token);

        if (! $matches) {
            RateLimiter::hit($attemptKey, self::CODE_TTL_MINUTES * 60);

            throw ValidationException::withMessages([
                'code' => ['This reset code is invalid or has expired.'],
            ]);
        }

        RateLimiter::clear($attemptKey);

        $user->forceFill([
            'password' => $data['password'],
            'must_change_password' => false,
        ])->save();

        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        AuditLogger::record(
            'auth.password_reset',
            $user->name.' reset their password with an e-mailed code.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'message' => 'Your password has been reset. You can sign in now.',
        ]);
    }

    private function sendCode(User $user, string $code): void
    {
        $host = (string) $this->settings->get('mail.host', '');

        if ($host !== '') {
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
        }

        try {
            Mail::to($user->email)->send(
                new PasswordResetCodeMail($user->name, $code, self::CODE_TTL_MINUTES)
            );
        } catch (Throwable $error) {
            // The response stays generic, so a mailer outage never reveals whether
            // the address belongs to an account; the code simply cannot be used.
            Log::warning('Password reset code e-mail failed to send.', [
                'user_id' => $user->id,
                'error' => $error->getMessage(),
            ]);
        }
    }
}
