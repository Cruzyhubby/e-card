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
use Illuminate\Support\Facades\DB;

class PlatformReportService
{
    private const CHANNEL_LABELS = [
        'whatsapp' => 'WhatsApp',
        'email' => 'E-mail',
        'sms' => 'SMS',
    ];

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        return [
            'generated_at' => now()->toIso8601String(),
            'accounts' => $this->accounts(),
            'usage' => $this->usage(),
            'delivery' => $this->delivery(),
            'engagement' => $this->engagement(),
            'organizers' => $this->organizers(),
            'top_events' => $this->topEvents(),
        ];
    }

    /**
     * @return array<string, int>
     */
    public function accounts(): array
    {
        $rows = User::query()
            ->selectRaw('role, status, COUNT(*) AS total')
            ->groupBy('role', 'status')
            ->get();

        $count = fn (string $role, ?string $status = null): int => (int) $rows
            ->filter(fn ($row): bool => $row->role === $role && ($status === null || $row->status === $status))
            ->sum('total');

        return [
            'organizers' => $count('organizer'),
            'organizers_active' => $count('organizer', 'active'),
            'organizers_suspended' => $count('organizer', 'suspended'),
            'ushers' => $count('usher'),
            'ushers_active' => $count('usher', 'active'),
        ];
    }

    /**
     * @return array<string, int>
     */
    public function usage(): array
    {
        $today = now()->toDateString();

        return [
            'events' => Event::query()->count(),
            'events_live' => Event::query()->where('invitation_status', 'live')->count(),
            'events_draft' => Event::query()->where('invitation_status', 'draft')->count(),
            'events_upcoming' => Event::query()->where('event_date', '>=', $today)->count(),
            'events_completed' => Event::query()->where('event_date', '<', $today)->count(),
            'guests' => Guest::query()->count(),
            'guests_confirmed' => Guest::query()->where('confirmation_status', 'confirmed')->count(),
            'guests_declined' => Guest::query()->where('confirmation_status', 'declined')->count(),
            'guests_checked_in' => Guest::query()->where('status', 'checked_in')->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function delivery(): array
    {
        $rows = MessageDispatch::query()
            ->selectRaw('channel, status, COUNT(*) AS total')
            ->groupBy('channel', 'status')
            ->get();

        $channels = [];

        foreach (self::CHANNEL_LABELS as $channel => $label) {
            $counts = ['sent' => 0, 'failed' => 0, 'queued' => 0];

            foreach ($rows->where('channel', $channel) as $row) {
                if (array_key_exists($row->status, $counts)) {
                    $counts[$row->status] = (int) $row->total;
                }
            }

            $channels[$channel] = [
                'label' => $label,
                ...$counts,
                'total' => array_sum($counts),
            ];
        }

        return [
            'channels' => $channels,
            'sent' => (int) $rows->where('status', 'sent')->sum('total'),
            'failed' => (int) $rows->where('status', 'failed')->sum('total'),
            'queued' => (int) $rows->where('status', 'queued')->sum('total'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function engagement(): array
    {
        $scans = CheckInLog::query()
            ->selectRaw('validation_status, COUNT(*) AS total')
            ->groupBy('validation_status')
            ->pluck('total', 'validation_status');

        $outcomeTotals = CallAttempt::query()
            ->selectRaw('outcome, COUNT(*) AS total')
            ->groupBy('outcome')
            ->pluck('total', 'outcome');

        $outcomes = [];

        foreach (config('eclat.calling_outcomes') as $outcome) {
            $outcomes[] = [
                'value' => $outcome,
                'label' => config("eclat.calling_outcome_labels.{$outcome}", $outcome),
                'total' => (int) ($outcomeTotals[$outcome] ?? 0),
            ];
        }

        return [
            'check_ins_valid' => (int) ($scans['valid'] ?? 0),
            'check_ins_duplicate' => (int) ($scans['already_checked_in'] ?? 0),
            'check_ins_denied' => (int) ($scans['denied'] ?? 0),
            'check_ins_total' => (int) $scans->sum(),
            'calling_participants' => CallingParticipant::query()->where('active', true)->count(),
            'calling_allocated' => CallAllocation::query()->where('status', 'assigned')->count(),
            'calling_completed' => CallAllocation::query()->where('status', 'completed')->count(),
            'calling_attempts' => (int) $outcomeTotals->sum(),
            'calling_outcomes' => $outcomes,
        ];
    }

    /**
     * Per-organizer business performance: events, guests, confirmations,
     * delivery reliability, calling output and gate activity.
     *
     * @return list<array<string, mixed>>
     */
    public function organizers(): array
    {
        $organizers = User::query()
            ->where('role', 'organizer')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'phone', 'created_at']);

        $eventCounts = DB::table('events')
            ->selectRaw('user_id, COUNT(*) AS total')
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $guestCounts = DB::table('guests')
            ->join('events', 'events.id', '=', 'guests.event_id')
            ->selectRaw('events.user_id, COUNT(*) AS total')
            ->groupBy('events.user_id')
            ->pluck('total', 'events.user_id');

        $confirmedCounts = DB::table('guests')
            ->join('events', 'events.id', '=', 'guests.event_id')
            ->where('guests.confirmation_status', 'confirmed')
            ->selectRaw('events.user_id, COUNT(*) AS total')
            ->groupBy('events.user_id')
            ->pluck('total', 'events.user_id');

        $checkedInCounts = DB::table('guests')
            ->join('events', 'events.id', '=', 'guests.event_id')
            ->where('guests.status', 'checked_in')
            ->selectRaw('events.user_id, COUNT(*) AS total')
            ->groupBy('events.user_id')
            ->pluck('total', 'events.user_id');

        $dispatchCounts = DB::table('message_dispatches')
            ->join('events', 'events.id', '=', 'message_dispatches.event_id')
            ->selectRaw("events.user_id, SUM(CASE WHEN message_dispatches.status = 'sent' THEN 1 ELSE 0 END) AS sent")
            ->selectRaw("SUM(CASE WHEN message_dispatches.status = 'failed' THEN 1 ELSE 0 END) AS failed")
            ->groupBy('events.user_id')
            ->get()
            ->keyBy('user_id');

        $callAttempts = DB::table('call_attempts')
            ->join('events', 'events.id', '=', 'call_attempts.event_id')
            ->selectRaw('events.user_id, COUNT(*) AS total')
            ->groupBy('events.user_id')
            ->pluck('total', 'events.user_id');

        return $organizers
            ->map(fn (User $organizer): array => [
                'id' => (int) $organizer->id,
                'name' => $organizer->name,
                'email' => $organizer->email,
                'phone' => $organizer->phone,
                'status' => $organizer->status,
                'created_at' => $organizer->created_at?->toIso8601String(),
                'events' => (int) ($eventCounts[$organizer->id] ?? 0),
                'guests' => (int) ($guestCounts[$organizer->id] ?? 0),
                'confirmed' => (int) ($confirmedCounts[$organizer->id] ?? 0),
                'checked_in' => (int) ($checkedInCounts[$organizer->id] ?? 0),
                'dispatches_sent' => (int) ($dispatchCounts[$organizer->id]->sent ?? 0),
                'dispatches_failed' => (int) ($dispatchCounts[$organizer->id]->failed ?? 0),
                'call_attempts' => (int) ($callAttempts[$organizer->id] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function topEvents(): array
    {
        return Event::query()
            ->with('owner:id,name')
            ->withCount([
                'guests',
                'guests as confirmed_count' => fn ($query) => $query->where('confirmation_status', 'confirmed'),
                'guests as checked_in_count' => fn ($query) => $query->where('status', 'checked_in'),
            ])
            ->orderByDesc('guests_count')
            ->limit(12)
            ->get(['id', 'user_id', 'title', 'event_date', 'invitation_status'])
            ->map(fn (Event $event): array => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->format('Y-m-d'),
                'invitation_status' => $event->invitation_status,
                'organizer' => $event->owner?->name,
                'guests' => (int) $event->guests_count,
                'confirmed' => (int) $event->confirmed_count,
                'checked_in' => (int) $event->checked_in_count,
            ])
            ->values()
            ->all();
    }
}
