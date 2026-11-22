<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendInvitationRequest;
use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\AuditLogger;
use App\Services\DesignService;
use App\Services\EcardRendererService;
use App\Services\MessagingService;
use App\Services\TableOccupancyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Event::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:32'],
        ]);

        $user = $request->user();
        $query = Event::query()->withStats()->orderBy('event_date')->orderBy('id');

        if ($user->isUsher()) {
            $scopedEventId = $user->currentAssignedEventId();

            if ($scopedEventId === null) {
                return EventResource::collection(collect());
            }

            $query->whereKey($scopedEventId);
        } else {
            $query->where('user_id', $user->id);
        }

        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $like = '%'.$search.'%';

            $query->where(function ($query) use ($like): void {
                $query->whereLike('title', $like)
                    ->orWhereLike('venue', $like)
                    ->orWhereLike('host_name', $like);
            });
        }

        $category = (string) ($filters['category'] ?? '');

        if (in_array($category, config('eclat.categories'), true)) {
            $query->where('category', $category);
        }

        return EventResource::collection($query->get());
    }

    public function store(StoreEventRequest $request, TableOccupancyService $tables): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['accent_color'] = $data['accent_color'] ?? '#C49A3C';
        $data['description'] = $data['description'] ?? '';
        $data['invitation_status'] = 'draft';
        $data['ecard_config'] = array_replace(
            EcardRendererService::defaultConfig($data['accent_color']),
            $data['ecard_config'] ?? []
        );

        $event = Event::query()->create($data);
        $tables->syncEventPlan($event);

        AuditLogger::forModel('event.created', 'Event "'.$event->title.'" was created.', $event);

        return (new EventResource($event->loadGuestStats()))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Event $event): EventResource
    {
        $this->authorize('view', $event);

        return new EventResource($event->loadGuestStats());
    }

    public function update(UpdateEventRequest $request, Event $event, TableOccupancyService $tables, DesignService $designs): EventResource
    {
        $this->authorize('update', $event);

        $data = $request->validated();

        if (array_key_exists('ecard_config', $data)) {
            $data['ecard_config'] = array_replace(
                $event->ecard_config ?? EcardRendererService::defaultConfig($event->accent_color),
                $data['ecard_config'] ?? []
            );
        }

        $planChanged = array_key_exists('total_tables', $data) || array_key_exists('total_seats', $data);

        $event->update($data);

        if (array_key_exists('ecard_config', $data)) {
            $designs->syncWorkingCopy($event, $request->user(), (array) $event->ecard_config);
        }

        if ($planChanged) {
            $tables->syncEventPlan($event);
        }

        return new EventResource($event->refresh()->loadGuestStats());
    }

    public function destroy(Event $event): Response
    {
        $this->authorize('delete', $event);

        AuditLogger::forModel('event.deleted', 'Event "'.$event->title.'" was deleted.', $event);

        // Usher accounts are reusable: detach them, keep the account and history.
        foreach ($event->ushers()->get() as $usher) {
            $usher->tokens()->delete();
            $usher->update(['event_id' => null]);
        }

        $event->delete();

        return response()->noContent();
    }

    public function stats(Event $event): JsonResponse
    {
        $this->authorize('view', $event);

        $aggregate = DB::table('guests')
            ->where('event_id', $event->id)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(CASE WHEN is_vip THEN 1 ELSE 0 END), 0) as vip')
            ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('sent', 'checked_in') THEN 1 ELSE 0 END), 0) as sent")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END), 0) as checked_in")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending")
            ->first();

        $total = (int) ($aggregate->total ?? 0);
        $vip = (int) ($aggregate->vip ?? 0);
        $sent = (int) ($aggregate->sent ?? 0);
        $checkedIn = (int) ($aggregate->checked_in ?? 0);
        $pending = (int) ($aggregate->pending ?? 0);

        $byTable = DB::table('guests')
            ->where('event_id', $event->id)
            ->whereNotNull('table_number')
            ->select('table_number')
            ->selectRaw('COUNT(*) as guests')
            ->groupBy('table_number')
            ->orderBy('table_number')
            ->get()
            ->map(fn ($row): array => [
                'table_number' => (int) $row->table_number,
                'guests' => (int) $row->guests,
            ])
            ->all();

        return response()->json([
            'guests' => $total,
            'vip' => $vip,
            'sent' => $sent,
            'checked_in' => $checkedIn,
            'pending' => $pending,
            'tables' => (int) $event->total_tables,
            'seats' => (int) $event->total_seats,
            'seats_filled' => $total,
            'invitation_rate_pct' => $this->percentage($sent, $total),
            'check_in_rate_pct' => $this->percentage($checkedIn, $total),
            'capacity_used_pct' => $this->percentage($total, (int) $event->total_seats),
            'by_table' => $byTable,
        ]);
    }

    public function send(SendInvitationRequest $request, Event $event, MessagingService $messaging): JsonResponse
    {
        $this->authorize('update', $event);

        $data = $request->validated();

        $result = $messaging->dispatchToEvent(
            $event,
            $data['channel'],
            $data['guest_ids'] ?? null,
            $data['message_template'] ?? null
        );

        return response()->json([
            'sent' => $result['sent'],
            'skipped' => $result['skipped'],
            'event' => new EventResource($result['event']),
        ]);
    }

    private function percentage(int $part, int $whole): int
    {
        return $whole > 0 ? (int) round(($part / $whole) * 100) : 0;
    }
}
