<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function status(Request $request): JsonResponse
    {
        return response()->json($this->payload($this->consoleUser($request)));
    }

    public function setup(Request $request): JsonResponse
    {
        $user = $this->consoleUser($request);
        $data = $request->validate(['password' => ['required', 'string']]);

        $this->assertPassword($user, $data['password']);

        if ($user->two_factor_confirmed_at !== null) {
            return response()->json(['message' => 'Two-factor authentication is already enabled.'], 409);
        }

        $secret = $this->twoFactor->generateSecret();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_counter' => null,
        ])->save();

        $uri = $this->twoFactor->provisioningUri($user, $secret);

        return response()->json([
            'secret' => implode(' ', str_split($secret, 4)),
            'secret_raw' => $secret,
            'otpauth_uri' => $uri,
            'qr_data_uri' => $this->twoFactor->qrDataUri($uri),
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $user = $this->consoleUser($request);
        $data = $request->validate(['code' => ['required', 'string', 'max:16']]);

        if ($user->two_factor_secret === null || $user->two_factor_confirmed_at !== null) {
            return response()->json(['message' => 'Start two-factor setup again.'], 409);
        }

        $counter = $this->twoFactor->verify($user->two_factor_secret, $data['code']);

        if ($counter === null) {
            throw ValidationException::withMessages([
                'code' => ['That code is not valid. Check your device clock and try the next code.'],
            ]);
        }

        $recoveryCodes = $this->twoFactor->generateRecoveryCodes();
        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes,
            'two_factor_last_counter' => $counter,
        ])->save();

        AuditLogger::record(
            'auth.two_factor_enabled',
            $user->name.' enabled two-factor authentication.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'enabled' => true,
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $user = $this->consoleUser($request);
        $data = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'max:32'],
        ]);

        $this->assertPassword($user, $data['password']);

        if (! $this->twoFactor->consume($user, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['Enter a current authenticator code or one of your recovery codes.'],
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_counter' => null,
        ])->save();

        AuditLogger::record(
            'auth.two_factor_disabled',
            $user->name.' disabled two-factor authentication.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json(['enabled' => false]);
    }

    private function consoleUser(Request $request): User
    {
        $user = $request->user();

        abort_unless(
            $user instanceof User && ($user->isOrganizer() || $user->isSuperAdmin()),
            403,
            'Two-factor authentication is available to organizer and admin accounts.'
        );

        return $user;
    }

    private function assertPassword(User $user, string $password): void
    {
        if (! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The password is incorrect.'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $codes = $user->two_factor_recovery_codes ?? [];

        return [
            'enabled' => $user->two_factor_confirmed_at !== null,
            'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
            'recovery_codes_left' => $user->two_factor_confirmed_at !== null ? count($codes) : 0,
        ];
    }
}
