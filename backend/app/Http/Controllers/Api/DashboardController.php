<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CheckInLogResource;
use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->isOrganizer(), 403, 'This workspace is available to organizers only.');

        $events = Event::query()->where('user_id', $user->id);

        $eventIds = (clone $events)->pluck('id');

        $guestQuery = Guest::query()->whereIn('event_id', $eventIds);

        $metrics = [
            'total_events' => $eventIds->count(),
            'total_capacity' => (int) (clone $events)->sum('total_seats'),
            'total_guests' => (clone $guestQuery)->count(),
            'cards_sent' => (clone $guestQuery)->whereIn('status', ['sent', 'checked_in'])->count(),
            'checked_in' => (clone $guestQuery)->where('status', 'checked_in')->count(),
            'vip_guests' => (clone $guestQuery)->where('is_vip', true)->count(),
        ];

        $recentCheckIns = CheckInLog::query()
            ->whereIn('event_id', $eventIds)
            ->with(['guest', 'usher'])
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return response()->json([
            'metrics' => $metrics,
            'recent_check_ins' => CheckInLogResource::collection($recentCheckIns),
        ]);
    }
}
