<?php

namespace App\Services;

use App\Models\CallAllocation;
use App\Models\CallAttempt;
use App\Models\CallingParticipant;
use App\Models\Event;
use App\Models\Guest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CallingService
{
    public function syncUsher(Event $event, User $usher, bool $enabled): CallingParticipant
    {
        $participant = CallingParticipant::query()->updateOrCreate(
            ['event_id' => $event->id, 'user_id' => $usher->id],
            ['kind' => 'usher', 'active' => $enabled]
        );

        if (! $enabled) {
            $this->poolOpen($event, (int) $usher->id);
        }

        return $participant;
    }

    public function syncOrganizer(Event $event, User $organizer, bool $enabled): CallingParticipant
    {
        $participant = CallingParticipant::query()->updateOrCreate(
            ['event_id' => $event->id, 'user_id' => $organizer->id],
            ['kind' => 'organizer', 'active' => $enabled]
        );

        if (! $enabled) {
            $this->poolOpen($event, (int) $organizer->id);
        }

        return $participant;
    }

    public function deactivateUser(Event $event, int $userId): void
    {
        CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('user_id', $userId)
            ->update(['active' => false]);

        $this->poolOpen($event, $userId);
    }

    public function poolOpen(Event $event, int $userId): int
    {
        return CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('participant_user_id', $userId)
            ->where('status', 'assigned')
            ->update(['participant_user_id' => null, 'follow_up_at' => null]);
    }

    public function organizerOptIn(Event $event, int $userId): bool
    {
        return CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('user_id', $userId)
            ->where('active', true)
            ->exists();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function participants(Event $event): Collection
    {
        $rows = CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('active', true)
            ->with('user')
            ->get();

        $allocations = CallAllocation::query()
            ->where('event_id', $event->id)
            ->get(['participant_user_id', 'status', 'last_outcome', 'follow_up_at']);

        return $rows
            ->filter(fn (CallingParticipant $row): bool => $row->user !== null)
            ->map(fn (CallingParticipant $row): array => [
                'user_id' => (int) $row->user_id,
                'name' => $row->user->name,
                'kind' => $row->kind,
                'stats' => $this->statsFrom($allocations->where('participant_user_id', $row->user_id)),
            ])
            ->values();
    }

    public function organizerOverview(Event $event): array
    {
        $participants = $this->participants($event);
        $allocations = CallAllocation::query()
            ->where('event_id', $event->id)
            ->with([
                'guest:id,name,phone,card_type,attendees_count,table_number,confirmation_status',
                'participant:id,name',
                'attempts.user:id,name',
            ])
            ->withCount('attempts')
            ->orderByRaw('follow_up_at is null')
            ->orderBy('follow_up_at')
            ->orderBy('id')
            ->get();

        $pending = Guest::query()
            ->where('event_id', $event->id)
            ->where('confirmation_status', 'pending');

        $toCall = (clone $pending)->count();
        $allocated = $allocations
            ->filter(fn (CallAllocation $a): bool => $a->guest?->confirmation_status === 'pending' && $a->participant_user_id !== null)
            ->count();

        return [
            'organizer_opt_in' => $this->organizerOptIn($event, (int) $event->user_id),
            'organizer' => $participants->firstWhere('kind', 'organizer'),
            'participants' => $participants->values(),
            'totals' => [
                'guests_to_call' => $toCall,
                'allocated' => $allocated,
                'unallocated' => max(0, $toCall - $allocated),
                'called' => $allocations->whereNotNull('last_outcome')->count(),
                'confirmed' => $allocations->where('last_outcome', 'confirmed')->count(),
                'follow_ups_due' => $allocations
                    ->where('status', 'assigned')
                    ->filter(fn (CallAllocation $a): bool => $a->follow_up_at !== null && $a->follow_up_at->isPast())
                    ->count(),
            ],
            'allocations' => $allocations->map(fn (CallAllocation $a): array => $this->allocationPayload($a, true))->values(),
            'follow_up_days' => $this->followUpDays($event),
        ];
    }

    public function allocate(Event $event, User $actor): int
    {
        $participantIds = CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('active', true)
            ->pluck('user_id')
            ->map(fn ($id): int => (int) $id)
            ->values();

        if ($participantIds->isEmpty()) {
            throw ValidationException::withMessages([
                'participants' => ['Select at least one calling participant first.'],
            ]);
        }

        $guestIds = Guest::query()
            ->where('event_id', $event->id)
            ->where('confirmation_status', 'pending')
            ->whereDoesntHave('callAllocation')
            ->orderBy('id')
            ->pluck('id');

        $pooled = CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('status', 'assigned')
            ->whereNull('participant_user_id')
            ->orderBy('id')
            ->pluck('guest_id');

        if ($guestIds->isEmpty() && $pooled->isEmpty()) {
            return 0;
        }

        $loads = CallAllocation::query()
            ->where('event_id', $event->id)
            ->whereIn('participant_user_id', $participantIds)
            ->where('status', 'assigned')
            ->get(['participant_user_id'])
            ->countBy('participant_user_id');

        $counts = [];
        foreach ($participantIds as $id) {
            $counts[$id] = (int) ($loads[$id] ?? 0);
        }

        return DB::transaction(function () use ($event, $actor, $guestIds, $pooled, $counts): int {
            $created = 0;

            $next = function () use (&$counts): int {
                return (int) array_keys($counts, min($counts), true)[0];
            };

            foreach ($pooled as $guestId) {
                $target = $next();
                $counts[$target]++;

                CallAllocation::query()
                    ->where('event_id', $event->id)
                    ->where('guest_id', $guestId)
                    ->update([
                        'participant_user_id' => $target,
                        'status' => 'assigned',
                        'follow_up_at' => null,
                        'assigned_at' => now(),
                        'assigned_by' => $actor->id,
                    ]);
                $created++;
            }

            foreach ($guestIds as $guestId) {
                $target = $next();
                $counts[$target]++;

                CallAllocation::query()->create([
                    'event_id' => $event->id,
                    'guest_id' => $guestId,
                    'participant_user_id' => $target,
                    'status' => 'assigned',
                    'assigned_at' => now(),
                    'assigned_by' => $actor->id,
                ]);
                $created++;
            }

            return $created;
        });
    }

    public function reassign(CallAllocation $allocation, ?int $participantId, User $actor): CallAllocation
    {
        if ($participantId !== null) {
            $active = CallingParticipant::query()
                ->where('event_id', $allocation->event_id)
                ->where('user_id', $participantId)
                ->where('active', true)
                ->exists();

            if (! $active) {
                throw ValidationException::withMessages([
                    'participant_user_id' => ['Choose an active calling participant.'],
                ]);
            }
        }

        $allocation->update([
            'participant_user_id' => $participantId,
            'assigned_at' => $participantId !== null ? now() : $allocation->assigned_at,
            'assigned_by' => $actor->id,
        ]);

        return $allocation->refresh();
    }

    /**
     * @param  array{outcome: string, notes?: string|null, follow_up_at?: string|null}  $data
     */
    public function recordAttempt(CallAllocation $allocation, User $actor, array $data, int $followUpDays): CallAllocation
    {
        $outcome = $data['outcome'];
        $terminal = in_array($outcome, config('eclat.calling_terminal_outcomes'), true);

        $followUp = null;
        if ($outcome === 'call_back_later') {
            $followUp = ! empty($data['follow_up_at'])
                ? Carbon::parse($data['follow_up_at'])
                : now()->addDays(max(1, $followUpDays));
        } elseif (! empty($data['follow_up_at'])) {
            $followUp = Carbon::parse($data['follow_up_at']);
        }

        return DB::transaction(function () use ($allocation, $actor, $outcome, $data, $terminal, $followUp): CallAllocation {
            CallAttempt::query()->create([
                'event_id' => $allocation->event_id,
                'guest_id' => $allocation->guest_id,
                'user_id' => $actor->id,
                'outcome' => $outcome,
                'notes' => $data['notes'] ?? null,
                'follow_up_at' => $followUp,
            ]);

            $allocation->update([
                'last_outcome' => $outcome,
                'follow_up_at' => $followUp,
                'status' => $terminal ? 'completed' : 'assigned',
                'completed_at' => $terminal ? now() : null,
            ]);

            if ($outcome === 'confirmed' || $outcome === 'not_confirmed') {
                $allocation->guest?->update([
                    'confirmation_status' => $outcome === 'confirmed' ? 'confirmed' : 'declined',
                    'confirmed_at' => now(),
                    'confirmation_source' => 'call',
                ]);
            }

            return $allocation->refresh();
        });
    }

    public function closeForGuest(Guest $guest): void
    {
        CallAllocation::query()
            ->where('event_id', $guest->event_id)
            ->where('guest_id', $guest->id)
            ->where('status', 'assigned')
            ->update(['status' => 'completed', 'completed_at' => now(), 'follow_up_at' => null]);
    }

    public function autoAssignGuest(Guest $guest): void
    {
        if ($guest->confirmation_status !== 'pending') {
            return;
        }

        $event = $guest->event;

        if ($event === null || ! app(OrganizerSettings::class)->bool($event->owner, 'calling.auto_assign')) {
            return;
        }

        $participantIds = CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('active', true)
            ->pluck('user_id')
            ->map(fn ($id): int => (int) $id);

        if ($participantIds->isEmpty()) {
            return;
        }

        $loads = CallAllocation::query()
            ->where('event_id', $event->id)
            ->whereIn('participant_user_id', $participantIds)
            ->where('status', 'assigned')
            ->get(['participant_user_id'])
            ->countBy('participant_user_id');

        $target = $participantIds->sortBy(fn (int $id): int => (int) ($loads[$id] ?? 0))->first();

        CallAllocation::query()->firstOrCreate(
            ['event_id' => $event->id, 'guest_id' => $guest->id],
            [
                'participant_user_id' => $target,
                'status' => 'assigned',
                'assigned_at' => now(),
            ]
        );
    }

    public function usherOverview(User $user): array
    {
        $eventId = $user->currentAssignedEventId();

        if ($eventId === null) {
            abort(403, 'This account is not assigned to an event.');
        }

        $event = Event::query()->findOrFail($eventId);

        $participant = CallingParticipant::query()
            ->where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('active', true)
            ->exists();

        if (! $participant) {
            abort(403, 'Calling operations are not enabled for this gate.');
        }

        $allocations = CallAllocation::query()
            ->where('event_id', $event->id)
            ->where('participant_user_id', $user->id)
            ->with(['guest:id,name,phone,card_type,attendees_count,table_number,confirmation_status', 'attempts.user:id,name'])
            ->withCount('attempts')
            ->orderByRaw('follow_up_at is null')
            ->orderBy('follow_up_at')
            ->orderBy('id')
            ->get();

        return [
            'event' => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->toDateString(),
                'start_time' => $event->start_time,
                'venue' => $event->venue,
            ],
            'stats' => $this->statsFrom($allocations),
            'allocations' => $allocations->map(fn (CallAllocation $a): array => $this->allocationPayload($a, true))->values(),
            'follow_up_days' => $this->followUpDays($event),
        ];
    }

    public function allocationPayload(CallAllocation $allocation, bool $withHistory = false): array
    {
        $guest = $allocation->guest;
        $followUp = $allocation->follow_up_at;

        $payload = [
            'id' => (int) $allocation->id,
            'status' => $allocation->status,
            'last_outcome' => $allocation->last_outcome,
            'last_outcome_label' => $allocation->last_outcome
                ? config("eclat.calling_outcome_labels.{$allocation->last_outcome}", $allocation->last_outcome)
                : null,
            'follow_up_at' => $followUp?->toIso8601String(),
            'overdue' => $followUp !== null && $allocation->status === 'assigned' && $followUp->isPast(),
            'assigned_at' => $allocation->assigned_at?->toIso8601String(),
            'completed_at' => $allocation->completed_at?->toIso8601String(),
            'attempts_count' => (int) ($allocation->attempts_count ?? $allocation->attempts()->count()),
            'participant' => $allocation->participant
                ? ['id' => (int) $allocation->participant->id, 'name' => $allocation->participant->name]
                : null,
            'guest' => $guest ? [
                'id' => (int) $guest->id,
                'name' => $guest->name,
                'phone' => $guest->phone,
                'card_type' => $guest->card_type,
                'card_type_label' => config("eclat.card_type_labels.{$guest->card_type}", ucfirst((string) $guest->card_type)),
                'attendees_count' => (int) $guest->attendees_count,
                'table_number' => $guest->table_number !== null ? (int) $guest->table_number : null,
                'confirmation_status' => $guest->confirmation_status,
            ] : null,
        ];

        if ($withHistory) {
            $attempts = $allocation->relationLoaded('attempts')
                ? $allocation->attempts->sortByDesc('created_at')->take(20)->values()
                : $allocation->attempts()
                    ->with('user:id,name')
                    ->orderByDesc('created_at')
                    ->limit(20)
                    ->get();

            $payload['history'] = $attempts
                ->map(fn (CallAttempt $attempt): array => [
                    'id' => (int) $attempt->id,
                    'outcome' => $attempt->outcome,
                    'outcome_label' => config("eclat.calling_outcome_labels.{$attempt->outcome}", $attempt->outcome),
                    'notes' => $attempt->notes,
                    'follow_up_at' => $attempt->follow_up_at?->toIso8601String(),
                    'user' => $attempt->user?->name,
                    'at' => $attempt->created_at?->toIso8601String(),
                ])
                ->values();
        }

        return $payload;
    }

    /**
     * @param  Collection<int, CallAllocation>  $allocations
     * @return array<string, int>
     */
    private function statsFrom(Collection $allocations): array
    {
        $assigned = $allocations->count();
        $called = $allocations->whereNotNull('last_outcome')->count();
        $followUps = $allocations
            ->where('status', 'assigned')
            ->filter(fn (CallAllocation $a): bool => $a->follow_up_at !== null && $a->follow_up_at->isPast())
            ->count();

        return [
            'assigned' => $assigned,
            'called' => $called,
            'confirmed' => $allocations->where('last_outcome', 'confirmed')->count(),
            'unresponsive' => $allocations->whereIn('last_outcome', ['no_answer', 'busy', 'phone_off'])->count(),
            'pending' => $allocations->where('status', 'assigned')->count(),
            'follow_ups_due' => $followUps,
            'completion' => $assigned > 0 ? (int) round($called / $assigned * 100) : 0,
        ];
    }

    private function followUpDays(Event $event): int
    {
        $owner = $event->owner;

        if ($owner === null) {
            return (int) config('eclat.calling_default_follow_up_days');
        }

        return max(1, app(OrganizerSettings::class)->int($owner, 'calling.follow_up_days'));
    }
}
