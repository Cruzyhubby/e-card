<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_failed_logins_are_throttled(): void
    {
        $payload = [
            'email' => 'brute-force@example.com',
            'password' => 'wrong-password',
        ];

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', $payload)
                ->assertStatus(422)
                ->assertJsonPath('message', 'The provided credentials are incorrect.');
        }

        $this->postJson('/api/auth/login', $payload)
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too many login attempts. Please try again later.');
    }

    public function test_validation_errors_are_throttled_too(): void
    {
        $payload = ['email' => 'not-an-email', 'password' => ''];

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/auth/login', $payload)->assertStatus(422);
        }

        $this->postJson('/api/auth/login', $payload)->assertStatus(429);
    }
}
