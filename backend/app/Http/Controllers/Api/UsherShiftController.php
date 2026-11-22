<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CheckInLogResource;
use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\User;
use App\Models\UsherSession;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class UsherShiftController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizer = $this->organizer($request);
        $events = Event::query()
            ->where('user_id', $organizer->id)
            ->orderByDesc('event_date')
            ->get(['id', 'title', 'event_date', 'accent_color']);

        $filters = $request->validate([
            'event_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $base = $this->scoped($events->pluck('id'), $filters);

        $sessions = (clone $base)
            ->with([
                'user:id,name,device_label',
                'event:id,title,event_date,accent_color',
            ])
            ->withCount([
                'checkInLogs as scans_total',
                'checkInLogs as scans_valid' => fn (Builder $query) => $query->where('validation_status', 'valid'),
                'checkInLogs as scans_duplicate' => fn (Builder $query) => $query->where('validation_status', 'already_checked_in'),
                'checkInLogs as scans_denied' => fn (Builder $query) => $query->where('validation_status', 'denied'),
            ])
            ->withMax('checkInLogs', 'scanned_at')
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->limit((int) ($filters['limit'] ?? 100))
            ->get();

        $sessionIds = (clone $base)->select('id');

        return response()->json([
            'data' => $sessions->map(fn (UsherSession $session): array => $this->present($session))->values(),
            'events' => $events->map(fn (Event $event): array => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->toDateString(),
                'accent_color' => $event->accent_color,
            ])->values(),
            'stats' => [
                'shifts' => (clone $base)->count(),
                'active' => (clone $base)->whereNull('ended_at')->count(),
                'operators' => (clone $base)->distinct()->count('user_id'),
                'scans' => CheckInLog::query()->whereIn('usher_session_id', $sessionIds)->count(),
            ],
        ]);
    }

    public function show(Request $request, UsherSession $usherSession): JsonResponse
    {
        $organizer = $this->organizer($request);

        abort_unless(
            $usherSession->event !== null && (int) $usherSession->event->user_id === (int) $organizer->id,
            404,
            'Shift not found.'
        );

        $usherSession->load([
            'user:id,name,device_label',
            'event:id,title,event_date,accent_color',
        ])->loadCount([
            'checkInLogs as scans_total',
            'checkInLogs as scans_valid' => fn (Builder $query) => $query->where('validation_status', 'valid'),
            'checkInLogs as scans_duplicate' => fn (Builder $query) => $query->where('validation_status', 'already_checked_in'),
            'checkInLogs as scans_denied' => fn (Builder $query) => $query->where('validation_status', 'denied'),
        ])->loadMax('checkInLogs', 'scanned_at');

        $logs = $usherSession->checkInLogs()
            ->with('guest')
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        return response()->json([
            'shift' => $this->present($usherSession),
            'data' => CheckInLogResource::collection($logs),
        ]);
    }

    private function organizer(Request $request): User
    {
        $user = $request->user();

        abort_unless($user !== null && $user->isOrganizer(), 403, 'Only organizers review gate shifts.');

        return $user;
    }

    /**
     * @param  Collection<int, int>  $eventIds
     * @param  array<string, mixed>  $filters
     */
    private function scoped($eventIds, array $filters): Builder
    {
        $search = trim((string) ($filters['search'] ?? ''));

        return UsherSession::query()
            ->whereIn('event_id', $eventIds)
            ->when(
                isset($filters['event_id']),
                fn (Builder $query) => $query->where('event_id', (int) $filters['event_id'])
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $needle = '%'.mb_strtolower($search).'%';

                $query->where(function (Builder $inner) use ($needle): void {
                    $inner->whereRaw('lower(name) like ?', [$needle])
                        ->orWhereRaw('lower(phone) like ?', [$needle])
                        ->orWhereRaw('lower(email) like ?', [$needle])
                        ->orWhereHas('user', fn (Builder $user) => $user->whereRaw('lower(device_label) like ?', [$needle]));
                });
            });
    }

    /**
     * @return array<string, mixed>
     */
    private function present(UsherSession $session): array
    {
        $start = $session->started_at;
        $end = $session->ended_at;

        return [
            'id' => (int) $session->id,
            'gate_label' => $session->user?->device_label ?? $session->user?->name,
            'account_name' => $session->user?->name,
            'operator' => [
                'name' => $session->name,
                'phone' => $session->phone,
                'email' => $session->email,
            ],
            'event' => $session->event !== null ? [
                'id' => (int) $session->event->id,
                'title' => $session->event->title,
                'event_date' => $session->event->event_date?->toDateString(),
                'accent_color' => $session->event->accent_color,
            ] : null,
            'started_at' => $start?->toIso8601String(),
            'ended_at' => $end?->toIso8601String(),
            'active' => $end === null,
            'duration_minutes' => $start !== null
                ? (int) $start->diffInMinutes($end ?? now())
                : 0,
            'scans' => [
                'total' => (int) ($session->scans_total ?? 0),
                'valid' => (int) ($session->scans_valid ?? 0),
                'duplicate' => (int) ($session->scans_duplicate ?? 0),
                'denied' => (int) ($session->scans_denied ?? 0),
            ],
            'last_scan_at' => $session->check_in_logs_max_scanned_at !== null
                ? Carbon::parse($session->check_in_logs_max_scanned_at)->toIso8601String()
                : null,
        ];
    }
}
