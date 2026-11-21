<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrganizerController extends Controller
{
    public function index(): JsonResponse
    {
        $organizers = User::query()
            ->where('role', 'organizer')
            ->withCount('events')
            ->withCount([
                'events as live_events_count' => fn ($query) => $query->where('invitation_status', 'live'),
            ])
            ->orderBy('name')
            ->get();

        $organizerIds = $organizers->pluck('id');

        $dispatchCounts = DB::table('message_dispatches')
            ->join('events', 'events.id', '=', 'message_dispatches.event_id')
            ->whereIn('events.user_id', $organizerIds)
            ->select('events.user_id', DB::raw('COUNT(*) as total'))
            ->groupBy('events.user_id')
            ->pluck('total', 'user_id');

        $checkInCounts = DB::table('check_in_logs')
            ->join('events', 'events.id', '=', 'check_in_logs.event_id')
            ->whereIn('events.user_id', $organizerIds)
            ->select('events.user_id', DB::raw('COUNT(*) as total'))
            ->groupBy('events.user_id')
            ->pluck('total', 'user_id');

        $lastEventDates = Event::query()
            ->whereIn('user_id', $organizerIds)
            ->select('user_id', DB::raw('MAX(event_date) as last_event_date'))
            ->groupBy('user_id')
            ->pluck('last_event_date', 'user_id');

        return response()->json([
            'data' => $organizers->map(fn (User $organizer): array => [
                'id' => (int) $organizer->id,
                'name' => $organizer->name,
                'email' => $organizer->email,
                'phone' => $organizer->phone,
                'status' => $organizer->status,
                'events_count' => (int) $organizer->events_count,
                'live_events_count' => (int) $organizer->live_events_count,
                'dispatches_count' => (int) ($dispatchCounts[$organizer->id] ?? 0),
                'check_ins_count' => (int) ($checkInCounts[$organizer->id] ?? 0),
                'last_event_date' => $lastEventDates[$organizer->id] ?? null,
                'created_at' => $organizer->created_at?->toIso8601String(),
            ]),
            'stats' => [
                'total' => $organizers->count(),
                'active' => $organizers->where('status', 'active')->count(),
                'suspended' => $organizers->where('status', 'suspended')->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $initialPassword = preg_replace('/\D+/', '', $data['phone']);

        if (strlen($initialPassword) < 7) {
            throw ValidationException::withMessages([
                'phone' => 'Enter a phone number with at least 7 digits; it becomes the initial password.',
            ]);
        }

        $organizer = User::query()->create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $initialPassword,
            'must_change_password' => true,
            'role' => 'organizer',
            'status' => 'active',
            'phone' => $data['phone'],
        ]);

        AuditLogger::record(
            'organizer.created',
            'Organizer account "'.$organizer->name.'" was created with a first-login password change required.',
            'User',
            $organizer->id
        );

        return response()->json([
            'organizer' => $this->present($organizer),
        ], 201);
    }

    public function update(Request $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($organizer->id),
            ],
            'phone' => ['required', 'string', 'max:32'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
        ]);

        $password = $data['password'] ?? null;
        unset($data['password']);

        $organizer->update($data);

        if (is_string($password) && $password !== '') {
            $organizer->forceFill([
                'password' => $password,
                'must_change_password' => true,
            ])->save();

            $organizer->tokens()->delete();
        }

        AuditLogger::record(
            'organizer.updated',
            'Organizer "'.$organizer->name.'" account details were updated by the platform.'
                .($password !== null && $password !== '' ? ' Their password was reset.' : ''),
            'User',
            $organizer->id,
            ['password_reset' => $password !== null && $password !== '']
        );

        return response()->json([
            'organizer' => $this->present($organizer->refresh()->loadCount('events')),
        ]);
    }

    public function status(Request $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'suspended'])],
        ]);

        $organizer->update(['status' => $data['status']]);

        if ($data['status'] === 'suspended') {
            $organizer->tokens()->delete();
        }

        AuditLogger::record(
            $data['status'] === 'suspended' ? 'organizer.suspended' : 'organizer.activated',
            'Organizer "'.$organizer->name.'" was '.($data['status'] === 'suspended' ? 'suspended' : 'reactivated').'.',
            'User',
            $organizer->id
        );

        return response()->json([
            'organizer' => $this->present($organizer->refresh()->loadCount('events')),
        ]);
    }

    public function destroy(User $organizer): Response
    {
        $this->ensureOrganizer($organizer);

        $organizer->tokens()->delete();

        AuditLogger::record(
            'organizer.deleted',
            'Organizer "'.$organizer->name.'" and their events were deleted.',
            'User',
            $organizer->id
        );

        $organizer->delete();

        return response()->noContent();
    }

    private function ensureOrganizer(User $organizer): void
    {
        abort_unless($organizer->isOrganizer(), 404, 'Organizer not found.');
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $organizer): array
    {
        return [
            'id' => (int) $organizer->id,
            'name' => $organizer->name,
            'email' => $organizer->email,
            'phone' => $organizer->phone,
            'status' => $organizer->status,
            'events_count' => (int) ($organizer->events_count ?? 0),
            'created_at' => $organizer->created_at?->toIso8601String(),
        ];
    }
}
