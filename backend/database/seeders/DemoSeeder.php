<?php

namespace Database\Seeders;

use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\Guest;
use App\Models\MessageDispatch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    private const FIRST_NAMES = [
        'Adaeze', 'Tunde', 'Chinedu', 'Ngozi', 'Bola', 'Emeka', 'Funke', 'Kelechi',
        'Yewande', 'Ifeanyi', 'Amara', 'Zainab', 'Femi', 'Obi', 'Aisha', 'Damilola',
        'Uche', 'Halima', 'Segun', 'Nneka', 'Tobi', 'Chioma', 'Musa', 'Folake',
        'Obinna', 'Kemi', 'Sodiq', 'Ekaete', 'Bisi', 'Ifeoma', 'Adekunle', 'Osas',
        'Chiamaka', 'Ibrahim', 'Morayo', 'Nnamdi', 'Ronke', 'Suleiman', 'Titilayo', 'Uzoma',
    ];

    /**
     * @var list<string>
     */
    private const LAST_NAMES = [
        'Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Eze', 'Bello', 'Adebayo', 'Okonkwo',
        'Yusuf', 'Achebe', 'Olawale', 'Ibeh', 'Abubakar', 'Ogunlesi', 'Mbah', 'Oni',
        'Danjuma', 'Ezeani', 'Ajayi', 'Ojo', 'Ibrahim', 'Chukwu', 'Afolabi', 'Lawal',
        'Obi', 'Aluko', 'Ekong', 'Mohammed', 'Onyeka', 'Salami',
    ];

    /**
     * @var list<string>
     */
    private const INTERNATIONAL_NAMES = [
        'Sophia Laurent', 'Marcus Bennett', 'Laila Haddad', 'Daniel Kim', 'Elena Petrova',
        'James Whitfield', 'Priya Sharma', 'Lucas Meyer', 'Amina Diallo', 'Thomas Osei',
        'Isabella Rossi', 'Noah Andersen', 'Grace Mwangi', 'Rafael Mendes', 'Hannah Cohen',
        'Omar Farouk', 'Charlotte Dubois', 'Kwame Mensah', 'Mei Lin', 'Andre Silva',
    ];

    public function run(): void
    {
        // Demo accounts share one public password; never create or reset them
        // on a production database unless an operator explicitly opts in.
        if (app()->environment('production') && ! filter_var(env('ALLOW_DEMO_SEED', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->command?->warn('DemoSeeder skipped: demo accounts are disabled in production.');

            return;
        }

        $organizer = User::query()->updateOrCreate(
            ['email' => 'organizer@eclat.app'],
            [
                'name' => 'Amara Okafor',
                'password' => Hash::make('password'),
                'must_change_password' => false,
                'role' => 'organizer',
                'status' => 'active',
                'phone' => '+234 803 555 0101',
                'device_id' => null,
                'event_id' => null,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@eclat.app'],
            [
                'name' => 'Fahari Admin',
                'password' => Hash::make('password'),
                'must_change_password' => false,
                'role' => 'super_admin',
                'status' => 'active',
                'phone' => '+234 803 555 0102',
                'device_id' => null,
                'event_id' => null,
            ]
        );

        $definitions = [
            [
                'title' => "Adaeze & Tunde's Wedding",
                'category' => 'wedding',
                'host_name' => 'The Adeyemis',
                'days_offset' => 0,
                'start_time' => '16:00',
                'venue' => 'The Grand Ballroom, Eko Hotel, Lagos',
                'total_seats' => 220,
                'total_tables' => 22,
                'description' => 'Join us as we celebrate the union of Adaeze and Tunde with an evening of love, music and joy.',
                'accent_color' => '#A87F2E',
                'template' => 'ivory',
                'bg_color' => '#FDFAF3',
                'text_color' => '#2E2A24',
                'name_y' => 57,
                'qr_position' => 'bottom-center',
                'qr_size' => 128,
                'guest_count' => 64,
            ],
            [
                'title' => 'Nova Bank Annual Gala',
                'category' => 'gala',
                'host_name' => 'Nova Bank',
                'days_offset' => 13,
                'start_time' => '18:30',
                'venue' => 'Convention Centre, Abuja',
                'total_seats' => 400,
                'total_tables' => 40,
                'description' => "An evening of excellence honouring the people shaping Africa's financial future.",
                'accent_color' => '#C49A3C',
                'template' => 'noir',
                'bg_color' => '#08120E',
                'text_color' => '#FDFAF3',
                'name_y' => 60,
                'qr_position' => 'bottom-center',
                'qr_size' => 140,
                'guest_count' => 112,
            ],
            [
                'title' => "Zara's 30th Birthday",
                'category' => 'birthday',
                'host_name' => 'Zara Bello',
                'days_offset' => -6,
                'start_time' => '19:00',
                'venue' => 'Sky Lounge, Victoria Island',
                'total_seats' => 80,
                'total_tables' => 8,
                'description' => 'Three decades of Zara — cocktails, dancing and a skyline view.',
                'accent_color' => '#D08A6A',
                'template' => 'terracotta',
                'bg_color' => '#2B1210',
                'text_color' => '#FDFAF3',
                'name_y' => 58,
                'qr_position' => 'bottom-right',
                'qr_size' => 120,
                'guest_count' => 42,
            ],
            [
                'title' => 'Class of 2026 Graduation',
                'category' => 'graduation',
                'host_name' => 'University of Lagos',
                'days_offset' => 62,
                'start_time' => '11:00',
                'venue' => 'University Auditorium, Lagos',
                'total_seats' => 300,
                'total_tables' => 30,
                'description' => 'Celebrating the Class of 2026 as they begin their next chapter.',
                'accent_color' => '#E2C97E',
                'template' => 'emerald',
                'bg_color' => '#152B22',
                'text_color' => '#FDFAF3',
                'name_y' => 62,
                'qr_position' => 'bottom-left',
                'qr_size' => 126,
                'guest_count' => 96,
            ],
        ];

        foreach ($definitions as $index => $definition) {
            $event = Event::query()->firstOrNew([
                'title' => $definition['title'],
                'user_id' => $organizer->id,
            ]);

            $eventDate = Carbon::today()->addDays($definition['days_offset']);

            // The "today" event is seeded mid-way through its gate session so the
            // dashboard shows recent (never future-dated) check-ins.
            $startTime = $definition['days_offset'] === 0
                ? Carbon::now()->subHours(3)->format('H:i')
                : $definition['start_time'];

            $event->fill([
                'category' => $definition['category'],
                'host_name' => $definition['host_name'],
                'event_date' => $eventDate->toDateString(),
                'start_time' => $startTime,
                'venue' => $definition['venue'],
                'total_seats' => $definition['total_seats'],
                'total_tables' => $definition['total_tables'],
                'description' => $definition['description'],
                'accent_color' => $definition['accent_color'],
                'invitation_status' => 'live',
                'ecard_config' => [
                    'template' => $definition['template'],
                    'bg_color' => $definition['bg_color'],
                    'accent_color' => $definition['accent_color'],
                    'text_color' => $definition['text_color'],
                    'name_y' => $definition['name_y'],
                    'qr_position' => $definition['qr_position'],
                    'qr_size' => $definition['qr_size'],
                ],
            ]);

            $event->save();

            $usherPhone = '+234 800 000 000'.($index + 1);

            $usher = User::query()->updateOrCreate(
                ['email' => $index === 0 ? 'usher@eclat.app' : 'gate.'.($index + 1).'@gate.eclat.local'],
                [
                    'name' => $index === 0 ? 'Main Gate' : 'Gate '.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                    'password' => preg_replace('/\D+/', '', $usherPhone),
                    'must_change_password' => true,
                    'role' => 'usher',
                    'status' => 'active',
                    'phone' => $usherPhone,
                    'event_id' => $event->id,
                    'device_id' => 'USHER-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                ]
            );

            $usher->tokens()->delete();

            $event->checkInLogs()->delete();
            $event->messageDispatches()->delete();
            $event->guests()->delete();

            $this->seedGuests($event, $usher, $definition['guest_count'], $index);
        }
    }

    private function seedGuests(Event $event, User $usher, int $guestCount, int $seed): void
    {
        mt_srand(20261108 + $seed);

        $eventStart = Carbon::parse(
            $event->event_date->format('Y-m-d').' '.$event->start_time,
            config('app.timezone')
        );

        // Upcoming events have invitations out but no gate activity yet.
        $checkedInCount = $eventStart->isPast() ? max(1, (int) round($guestCount * 0.18)) : 0;
        $sentCount = (int) round($guestCount * 0.55);
        $cancelledCount = 2;
        $pendingCount = max(0, $guestCount - $checkedInCount - $sentCount - $cancelledCount);

        $statuses = array_merge(
            array_fill(0, $checkedInCount, 'checked_in'),
            array_fill(0, $sentCount, 'sent'),
            array_fill(0, $cancelledCount, 'cancelled'),
            array_fill(0, $pendingCount, 'pending'),
        );

        shuffle($statuses);

        $guests = [];
        $gateNow = Carbon::now();

        foreach ($statuses as $index => $status) {
            $name = $this->makeName($index);
            $hasTable = $index % 17 !== 0;

            $tableNumber = $hasTable ? (($index % max(1, $event->total_tables)) + 1) : null;
            $seatNumber = $hasTable ? (intdiv($index, max(1, $event->total_tables)) + 1) : null;
            $checkedInAt = $status === 'checked_in'
                ? $eventStart->copy()
                    ->addMinutes(mt_rand(0, 150))
                    ->min($gateNow->copy()->subMinutes(mt_rand(1, 20)))
                : null;

            $guests[] = $event->guests()->create([
                'name' => $name,
                'phone' => sprintf('+234 80%d %03d %04d', mt_rand(3, 9), mt_rand(100, 999), mt_rand(1000, 9999)),
                'email' => $this->makeEmail($name, $index),
                'table_number' => $tableNumber,
                'seat_number' => $seatNumber,
                'is_vip' => $index % 9 === 0,
                'status' => $status,
                'checked_in_at' => $checkedInAt,
            ]);
        }

        $checkedInGuests = array_values(array_filter(
            $guests,
            fn (Guest $guest): bool => $guest->status === 'checked_in'
        ));

        foreach ($checkedInGuests as $index => $guest) {
            CheckInLog::create([
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'usher_id' => $usher->id,
                'device_id' => $usher->device_id ?? 'USHER-01',
                'token_attempted' => $guest->qr_token,
                'validation_status' => 'valid',
                'scanned_at' => $guest->checked_in_at,
                'ip_address' => '192.168.1.'.mt_rand(10, 60),
            ]);

            if ($index % 5 === 0) {
                CheckInLog::create([
                    'event_id' => $event->id,
                    'guest_id' => $guest->id,
                    'usher_id' => $usher->id,
                    'device_id' => $usher->device_id ?? 'USHER-01',
                    'token_attempted' => $guest->qr_token,
                    'validation_status' => 'already_checked_in',
                    'scanned_at' => $guest->checked_in_at?->copy()->addMinutes(mt_rand(4, 30))
                        ->min($gateNow->copy()->subMinutes(mt_rand(1, 15))),
                    'ip_address' => '192.168.1.'.mt_rand(10, 60),
                ]);
            }
        }

        for ($denied = 0; $denied < 2 && $checkedInGuests !== []; $denied++) {
            CheckInLog::create([
                'event_id' => $event->id,
                'guest_id' => null,
                'usher_id' => $usher->id,
                'device_id' => $usher->device_id ?? 'USHER-01',
                'token_attempted' => (string) Str::uuid(),
                'validation_status' => 'denied',
                'scanned_at' => $eventStart->copy()->addMinutes(mt_rand(60, 150))
                    ->min($gateNow->copy()->subMinutes(mt_rand(1, 25))),
                'ip_address' => '192.168.1.'.mt_rand(10, 60),
            ]);
        }

        $dispatchIndex = 0;

        $sentAt = $eventStart->isFuture()
            ? Carbon::now()->subHours(mt_rand(6, 96))
            : $eventStart->copy()->subDays(mt_rand(1, 7))->addMinutes(mt_rand(0, 600));

        foreach ($guests as $guest) {
            if (! in_array($guest->status, ['sent', 'checked_in'], true)) {
                continue;
            }

            $channel = $dispatchIndex % 3 === 0 ? 'email' : 'whatsapp';
            $recipient = $channel === 'email' ? $guest->email : $guest->phone;

            if ($recipient === null) {
                continue;
            }

            MessageDispatch::create([
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'channel' => $channel,
                'recipient' => $recipient,
                'status' => 'sent',
                'provider_message_id' => $channel === 'whatsapp'
                    ? 'wamid.demo-'.Str::random(16)
                    : 'mail.demo-'.Str::random(16),
                'error' => null,
                'sent_at' => $sentAt->copy()->addMinutes(mt_rand(0, 240)),
            ]);

            $dispatchIndex++;
        }
    }

    private function makeName(int $index): string
    {
        if ($index % 7 === 3) {
            return self::INTERNATIONAL_NAMES[array_rand(self::INTERNATIONAL_NAMES)];
        }

        return self::FIRST_NAMES[array_rand(self::FIRST_NAMES)]
            .' '.self::LAST_NAMES[array_rand(self::LAST_NAMES)];
    }

    private function makeEmail(string $name, int $index): string
    {
        $slug = trim((string) preg_replace('/[^a-z0-9]+/', '.', Str::lower(Str::ascii($name))), '.');

        return $slug.'.'.($index + 1).'@example.com';
    }
}
