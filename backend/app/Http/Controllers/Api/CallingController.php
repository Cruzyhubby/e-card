<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CallAllocation;
use App\Models\CallingParticipant;
use App\Models\Event;
use App\Services\AuditLogger;
use App\Services\CallingService;
use App\Services\OrganizerSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CallingController extends Controller
{
    public function show(Event $event, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        return response()->json($calling->organizerOverview($event));
    }

    public function optIn(Request $request, Event $event, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $enabled = (bool) $data['enabled'];
        $calling->syncOrganizer($event, $request->user(), $enabled);

        AuditLogger::record(
            'calling.organizer_opt_in',
            'Organizer calling participation was '.($enabled ? 'enabled' : 'disabled').' for event "'.$event->title.'".',
            'Event',
            $event->id
        );

        return response()->json($calling->organizerOverview($event));
    }

    public function allocate(Request $request, Event $event, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $assigned = $calling->allocate($event, $request->user());

        AuditLogger::record(
            'calling.allocated',
            $assigned.' pending guest(s) were distributed among calling participants for "'.$event->title.'".',
            'Event',
            $event->id,
            ['assigned' => $assigned]
        );

        return response()->json(array_merge(
            ['assigned' => $assigned],
            $calling->organizerOverview($event)
        ));
    }

    public function reassign(
        Request $request,
        Event $event,
        CallAllocation $allocation,
        CallingService $calling
    ): JsonResponse {
        $this->authorize('manageTeam', $event);
        $this->ensureAllocation($event, $allocation);

        $data = $request->validate([
            'participant_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $updated = $calling->reassign($allocation, $data['participant_user_id'] ?? null, $request->user());
        $updated->load(['guest', 'participant']);

        AuditLogger::record(
            'calling.reassigned',
            'A calling guest was '.($updated->participant_user_id ? 'reassigned' : 'returned to the pool').' on "'.$event->title.'".',
            'Event',
            $event->id,
            ['allocation_id' => $updated->id, 'participant_user_id' => $updated->participant_user_id]
        );

        return response()->json([
            'allocation' => $calling->allocationPayload($updated),
        ]);
    }

    public function recordAttempt(
        Request $request,
        Event $event,
        CallAllocation $allocation,
        CallingService $calling
    ): JsonResponse {
        $this->authorize('manageTeam', $event);
        $this->ensureAllocation($event, $allocation);

        $allocation->load(['guest', 'participant']);
        $data = $this->validatedAttempt($request);

        $updated = $calling->recordAttempt($allocation, $request->user(), $data, $this->followUpDays($event));
        $updated->load(['guest', 'participant', 'attempts.user']);

        AuditLogger::record(
            'calling.attempt_logged',
            'A call outcome was recorded on "'.$event->title.'".',
            'Event',
            $event->id,
            ['allocation_id' => $updated->id, 'outcome' => $updated->last_outcome]
        );

        return response()->json([
            'allocation' => $calling->allocationPayload($updated, true),
        ]);
    }

    public function mine(Request $request, CallingService $calling): JsonResponse
    {
        return response()->json($calling->usherOverview($request->user()));
    }

    public function recordMyAttempt(
        Request $request,
        CallAllocation $allocation,
        CallingService $calling
    ): JsonResponse {
        $user = $request->user();

        abort_unless($user->isUsher(), 403, 'Only usher accounts record calling outcomes here.');

        $eventId = $user->currentAssignedEventId();
        abort_if($eventId === null || (int) $allocation->event_id !== (int) $eventId, 404, 'Allocation not found.');

        abort_unless((int) $allocation->participant_user_id === (int) $user->id, 403, 'This guest is assigned to another participant.');

        $participantActive = CallingParticipant::query()
            ->where('event_id', $allocation->event_id)
            ->where('user_id', $user->id)
            ->where('active', true)
            ->exists();

        abort_unless($participantActive, 403, 'Calling operations are not enabled for this gate.');

        $allocation->load(['guest', 'participant']);
        $data = $this->validatedAttempt($request);

        $event = Event::query()->findOrFail($allocation->event_id);
        $updated = $calling->recordAttempt($allocation, $user, $data, $this->followUpDays($event));
        $updated->load(['guest', 'participant', 'attempts.user']);

        AuditLogger::record(
            'calling.attempt_logged',
            'An usher recorded a call outcome on "'.$event->title.'".',
            'Event',
            $event->id,
            ['allocation_id' => $updated->id, 'outcome' => $updated->last_outcome]
        );

        return response()->json([
            'allocation' => $calling->allocationPayload($updated, true),
        ]);
    }

    private function ensureAllocation(Event $event, CallAllocation $allocation): void
    {
        abort_unless((int) $allocation->event_id === (int) $event->id, 404, 'Allocation not found.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAttempt(Request $request): array
    {
        return $request->validate([
            'outcome' => ['required', 'string', Rule::in(config('eclat.calling_outcomes'))],
            'notes' => ['nullable', 'string', 'max:2000'],
            'follow_up_at' => [
                'nullable',
                'date',
                Rule::requiredIf(fn () => $request->input('outcome') === 'call_back_later'),
            ],
        ], [
            'follow_up_at.required' => 'Choose when this guest should be called back.',
        ]);
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
