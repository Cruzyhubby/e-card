<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsherProfileTest extends TestCase
{
    use RefreshDatabase;

    private function usher(string $label): User
    {
        $organizer = User::create([
            'name' => 'Organizer',
            'email' => strtolower($label).'.owner@example.com',
            'password' => 'secret1234',
            'role' => 'organizer',
            'status' => 'active',
        ]);

        $event = Event::create([
            'user_id' => $organizer->id,
            'title' => 'Gala Night',
            'category' => 'Wedding',
            'host_name' => 'Organizer',
            'event_date' => '2026-12-31',
            'start_time' => '18:00',
            'venue' => 'City Hall',
            'total_seats' => 100,
            'total_tables' => 10,
        ]);

        return User::create([
            'name' => $label,
            'email' => strtolower($label).'@example.com',
            'password' => 'secret1234',
            'role' => 'usher',
            'status' => 'active',
            'device_label' => $label,
            'event_id' => $event->id,
            'must_change_password' => false,
        ]);
    }

    public function test_profile_details_are_stored_per_shift_without_touching_the_account(): void
    {
        $usher = $this->usher('USHER-01');

        $plain = $usher->createToken('test')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$plain];

        $this->withHeaders($headers)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('operator', null);

        $this->withHeaders($headers)->postJson('/api/auth/profile', [
            'name' => 'Amina Wanjiku Otieno',
            'phone' => '+254 712 345 678',
            'email' => 'amina@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('operator.name', 'Amina Wanjiku Otieno')
            ->assertJsonPath('operator.email', 'amina@example.com');

        $fresh = $usher->fresh();
        $this->assertSame('USHER-01', $fresh->name);
        $this->assertSame('usher-01@example.com', $fresh->email);
        $this->assertNull($fresh->phone);

        $this->assertDatabaseHas('usher_sessions', [
            'user_id' => $usher->id,
            'name' => 'Amina Wanjiku Otieno',
            'phone' => '+254 712 345 678',
            'email' => 'amina@example.com',
        ]);

        $this->withHeaders($headers)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('operator.name', 'Amina Wanjiku Otieno');

        $this->withHeaders($headers)->postJson('/api/auth/logout')->assertNoContent();

        $this->assertDatabaseMissing('usher_sessions', [
            'user_id' => $usher->id,
            'ended_at' => null,
        ]);
    }

    public function test_profile_requires_three_names_phone_and_email(): void
    {
        $usher = $this->usher('USHER-02');

        $plain = $usher->createToken('test')->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer '.$plain])
            ->postJson('/api/auth/profile', [
                'name' => 'Amina Otieno',
                'phone' => '',
                'email' => 'not-an-email',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone', 'email']);
    }
}
