<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): array {
            $response = fn () => response()->json([
                'message' => 'Too many login attempts. Please try again later.',
            ], 429);

            $identifier = Str::lower(trim((string) ($request->input('login') ?? $request->input('email'))));

            return [
                Limit::perMinute(5)->by($identifier.'|'.$request->ip())->response($response),
                // Stops credential stuffing across many accounts from one address.
                Limit::perMinute(20)->by($request->ip())->response($response),
            ];
        });
    }
}
