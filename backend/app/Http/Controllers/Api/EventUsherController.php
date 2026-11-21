<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UsherResource;
use App\Models\Event;
use App\Models\EventUsherAssignment;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\CallingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventUsherController extends Controller
{
    public function index(Request $request, Event $event): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $ushers = User::query()
            ->where('role', 'usher')
            ->where(function ($query) use ($event): void {
                $query->where('event_id', $event->id)
                    ->orWhereHas('usherAssignments', fn ($assignment) => $assignment
                        ->where('event_id', $event->id)
                        ->where('status', 'active'));
            })
            ->with(['usherAssignments' => fn ($assignment) => $assignment
                ->where('event_id', $event->id)
                ->where('status', 'active')])
            ->withCount('checkInLogs as scan_count')
            ->withMax('checkInLogs as last_scan_at', 'scanned_at')
            ->orderBy('name')
            ->get()
            ->each(function (User $usher): void {
                $assignment = $usher->usherAssignments->first();
                $usher->setAttribute('calling_enabled', (bool) ($assignment?->calling_enabled ?? false));
                $usher->setAttribute('assignment_id', $assignment?->id);
                $usher->setAttribute('assigned_at', $assignment?->assigned_at?->toIso8601String());
            });

        return response()->json([
            'data' => UsherResource::collection($ushers),
            'stats' => [
                'total' => $ushers->count(),
                'active' => $ushers->where('status', 'active')->count(),
                'scans' => (int) $ushers->sum('scan_count'),
            ],
        ]);
    }

    public function store(Request $request, Event $event, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $data = $request->validate([
            'device_label' => [
                'required',
                'string',
                'max:40',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $this->ensureLabelAvailable((string) $value, null, $fail);
                },
            ],
            'password' => ['required', 'string', 'min:6', 'max:255'],
            'calling_enabled' => ['sometimes', 'boolean'],
        ]);

        $usher = DB::transaction(function () use ($data, $event, $request): User {
            $label = trim($data['device_label']);

            $usher = User::query()->create([
                'name' => $label,
                'email' => null,
                'password' => $data['password'],
                'must_change_password' => false,
                'role' => 'usher',
                'status' => 'active',
                'phone' => null,
                'event_id' => $event->id,
                'device_label' => $label,
            ]);

            EventUsherAssignment::query()->create([
                'event_id' => $event->id,
                'user_id' => $usher->id,
                'calling_enabled' => (bool) ($data['calling_enabled'] ?? false),
                'status' => 'active',
                'assigned_at' => now(),
                'assigned_by' => $request->user()->id,
            ]);

            return $usher;
        });

        if ((bool) ($data['calling_enabled'] ?? false)) {
            $calling->syncUsher($event, $usher, true);
        }

        AuditLogger::record(
            'usher.created',
            'Gate account "'.$usher->device_label.'" was created for event "'.$event->title.'".',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher, $event)),
        ], 201);
    }

    /**
     * Reuse an existing gate account on another event. The account keeps its
     * label, password and history; access to the previous event is ended.
     */
    public function assign(Request $request, Event $event, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $data = $request->validate([
            'device_label' => ['required', 'string', 'max:40'],
            'calling_enabled' => ['sometimes', 'boolean'],
        ]);

        $label = Str::lower(trim($data['device_label']));
        $usher = User::query()
            ->where('role', 'usher')
            ->whereRaw('lower(device_label) = ?', [$label])
            ->first();

        if ($usher === null) {
            throw ValidationException::withMessages([
                'device_label' => ['No gate account uses this label. Create it first, then reuse it across events.'],
            ]);
        }

        if (! $usher->isActive()) {
            throw ValidationException::withMessages([
                'device_label' => ['This gate account is suspended. Reactivate it before assigning an event.'],
            ]);
        }

        $movedFrom = $usher->event_id !== null && (int) $usher->event_id !== (int) $event->id
            ? Event::query()->find($usher->event_id)?->title
            : null;
        $regeneratedPassword = null;

        DB::transaction(function () use ($event, $usher, $data, $request, &$movedFrom, &$regeneratedPassword): void {
            EventUsherAssignment::query()
                ->where('user_id', $usher->id)
                ->where('status', 'active')
                ->where('event_id', '!=', $event->id)
                ->update(['status' => 'ended', 'ended_at' => now()]);

            EventUsherAssignment::query()->updateOrCreate(
                ['event_id' => $event->id, 'user_id' => $usher->id],
                [
                    'calling_enabled' => (bool) ($data['calling_enabled'] ?? false),
                    'status' => 'active',
                    'assigned_at' => now(),
                    'ended_at' => null,
                    'assigned_by' => $request->user()->id,
                ]
            );

            if ((int) $usher->event_id !== (int) $event->id) {
                $usher->tokens()->delete();

                if ($usher->event_id !== null) {
                    // Reassignment regenerates the credentials the new operator receives.
                    $regeneratedPassword = Str::lower(Str::random(8)).random_int(10, 99);
                    $usher->forceFill(['password' => $regeneratedPassword])->save();
                }
            }

            $usher->update(['event_id' => $event->id]);
        });

        $calling->syncUsher($event, $usher, (bool) ($data['calling_enabled'] ?? false));

        AuditLogger::record(
            'usher.assigned',
            'Usher "'.$usher->name.'" was assigned to event "'.$event->title.'"'.($movedFrom ? ' (moved from "'.$movedFrom.'")' : '').'.',
            'Event',
            $event->id,
            ['usher_id' => $usher->id, 'previous_event' => $movedFrom]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher->refresh(), $event)),
            'moved_from' => $movedFrom,
            'credentials' => $regeneratedPassword === null ? null : [
                'device_label' => $usher->device_label,
                'password' => $regeneratedPassword,
            ],
        ]);
    }

    public function calling(Request $request, Event $event, User $usher, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        $data = $request->validate([
            'calling_enabled' => ['required', 'boolean'],
        ]);

        $assignment = $this->activeAssignment($event, $usher);

        if ($assignment === null) {
            $assignment = EventUsherAssignment::query()->create([
                'event_id' => $event->id,
                'user_id' => $usher->id,
                'status' => 'active',
                'assigned_at' => now(),
                'assigned_by' => $request->user()->id,
            ]);
        }

        $assignment->update(['calling_enabled' => (bool) $data['calling_enabled']]);
        $calling->syncUsher($event, $usher, (bool) $data['calling_enabled']);

        AuditLogger::record(
            'usher.calling_toggled',
            'Calling operations were '.($data['calling_enabled'] ? 'enabled' : 'disabled').' for usher "'.$usher->name.'" on "'.$event->title.'".',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher, $event)),
        ]);
    }

    public function update(Request $request, Event $event, User $usher): JsonResponse
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        $data = $request->validate([
            'device_label' => [
                'required',
                'string',
                'max:40',
                function (string $attribute, mixed $value, \Closure $fail) use ($usher): void {
                    $this->ensureLabelAvailable((string) $value, $usher, $fail);
                },
            ],
            'password' => ['nullable', 'string', 'min:6', 'max:255'],
        ]);

        $label = trim($data['device_label']);
        $payload = ['device_label' => $label];

        // Until the person signs in and enters their own details the account is
        // identified by its gate label.
        if ($usher->email === null) {
            $payload['name'] = $label;
        }

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
            $payload['must_change_password'] = false;
        }

        $usher->update($payload);

        AuditLogger::record(
            'usher.updated',
            'Usher account "'.$usher->name.'" was updated for event "'.$event->title.'".',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher->refresh(), $event)),
        ]);
    }

    public function status(Request $request, Event $event, User $usher, CallingService $calling): JsonResponse
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'suspended'])],
        ]);

        $usher->update(['status' => $data['status']]);

        if ($data['status'] === 'suspended') {
            $usher->tokens()->delete();
            $calling->deactivateUser($event, (int) $usher->id);
        }

        AuditLogger::record(
            $data['status'] === 'suspended' ? 'usher.suspended' : 'usher.activated',
            'Usher "'.$usher->name.'" was '.($data['status'] === 'suspended' ? 'suspended' : 'reactivated').' for event "'.$event->title.'".',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher->refresh(), $event)),
        ]);
    }

    /**
     * Remove the usher from this event only. The reusable account and its
     * check-in/calling history stay intact.
     */
    public function destroy(Request $request, Event $event, User $usher, CallingService $calling): Response
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        DB::transaction(function () use ($event, $usher): void {
            EventUsherAssignment::query()
                ->where('event_id', $event->id)
                ->where('user_id', $usher->id)
                ->where('status', 'active')
                ->update(['status' => 'ended', 'ended_at' => now()]);

            $usher->tokens()->delete();

            if ((int) $usher->event_id === (int) $event->id) {
                $next = EventUsherAssignment::query()
                    ->where('user_id', $usher->id)
                    ->where('status', 'active')
                    ->latest('assigned_at')
                    ->first();

                $usher->update(['event_id' => $next?->event_id]);
            }
        });

        $calling->deactivateUser($event, (int) $usher->id);

        AuditLogger::record(
            'usher.removed',
            'Usher "'.$usher->name.'" was removed from event "'.$event->title.'"; the reusable account was kept.',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->noContent();
    }

    /**
     * Permanently delete the usher account. Scan logs keep their history but
     * lose the usher link (usher_id is nulled by the foreign key).
     */
    public function destroyAccount(Request $request, Event $event, User $usher): Response
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        $name = $usher->name;
        $usherId = $usher->id;

        DB::transaction(function () use ($usher): void {
            $usher->tokens()->delete();
            $usher->usherAssignments()->delete();
            $usher->delete();
        });

        AuditLogger::record(
            'usher.deleted',
            'Usher account "'.$name.'" was permanently deleted by the organizer of "'.$event->title.'".',
            'Event',
            $event->id,
            ['usher_id' => $usherId]
        );

        return response()->noContent();
    }

    private function ensureLabelAvailable(string $label, ?User $ignore, \Closure $fail): void
    {
        $query = User::query()
            ->where('role', 'usher')
            ->whereRaw('lower(device_label) = ?', [Str::lower(trim($label))]);

        if ($ignore !== null) {
            $query->whereKeyNot($ignore->id);
        }

        if ($query->exists()) {
            $fail('Another usher account already uses this gate label.');
        }
    }

    private function ensureUsher(Event $event, User $usher): void
    {
        $belongs = $usher->isUsher() && (
            (int) $usher->event_id === (int) $event->id
            || $this->activeAssignment($event, $usher) !== null
        );

        abort_unless($belongs, 404, 'Usher account not found for this event.');
    }

    private function activeAssignment(Event $event, User $usher): ?EventUsherAssignment
    {
        return EventUsherAssignment::query()
            ->where('event_id', $event->id)
            ->where('user_id', $usher->id)
            ->where('status', 'active')
            ->first();
    }

    private function decorate(User $usher, Event $event): User
    {
        $assignment = $this->activeAssignment($event, $usher);

        $usher->loadCount('checkInLogs as scan_count');
        $usher->setAttribute('last_scan_at', $usher->checkInLogs()->max('scanned_at'));
        $usher->setAttribute('calling_enabled', (bool) ($assignment?->calling_enabled ?? false));
        $usher->setAttribute('assignment_id', $assignment?->id);
        $usher->setAttribute('assigned_at', $assignment?->assigned_at?->toIso8601String());

        return $usher;
    }
}
