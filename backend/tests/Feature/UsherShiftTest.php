<?php

namespace Tests\Feature;

use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\User;
use App\Models\UsherSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsherShiftTest extends TestCase
{
    use RefreshDatabase;

    public function test_organizer_sees_operator_details_and_scan_counts_per_shift(): void
    {
        [$organizer, $event] = $this->organizerWithEvent('Gala Night');
        $usher = $this->usher($organizer, $event, 'USHER-01');

        $session = UsherSession::create([
            'user_id' => $usher->id,
            'event_id' => $event->id,
            'name' => 'Amina Wanjiku Otieno',
            'phone' => '+254 712 345 678',
            'email' => 'amina@example.com',
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
        ]);

        $this->log($event, $usher, $session, 'valid');
        $this->log($event, $usher, $session, 'denied');

        $response = $this->withHeaders($this->auth($organizer))->getJson('/api/usher-shifts');

        $response->assertOk()
            ->assertJsonPath('data.0.operator.name', 'Amina Wanjiku Otieno')
            ->assertJsonPath('data.0.operator.phone', '+254 712 345 678')
            ->assertJsonPath('data.0.operator.email', 'amina@example.com')
            ->assertJsonPath('data.0.gate_label', 'USHER-01')
            ->assertJsonPath('data.0.scans.total', 2)
            ->assertJsonPath('data.0.scans.valid', 1)
            ->assertJsonPath('data.0.scans.denied', 1)
            ->assertJsonPath('data.0.active', false)
            ->assertJsonPath('stats.shifts', 1)
            ->assertJsonPath('stats.scans', 2);
    }

    public function test_shift_scans_are_listed_on_the_detail_endpoint(): void
    {
        [$organizer, $event] = $this->organizerWithEvent('Wedding');
        $usher = $this->usher($organizer, $event, 'USHER-02');

        $session = UsherSession::create([
            'user_id' => $usher->id,
            'event_id' => $event->id,
            'name' => 'Juma Ali Hassan',
            'started_at' => now()->subMinutes(30),
        ]);

        $this->log($event, $usher, $session, 'valid');

        $this->withHeaders($this->auth($organizer))
            ->getJson("/api/usher-shifts/{$session->id}")
            ->assertOk()
            ->assertJsonPath('shift.operator.name', 'Juma Ali Hassan')
            ->assertJsonPath('shift.active', true)
            ->assertJsonPath('data.0.validation_status', 'valid');
    }

    public function test_another_organizer_cannot_read_the_shift(): void
    {
        [$organizer, $event] = $this->organizerWithEvent('Private Gala');
        [$other] = $this->organizerWithEvent('Other Event');
        $usher = $this->usher($organizer, $event, 'USHER-03');

        $session = UsherSession::create([
            'user_id' => $usher->id,
            'event_id' => $event->id,
            'started_at' => now(),
        ]);

        $this->withHeaders($this->auth($other))
            ->getJson('/api/usher-shifts')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeaders($this->auth($other))
            ->getJson("/api/usher-shifts/{$session->id}")
            ->assertNotFound();
    }

    public function test_ushers_cannot_review_shifts(): void
    {
        [$organizer, $event] = $this->organizerWithEvent('Gala');
        $usher = $this->usher($organizer, $event, 'USHER-04');

        $this->withHeaders($this->auth($usher))
            ->getJson('/api/usher-shifts')
            ->assertForbidden();
    }

    private function organizerWithEvent(string $title): array
    {
        $organizer = User::create([
            'name' => 'Amara Okafor',
            'email' => strtolower(str_replace(' ', '.', $title)).'@example.com',
            'password' => 'secret1234',
            'role' => 'organizer',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        $event = Event::create([
            'user_id' => $organizer->id,
            'title' => $title,
            'category' => 'Gala',
            'host_name' => 'Amara',
            'event_date' => '2026-12-31',
            'start_time' => '18:00',
            'venue' => 'City Hall',
            'total_seats' => 100,
            'total_tables' => 10,
        ]);

        return [$organizer, $event];
    }

    private function usher(User $organizer, Event $event, string $label): User
    {
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

    private function log(Event $event, User $usher, UsherSession $session, string $status): CheckInLog
    {
        return CheckInLog::create([
            'event_id' => $event->id,
            'usher_id' => $usher->id,
            'usher_session_id' => $session->id,
            'device_id' => $usher->device_label,
            'validation_status' => $status,
            'scanned_at' => now(),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function auth(User $user): array
    {
        return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
    }
}
