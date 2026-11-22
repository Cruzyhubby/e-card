<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\UserResource;
use App\Models\Event;
use App\Models\User;
use App\Models\UsherSession;
use App\Services\AuditLogger;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['nullable', 'string', 'email', 'max:255', 'required_without:login'],
            'login' => ['nullable', 'string', 'max:255', 'required_without:email'],
            'password' => ['required', 'string'],
            'two_factor_code' => ['nullable', 'string', 'max:32'],
        ]);

        $identifier = trim((string) ($credentials['login'] ?? ''));

        if ($identifier === '') {
            $identifier = trim((string) ($credentials['email'] ?? ''));
        }

        $user = $this->findByLogin($identifier);

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            AuditLogger::record(
                'auth.login_failed',
                'Failed console sign-in for '.$identifier.'.',
                'User',
                $user?->id
            );

            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 422);
        }

        if (! $user->isActive()) {
            AuditLogger::record(
                'auth.suspended_blocked',
                'Suspended account "'.$user->name.'" attempted to sign in.',
                'User',
                $user->id,
                [],
                $user
            );

            return response()->json([
                'message' => 'This account is suspended. Contact the platform administrator.',
            ], 403);
        }

        if ($user->isUsher() && $user->currentAssignedEventId() === null) {
            AuditLogger::record(
                'auth.usher_unassigned',
                'Unassigned usher account "'.$user->name.'" attempted to sign in.',
                'User',
                $user->id,
                [],
                $user
            );

            return response()->json([
                'message' => 'This usher account is not linked to an event. Contact your organizer.',
            ], 403);
        }

        if ($user->isUsher()) {
            $eventId = $user->currentAssignedEventId();

            if ((int) $user->event_id !== $eventId) {
                $user->forceFill(['event_id' => $eventId])->save();
            }

            $user->load('event');
        }

        if ($user->hasTwoFactorEnabled()) {
            $code = trim((string) ($credentials['two_factor_code'] ?? ''));

            if ($code === '') {
                return response()->json([
                    'message' => 'Enter the code from your authenticator app to finish signing in.',
                    'code' => 'two_factor_required',
                ], 422);
            }

            if (! $twoFactor->consume($user, $code)) {
                AuditLogger::record(
                    'auth.two_factor_failed',
                    'Two-factor code rejected for '.$user->email.'.',
                    'User',
                    $user->id,
                    [],
                    $user
                );

                return response()->json([
                    'message' => 'That authenticator or recovery code is not valid.',
                    'code' => 'two_factor_invalid',
                ], 422);
            }
        }

        // Only a fully authenticated request clears the login limiter; a pending
        // or rejected two-factor step keeps counting toward the throttle.
        RateLimiter::clear($this->throttleKey($request));

        if ($user->isUsher()) {
            // One active device per gate account: a new sign-in ends the old one.
            UsherSession::query()
                ->where('user_id', $user->id)
                ->whereNull('ended_at')
                ->update(['ended_at' => now()]);
            $user->tokens()->delete();
        }

        $newToken = $user->createToken('eclat-'.$user->role);
        $token = $newToken->plainTextToken;

        if ($user->isUsher()) {
            // The account belongs to the organizer and stays untouched; this row
            // records the person operating the gate for this shift.
            UsherSession::create([
                'user_id' => $user->id,
                'event_id' => $user->currentAssignedEventId(),
                'personal_access_token_id' => $newToken->accessToken->getKey(),
                'started_at' => now(),
            ]);
        }

        AuditLogger::record(
            'auth.login',
            $user->name.' signed in to the '.($user->isUsher() ? 'gate scanner' : $user->role.' console').'.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
            'event' => $user->isUsher() && $user->event !== null
                ? new EventResource($user->event)
                : null,
            'operator' => null,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $event = null;

        if ($user->isUsher()) {
            $eventId = $user->currentAssignedEventId();
            $event = $eventId !== null
                ? Event::query()->withStats()->find($eventId)
                : null;
        }

        return response()->json([
            'user' => new UserResource($user),
            'event' => $event !== null ? new EventResource($event) : null,
            'operator' => $this->operatorForRequest($request, $user),
        ]);
    }

    /**
     * The person using a shared gate account identifies themselves after the
     * organizer hands over only the gate label and password.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->isUsher(), 403, 'Only usher accounts complete a profile here.');

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $parts = preg_split('/\s+/', trim((string) $value)) ?: [];

                    if (count($parts) < 3) {
                        $fail('Enter your full name — first, middle and last names.');
                    }
                },
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
            ],
            'phone' => ['required', 'string', 'max:32'],
        ]);

        // The gate account belongs to the organizer. The person using it for
        // this shift is recorded separately, so the account keeps its label.
        $session = $this->currentUsherSession($request, $user);

        $session?->forceFill([
            'name' => trim($data['name']),
            'phone' => trim($data['phone']),
            'email' => strtolower(trim($data['email'])),
        ])->save();

        $gate = $user->device_label ?? $user->device_id ?? 'the gate';

        AuditLogger::record(
            'auth.usher_identified',
            trim($data['name']).' identified themselves at "'.$gate.'".',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'user' => new UserResource($user->refresh()),
            'operator' => $this->operatorPayload($session),
        ]);
    }

    public function updateAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->isOrganizer() || $user->isSuperAdmin(), 403, 'Only console accounts are edited here.');

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $phone = $user->phone;

        if (array_key_exists('phone', $data)) {
            $phone = $data['phone'] !== null && trim((string) $data['phone']) !== ''
                ? trim((string) $data['phone'])
                : null;
        }

        $user->forceFill([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'phone' => $phone,
        ])->save();

        AuditLogger::record(
            'auth.account_updated',
            $user->name.' updated their account details.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'user' => new UserResource($user->refresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed', 'different:current_password'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
            'must_change_password' => false,
        ])->save();

        $currentToken = $user->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        }

        AuditLogger::record(
            'auth.password_changed',
            $user->name.' changed their console password.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'user' => new UserResource($user->refresh()),
        ]);
    }

    public function logout(Request $request): Response
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        AuditLogger::record(
            'auth.logout',
            $user->name.' signed out.',
            'User',
            $user->id,
            [],
            $user
        );

        if ($token instanceof PersonalAccessToken) {
            UsherSession::query()
                ->where('personal_access_token_id', $token->getKey())
                ->whereNull('ended_at')
                ->update(['ended_at' => now()]);
            $token->delete();
        }

        return response()->noContent();
    }

    private function currentUsherSession(Request $request, User $user): ?UsherSession
    {
        $token = $request->user()?->currentAccessToken();

        if (! $token instanceof PersonalAccessToken) {
            return null;
        }

        return UsherSession::query()->firstOrCreate(
            ['personal_access_token_id' => $token->getKey()],
            [
                'user_id' => $user->id,
                'event_id' => $user->currentAssignedEventId(),
                'started_at' => now(),
            ]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function operatorForRequest(Request $request, User $user): ?array
    {
        if (! $user->isUsher()) {
            return null;
        }

        $token = $request->user()?->currentAccessToken();

        if (! $token instanceof PersonalAccessToken) {
            return null;
        }

        return $this->operatorPayload(
            UsherSession::query()->where('personal_access_token_id', $token->getKey())->first()
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function operatorPayload(?UsherSession $session): ?array
    {
        if ($session === null || $session->name === null) {
            return null;
        }

        return [
            'name' => $session->name,
            'phone' => $session->phone,
            'email' => $session->email,
            'started_at' => $session->started_at?->toIso8601String(),
        ];
    }

    private function findByLogin(string $identifier): ?User
    {
        if ($identifier === '') {
            return null;
        }

        if (str_contains($identifier, '@')) {
            // E-mail identifies console accounts only. Shared gate accounts are
            // opened with the device label so every shift starts from the label
            // the organizer assigned, never a personal address.
            return User::query()
                ->where('email', Str::lower($identifier))
                ->where('role', '!=', 'usher')
                ->first();
        }

        // Gate accounts sign in with the device label the organizer assigned;
        // the legacy device id is accepted as a fallback.
        return User::query()
            ->where('role', 'usher')
            ->whereRaw('lower(device_label) = ?', [Str::lower($identifier)])
            ->first()
            ?? User::query()
                ->where('role', 'usher')
                ->whereRaw('lower(device_id) = ?', [Str::lower($identifier)])
                ->first();
    }

    private function throttleKey(Request $request): string
    {
        $identifier = $request->input('login') ?? $request->input('email');

        return Str::lower((string) $identifier).'|'.$request->ip();
    }
}
