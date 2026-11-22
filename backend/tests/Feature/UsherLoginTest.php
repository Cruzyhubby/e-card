<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsherLoginTest extends TestCase
{
    use RefreshDatabase;

    private function usher(): User
    {
        return User::create([
            'name' => 'Main Gate',
            'email' => 'gate.one@example.com',
            'password' => 'secret1234',
            'role' => 'usher',
            'status' => 'active',
            'device_label' => 'Main Gate',
            'must_change_password' => false,
        ]);
    }

    public function test_usher_cannot_sign_in_with_an_email_address(): void
    {
        $this->usher();

        $this->postJson('/api/auth/login', [
            'login' => 'gate.one@example.com',
            'password' => 'secret1234',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The provided credentials are incorrect.');
    }

    public function test_usher_signs_in_with_the_device_label(): void
    {
        $this->usher();

        // The label resolves the usher; the 403 is the unassigned-account
        // guard, which proves the label was accepted before any event check.
        $this->postJson('/api/auth/login', [
            'login' => 'main gate',
            'password' => 'secret1234',
        ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'This usher account is not linked to an event. Contact your organizer.');
    }
}
