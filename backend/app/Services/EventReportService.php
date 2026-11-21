<?php

namespace App\Services;

use App\Models\CallAllocation;
use App\Models\CallAttempt;
use App\Models\CallingParticipant;
use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\Guest;
use App\Models\MessageDispatch;
use App\Models\User;
use Illuminate\Support\Collection;

class EventReportService
{
    private const CHANNEL_LABELS = [
        'whatsapp' => 'WhatsApp',
        'email' => 'E-mail',
        'sms' => 'SMS',
    ];

    private const CONFIRMATION_SOURCE_LABELS = [
        'manual' => 'Manual entry',
        'import' => 'Guest import',
        'rsvp' => 'Guest portal RSVP',
        'call' => 'Recorded by call',
    ];

    private const VALIDATION_LABELS = [
        'valid' => 'Valid',
        'already_checked_in' => 'Already checked in',
        'denied' => 'Denied',
    ];

    public function __construct(
        private readonly TableOccupancyService $tables,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Event $event): array
    {
        return [
            'event' => $this->eventPayload($event),
            'generated_at' => now()->toIso8601String(),
            'totals' => $this->guestTotals($event),
            'confirmations' => $this->confirmations($event),
            'distribution' => $this->distribution($event),
            'calling' => $this->calling($event),
            'attendance' => $this->attendance($event),
            'tables' => $this->tables($event),
            'ushers' => $this->ushers($event),
            'confirmed_guests' => $this->confirmedGuests($event),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function eventPayload(Event $event): array
    {
        $event->loadMissing('owner:id,name,email');

        return [
            'id' => (int) $event->id,
            'title' => $event->title,
            'category' => $event->category,
            'host_name' => $event->host_name,
            'organizer' => $event->owner !== null
                ? ['name' => $event->owner->name, 'email' => $event->owner->email]
                : null,
            'event_date' => $event->event_date?->format('Y-m-d'),
            'start_time' => (string) $event->start_time,
            'start_time_label' => $event->start_time_label,
            'venue' => $event->venue,
            'invitation_status' => $event->invitation_status,
            'accent_color' => $event->accent_color,
        ];
    }

    /**
     * @return array<string, int>
     */
    public function guestTotals(Event $event): array
    {
        $row = Guest::query()
            ->where('event_id', $event->id)
            ->selectRaw('COUNT(*) AS guests')
            ->selectRaw('COALESCE(SUM(attendees_count), 0) AS seats')
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('sent', 'checked_in') THEN 1 ELSE 0 END), 0) AS invited")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled")
            ->first();

        return [
            'guests' => (int) ($row->guests ?? 0),
            'seats' => (int) ($row->seats ?? 0),
            'invited' => (int) ($row->invited ?? 0),
            'checked_in' => (int) ($row->checked_in ?? 0),
            'cancelled' => (int) ($row->cancelled ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function confirmations(Event $event): array
    {
        $totals = Guest::query()
            ->where('event_id', $event->id)
            ->selectRaw('confirmation_status, COUNT(*) AS total')
            ->groupBy('confirmation_status')
            ->pluck('total', 'confirmation_status');

        $sources = Guest::query()
            ->where('event_id', $event->id)
            ->whereNotNull('confirmation_source')
            ->selectRaw('confirmation_source, COUNT(*) AS total')
            ->groupBy('confirmation_source')
            ->pluck('total', 'confirmation_source');

        return [
            'confirmed' => (int) ($totals['confirmed'] ?? 0),
            'declined' => (int) ($totals['declined'] ?? 0),
            'pending' => (int) ($totals['pending'] ?? 0),
            'sources' => $sources
                ->map(fn ($total, string $source): array => [
                    'source' => $source,
                    'label' => $this->confirmationSourceLabel($source),
                    'total' => (int) $total,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, array<string, int|string>>
     */
    public function distribution(Event $event): array
    {
        $rows = MessageDispatch::query()
            ->where('event_id', $event->id)
            ->selectRaw('channel, status, COUNT(*) AS total')
            ->groupBy('channel', 'status')
            ->get();

        $result = [];

        foreach (self::CHANNEL_LABELS as $channel => $label) {
            $counts = ['sent' => 0, 'failed' => 0, 'queued' => 0];

            foreach ($rows->where('channel', $channel) as $row) {
                if (array_key_exists($row->status, $counts)) {
                    $counts[$row->status] = (int) $row->total;
                }
            }

            $result[$channel] = [
                'label' => $label,
                'sent' => $counts['sent'],
                'failed' => $counts['failed'],
                'queued' => $counts['queued'],
                'total' => array_sum($counts),
            ];
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function calling(Event $event): array
    {
        $attemptTotals = CallAttempt::query()
            ->where('event_id', $event->id)
            ->selectRaw('outcome, COUNT(*) AS total')
            ->groupBy('outcome')
            ->pluck('total', 'outcome');

        $outcomes = [];

        foreach (config('eclat.calling_outcomes') as $outcome) {
            $outcomes[] = [
                'value' => $outcome,
                'label' => config("eclat.calling_outcome_labels.{$outcome}", $outcome),
                'total' => (int) ($attemptTotals[$outcome] ?? 0),
            ];
        }

        $participants = CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('active', true)
            ->with('user:id,name')
            ->get()
            ->filter(fn (CallingParticipant $participant): bool => $participant->user !== null)
            ->map(fn (CallingParticipant $participant): array => [
                'name' => $participant->user->name,
                'kind' => $participant->kind,
            ])
            ->values()
            ->all();

        $assigned = CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('status', 'assigned')
            ->count();

        $completed = CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('status', 'completed')
            ->count();

        $followUpsDue = CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('status', 'assigned')
            ->whereNotNull('follow_up_at')
            ->where('follow_up_at', '<=', now())
            ->count();

        return [
            'participants' => $participants,
            'allocated' => $assigned,
            'completed' => $completed,
            'follow_ups_due' => $followUpsDue,
            'attempts' => (int) $attemptTotals->sum(),
            'outcomes' => $outcomes,
        ];
    }

    /**
     * @return array<string, int|string>
     */
    public function attendance(Event $event): array
    {
        $rows = CheckInLog::query()
            ->where('event_id', $event->id)
            ->selectRaw('validation_status, COUNT(*) AS total')
            ->groupBy('validation_status')
            ->pluck('total', 'validation_status');

        $result = ['scans' => (int) $rows->sum()];

        foreach (self::VALIDATION_LABELS as $status => $label) {
            $result[$status] = (int) ($rows[$status] ?? 0);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function tables(Event $event): array
    {
        $summary = $this->tables->summary($event);

        return [
            ...$summary['totals'],
            'unassigned_guests' => $summary['unassigned']['guests'],
            'unassigned_seats' => $summary['unassigned']['seats'],
            'rows' => $summary['tables'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function ushers(Event $event): array
    {
        return User::query()
            ->where('role', 'usher')
            ->where(function ($query) use ($event): void {
                $query->where('event_id', $event->id)
                    ->orWhereHas('usherAssignments', fn ($assignment) => $assignment
                        ->where('event_id', $event->id)
                        ->where('status', 'active'));
            })
            ->withCount('checkInLogs as scan_count')
            ->withMax('checkInLogs as last_scan_at', 'scanned_at')
            ->orderBy('name')
            ->get()
            ->map(fn (User $usher): array => [
                'id' => (int) $usher->id,
                'name' => $usher->name,
                'label' => $usher->device_label,
                'status' => $usher->status,
                'scans' => (int) $usher->scan_count,
                'last_scan_at' => $usher->last_scan_at,
            ])
            ->values()
            ->all();
    }

    /**
     * Confirmed guests with the channels that successfully delivered their pass.
     *
     * @return list<array<string, mixed>>
     */
    public function confirmedGuests(Event $event): array
    {
        /** @var Collection<int, Guest> $guests */
        $guests = Guest::query()
            ->where('event_id', $event->id)
            ->where('confirmation_status', 'confirmed')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'phone',
                'email',
                'card_type',
                'attendees_count',
                'table_number',
                'seat_number',
                'confirmation_status',
                'confirmation_source',
                'confirmed_at',
            ]);

        $deliveries = MessageDispatch::query()
            ->where('event_id', $event->id)
            ->whereIn('guest_id', $guests->pluck('id'))
            ->where('status', 'sent')
            ->get(['guest_id', 'channel'])
            ->groupBy('guest_id');

        return $guests
            ->map(function (Guest $guest) use ($deliveries): array {
                $channels = $deliveries
                    ->get($guest->id, collect())
                    ->pluck('channel')
                    ->unique()
                    ->values();

                return [
                    'id' => (int) $guest->id,
                    'name' => $guest->name,
                    'phone' => $guest->phone,
                    'email' => $guest->email,
                    'card_type' => $guest->card_type,
                    'card_type_label' => config("eclat.card_type_labels.{$guest->card_type}", ucfirst((string) $guest->card_type)),
                    'attendees' => (int) $guest->attendees_count,
                    'table_number' => $guest->table_number,
                    'table_label' => $guest->table_number !== null
                        ? (string) $guest->table_number
                        : (string) config('eclat.unassigned_table_label'),
                    'confirmation_status' => $guest->confirmation_status,
                    'confirmation_source' => $guest->confirmation_source,
                    'confirmation_source_label' => $this->confirmationSourceLabel($guest->confirmation_source),
                    'confirmed_at' => $guest->confirmed_at?->toIso8601String(),
                    'delivery' => $channels->all(),
                    'delivery_label' => $channels->isEmpty()
                        ? 'Not delivered'
                        : $channels->map(fn (string $channel): string => self::CHANNEL_LABELS[$channel] ?? ucfirst($channel))->implode(' + '),
                ];
            })
            ->values()
            ->all();
    }

    public function confirmationSourceLabel(?string $source): string
    {
        if ($source === null || $source === '') {
            return 'Not recorded';
        }

        return self::CONFIRMATION_SOURCE_LABELS[$source] ?? ucfirst(str_replace('_', ' ', $source));
    }
}
