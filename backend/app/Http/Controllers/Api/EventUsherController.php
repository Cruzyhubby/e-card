<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UsherResource;
use App\Models\Event;
use App\Models\EventUsherAssignment;
use App\Models\User;
use App\Services\AuditLogger;
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
            ->each(function (User $usher) use ($event): void {
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

    public function store(Request $request, Event $event): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:32'],
            'device_id' => ['nullable', 'string', 'max:100'],
            'device_label' => ['nullable', 'string', 'max:40'],
            'calling_enabled' => ['sometimes', 'boolean'],
        ]);

        $initialPassword = preg_replace('/\D+/', '', $data['phone']);

        if (strlen($initialPassword) < 7) {
            throw ValidationException::withMessages([
                'phone' => 'Enter a phone number with at least 7 digits; it becomes the initial password.',
            ]);
        }

        $usher = DB::transaction(function () use ($data, $event, $initialPassword, $request): User {
            $usher = User::query()->create([
                'name' => trim($data['name']),
                'email' => strtolower(trim($data['email'])),
                'password' => $initialPassword,
                'must_change_password' => true,
                'role' => 'usher',
                'status' => 'active',
                'phone' => trim($data['phone']),
                'event_id' => $event->id,
                'device_id' => isset($data['device_id']) ? trim($data['device_id']) : null,
                'device_label' => isset($data['device_label']) ? trim($data['device_label']) : null,
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

        AuditLogger::record(
            'usher.created',
            'Usher account "'.$usher->name.'" was created for event "'.$event->title.'" with a first-login password change required.',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->json([
            'usher' => new UsherResource($this->decorate($usher, $event)),
        ], 201);
    }

    /**
     * Reuse an existing usher account on another event. The account keeps its
     * credentials and history; access to the previous event is ended.
     */
    public function assign(Request $request, Event $event): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'calling_enabled' => ['sometimes', 'boolean'],
        ]);

        $email = Str::lower(trim($data['email']));
        $usher = User::query()->where('role', 'usher')->where('email', $email)->first();

        if ($usher === null) {
            throw ValidationException::withMessages([
                'email' => ['No usher account uses this email. Create the account first, then reuse it across events.'],
            ]);
        }

        if (! $usher->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This usher account is suspended. Reactivate it before assigning an event.'],
            ]);
        }

        $movedFrom = $usher->event_id !== null && (int) $usher->event_id !== (int) $event->id
            ? Event::query()->find($usher->event_id)?->title
            : null;

        DB::transaction(function () use ($event, $usher, $data, $request, &$movedFrom): void {
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
            }

            $usher->update(['event_id' => $event->id]);
        });

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
        ]);
    }

    public function calling(Request $request, Event $event, User $usher): JsonResponse
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

    public function status(Request $request, Event $event, User $usher): JsonResponse
    {
        $this->authorize('manageTeam', $event);
        $this->ensureUsher($event, $usher);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'suspended'])],
        ]);

        $usher->update(['status' => $data['status']]);

        if ($data['status'] === 'suspended') {
            $usher->tokens()->delete();
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
    public function destroy(Request $request, Event $event, User $usher): Response
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

        AuditLogger::record(
            'usher.removed',
            'Usher "'.$usher->name.'" was removed from event "'.$event->title.'"; the reusable account was kept.',
            'Event',
            $event->id,
            ['usher_id' => $usher->id]
        );

        return response()->noContent();
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
