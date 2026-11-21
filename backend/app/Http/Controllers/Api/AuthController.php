<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\UserResource;
use App\Models\Event;
use App\Models\User;
use App\Services\AuditLogger;
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
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['nullable', 'string', 'email', 'max:255', 'required_without:login'],
            'login' => ['nullable', 'string', 'max:255', 'required_without:email'],
            'password' => ['required', 'string'],
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

        RateLimiter::clear($this->throttleKey($request));

        if ($user->isUsher()) {
            // One active device per gate account: a new sign-in ends the old one.
            $user->tokens()->delete();
        }

        $token = $user->createToken('eclat-'.$user->role)->plainTextToken;

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
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $user->forceFill([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'phone' => trim($data['phone']),
        ])->save();

        AuditLogger::record(
            'auth.usher_profile_completed',
            $user->name.' entered their details on the gate scanner.',
            'User',
            $user->id,
            [],
            $user
        );

        return response()->json([
            'user' => new UserResource($user->refresh()),
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
            $token->delete();
        }

        return response()->noContent();
    }

    private function findByLogin(string $identifier): ?User
    {
        if ($identifier === '') {
            return null;
        }

        if (str_contains($identifier, '@')) {
            return User::query()->where('email', Str::lower($identifier))->first();
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
