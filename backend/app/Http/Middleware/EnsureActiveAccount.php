<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        if (! $user->isActive()) {
            $this->revokeCurrentToken($request);

            return $this->deny('This account is suspended. Contact the platform administrator.');
        }

        if ($user->isUsher() && $user->event_id === null) {
            $this->revokeCurrentToken($request);

            return $this->deny('This usher account is no longer linked to an event.');
        }

        return $next($request);
    }

    private function revokeCurrentToken(Request $request): void
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }
    }

    private function deny(string $message): JsonResponse
    {
        return response()->json(['message' => $message], 403);
    }
}
