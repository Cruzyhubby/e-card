<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventTable;
use Illuminate\Support\Facades\DB;

class TableOccupancyService
{
    public function __construct(
        private readonly OrganizerSettings $organizerSettings,
    ) {
    }

    /**
     * Seat counts are attendee-based: a double card occupies two seats even
     * though it is one guest record.
     *
     * @return array{tables: list<array<string, mixed>>, totals: array<string, int>, unassigned: array<string, int>}
     */
    public function summary(Event $event): array
    {
        $tables = $event->eventTables()->orderBy('number')->get();

        $byNumber = DB::table('guests')
            ->where('event_id', $event->id)
            ->whereNotNull('table_number')
            ->groupBy('table_number')
            ->select('table_number')
            ->selectRaw('COUNT(*) as guests')
            ->selectRaw('COALESCE(SUM(attendees_count), 0) as seats')
            ->get()
            ->keyBy(fn ($row): int => (int) $row->table_number);

        $unassigned = DB::table('guests')
            ->where('event_id', $event->id)
            ->whereNull('table_number')
            ->selectRaw('COUNT(*) as guests')
            ->selectRaw('COALESCE(SUM(attendees_count), 0) as seats')
            ->first();

        $rows = $tables->map(function (EventTable $table) use ($byNumber): array {
            $stats = $byNumber->get((int) $table->number);
            $guests = (int) ($stats->guests ?? 0);
            $seats = (int) ($stats->seats ?? 0);
            $capacity = (int) $table->capacity;

            return $this->row($table->id, (int) $table->number, $table->label, $capacity, $guests, $seats);
        })->values();

        // Tables referenced by guests but without a configured row are still
        // reported, flagged as over capacity so organizers can fix the mapping.
        foreach ($byNumber as $number => $stats) {
            if ($tables->contains(fn (EventTable $table): bool => (int) $table->number === (int) $number)) {
                continue;
            }

            $rows->push($this->row(null, (int) $number, null, 0, (int) $stats->guests, (int) $stats->seats));
        }

        $rows = $rows->sortBy('number')->values();

        return [
            'tables' => $rows->all(),
            'totals' => [
                'tables' => $rows->count(),
                'capacity' => (int) $rows->sum('capacity'),
                'guests' => (int) $rows->sum('guests'),
                'seats' => (int) $rows->sum('seats'),
                'over_capacity_tables' => $rows->where('over_capacity', true)->count(),
            ],
            'unassigned' => [
                'guests' => (int) ($unassigned->guests ?? 0),
                'seats' => (int) ($unassigned->seats ?? 0),
            ],
        ];
    }

    /**
     * Warning text for the table a guest was just placed on, if any.
     */
    public function warningFor(Event $event, ?int $tableNumber): ?string
    {
        if ($tableNumber === null) {
            return null;
        }

        $table = $event->eventTables()->where('number', $tableNumber)->first();

        if ($table === null) {
            return null;
        }

        $seats = (int) DB::table('guests')
            ->where('event_id', $event->id)
            ->where('table_number', $tableNumber)
            ->sum('attendees_count');

        $capacity = (int) $table->capacity;

        if ($capacity <= 0 || $seats <= $capacity) {
            return null;
        }

        return sprintf(
            'Table %d is over capacity: %d of %d seats allocated.',
            $tableNumber,
            $seats,
            $capacity
        );
    }

    /**
     * Create missing table rows after the event's table/seat plan changes.
     * Existing capacities are preserved so manual tweaks are never lost.
     */
    public function syncEventPlan(Event $event): void
    {
        $totalTables = max(0, (int) $event->total_tables);

        if ($totalTables === 0) {
            return;
        }

        $existing = $event->eventTables()->pluck('number')->map(fn ($number): int => (int) $number)->all();
        $missing = array_values(array_diff(range(1, $totalTables), $existing));

        if ($missing === []) {
            return;
        }

        $defaultCapacity = max(1, $this->organizerSettings->int($event->owner, 'tables.default_capacity'));
        $seats = (int) $event->total_seats;
        $perTable = $seats > 0 ? intdiv($seats, $totalTables) : $defaultCapacity;

        foreach ($missing as $number) {
            EventTable::query()->create([
                'event_id' => $event->id,
                'number' => $number,
                'capacity' => max(1, $perTable),
            ]);
        }
    }

    public function ensureTable(Event $event, int $number): EventTable
    {
        $table = $event->eventTables()->where('number', $number)->first();

        if ($table !== null) {
            return $table;
        }

        return EventTable::query()->create([
            'event_id' => $event->id,
            'number' => $number,
            'capacity' => max(1, $this->organizerSettings->int($event->owner, 'tables.default_capacity')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function row(?int $id, int $number, ?string $label, int $capacity, int $guests, int $seats): array
    {
        return [
            'id' => $id,
            'number' => $number,
            'label' => $label,
            'capacity' => $capacity,
            'guests' => $guests,
            'seats' => $seats,
            'remaining' => $capacity - $seats,
            'over_capacity' => $capacity > 0 && $seats > $capacity,
            'utilization_pct' => $capacity > 0 ? (int) round(($seats / $capacity) * 100) : 0,
        ];
    }
}
