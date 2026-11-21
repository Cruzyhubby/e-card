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
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $credentials['email'] = Str::lower(trim((string) $credentials['email']));

        $user = User::query()->where('email', $credentials['email'])->first();

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            AuditLogger::record(
                'auth.login_failed',
                'Failed console sign-in for '.$credentials['email'].'.',
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

        if ($currentToken instanceof \Laravel\Sanctum\PersonalAccessToken) {
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

        if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $token->delete();
        }

        return response()->noContent();
    }

    private function throttleKey(Request $request): string
    {
        return Str::lower((string) $request->input('email')).'|'.$request->ip();
    }
}
