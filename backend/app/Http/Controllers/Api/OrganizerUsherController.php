<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventUsherAssignment;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\CallingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrganizerUsherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizer = $this->organizer($request);
        $events = $this->events($organizer);
        $eventIds = $events->pluck('id');

        $ushers = $this->query($eventIds)
            ->with(['usherAssignments' => fn ($assignment) => $assignment
                ->where('status', 'active')
                ->whereIn('event_id', $eventIds)])
            ->orderBy('name')
            ->get();

        $lastScans = DB::table('check_in_logs')
            ->whereIn('usher_id', $ushers->pluck('id'))
            ->whereIn('event_id', $eventIds)
            ->select('usher_id')
            ->selectRaw('MAX(scanned_at) as last_scan_at')
            ->groupBy('usher_id')
            ->pluck('last_scan_at', 'usher_id');

        $data = $ushers->map(fn (User $usher): array => $this->present(
            $usher,
            $events,
            $lastScans[$usher->id] ?? null
        ))->values();

        return response()->json([
            'data' => $data,
            'events' => $events->map(fn (Event $event): array => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->toDateString(),
                'invitation_status' => $event->invitation_status,
            ])->values(),
            'stats' => [
                'total' => $data->count(),
                'active' => $data->where('status', 'active')->count(),
                'suspended' => $data->where('status', 'suspended')->count(),
                'assigned' => $data->whereNotNull('event_id')->count(),
                'scans' => (int) $data->sum('scan_count'),
            ],
        ]);
    }

    public function store(Request $request, CallingService $calling): JsonResponse
    {
        $organizer = $this->organizer($request);

        $data = $request->validate([
            'event_id' => ['required', 'integer', 'exists:events,id'],
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

        $event = $this->events($organizer)
            ->firstWhere('id', (int) $data['event_id']);

        if ($event === null) {
            throw ValidationException::withMessages([
                'event_id' => ['Choose one of your own events for this gate account.'],
            ]);
        }

        $usher = DB::transaction(function () use ($data, $event, $organizer): User {
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
                'assigned_by' => $organizer->id,
            ]);

            return $usher;
        });

        if ((bool) ($data['calling_enabled'] ?? false)) {
            $calling->syncUsher($event, $usher, true);
        }

        AuditLogger::record(
            'usher.created',
            'Gate account "'.$usher->device_label.'" was created for event "'.$event->title.'".',
            'User',
            $usher->id,
            ['event_id' => $event->id]
        );

        return response()->json([
            'usher' => $this->present($usher->refresh(), $this->events($organizer)),
        ], 201);
    }

    public function update(Request $request, User $usher): JsonResponse
    {
        $organizer = $this->organizer($request);
        $this->ensureManaged($usher, $organizer);

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

        if (! empty($data['password'])) {
            $usher->tokens()->delete();
        }

        AuditLogger::record(
            'usher.updated',
            'Usher account "'.$usher->name.'" was updated by its organizer.',
            'User',
            $usher->id,
            ['event_id' => $usher->event_id]
        );

        return response()->json([
            'usher' => $this->present($usher->refresh(), $this->events($organizer)),
        ]);
    }

    public function status(Request $request, User $usher, CallingService $calling): JsonResponse
    {
        $organizer = $this->organizer($request);
        $this->ensureManaged($usher, $organizer);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'suspended'])],
        ]);

        $usher->update(['status' => $data['status']]);

        if ($data['status'] === 'suspended') {
            $usher->tokens()->delete();

            $event = $usher->event_id !== null
                ? $this->events($organizer)->firstWhere('id', (int) $usher->event_id)
                : null;

            if ($event !== null) {
                $calling->deactivateUser($event, (int) $usher->id);
            }
        }

        AuditLogger::record(
            $data['status'] === 'suspended' ? 'usher.suspended' : 'usher.activated',
            'Usher "'.$usher->name.'" was '.($data['status'] === 'suspended' ? 'suspended' : 'reactivated').' by its organizer.',
            'User',
            $usher->id,
            ['event_id' => $usher->event_id]
        );

        return response()->json([
            'usher' => $this->present($usher->refresh(), $this->events($organizer)),
        ]);
    }

    /**
     * Permanently delete the gate account. Scan logs keep their history but
     * lose the usher link.
     */
    public function destroy(Request $request, User $usher): Response
    {
        $organizer = $this->organizer($request);
        $this->ensureManaged($usher, $organizer);

        $name = $usher->name;
        $usherId = $usher->id;

        DB::transaction(function () use ($usher): void {
            $usher->tokens()->delete();
            $usher->usherAssignments()->delete();
            $usher->delete();
        });

        AuditLogger::record(
            'usher.deleted',
            'Usher account "'.$name.'" was permanently deleted by its organizer.',
            'User',
            $usherId
        );

        return response()->noContent();
    }

    private function organizer(Request $request): User
    {
        $user = $request->user();

        abort_unless($user !== null && $user->isOrganizer(), 403, 'Only organizers manage gate accounts.');

        return $user;
    }

    /**
     * @return Collection<int, Event>
     */
    private function events(User $organizer): Collection
    {
        return Event::query()
            ->where('user_id', $organizer->id)
            ->orderByDesc('event_date')
            ->get(['id', 'title', 'event_date', 'invitation_status']);
    }

    private function query(Collection $eventIds)
    {
        return User::query()
            ->where('role', 'usher')
            ->where(function ($query) use ($eventIds): void {
                $query->whereIn('event_id', $eventIds)
                    ->orWhereHas('usherAssignments', fn ($assignment) => $assignment
                        ->whereIn('event_id', $eventIds)
                        ->where('status', 'active'));
            })
            ->withCount(['checkInLogs as scan_count' => fn ($query) => $query->whereIn('event_id', $eventIds)]);
    }

    private function ensureManaged(User $usher, User $organizer): void
    {
        if (! $usher->isUsher()) {
            abort(404, 'Usher account not found.');
        }

        $eventIds = $this->events($organizer)->pluck('id');

        $managed = $eventIds->contains((int) $usher->event_id)
            || $usher->usherAssignments()
                ->whereIn('event_id', $eventIds)
                ->where('status', 'active')
                ->exists();

        abort_unless($managed, 404, 'Usher account not found.');
    }

    /**
     * @param  Collection<int, Event>  $events
     * @return array<string, mixed>
     */
    private function present(User $usher, Collection $events, mixed $lastScanAt = null): array
    {
        $assignment = $usher->relationLoaded('usherAssignments')
            ? $usher->usherAssignments->first()
            : $usher->activeUsherAssignment();

        $eventId = $usher->event_id !== null ? (int) $usher->event_id : $assignment?->event_id;
        $event = $eventId !== null ? $events->firstWhere('id', (int) $eventId) : null;

        return [
            'id' => (int) $usher->id,
            'name' => $usher->name,
            'email' => $usher->email,
            'phone' => $usher->phone,
            'device_label' => $usher->device_label,
            'status' => $usher->status,
            'event_id' => $event !== null ? (int) $event->id : null,
            'event_title' => $event?->title,
            'event_date' => $event?->event_date?->toDateString(),
            'calling_enabled' => (bool) ($assignment?->calling_enabled ?? false),
            'assignment_id' => $assignment?->id,
            'assigned_at' => $assignment?->assigned_at?->toIso8601String(),
            'scan_count' => (int) ($usher->scan_count ?? 0),
            'last_scan_at' => $lastScanAt,
            'must_change_password' => (bool) $usher->must_change_password,
            'created_at' => $usher->created_at?->toIso8601String(),
        ];
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
}
