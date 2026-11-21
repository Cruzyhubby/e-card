<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTable;
use App\Services\AuditLogger;
use App\Services\TableOccupancyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventTableController extends Controller
{
    public function index(Event $event, TableOccupancyService $tables): JsonResponse
    {
        $this->authorize('manageGuests', $event);

        return response()->json($tables->summary($event));
    }

    public function store(Request $request, Event $event, TableOccupancyService $tables): JsonResponse
    {
        $this->authorize('manageGuests', $event);

        $data = $request->validate([
            'number' => [
                'required', 'integer', 'min:1', 'max:100000',
                Rule::unique('event_tables', 'number')->where('event_id', $event->id),
            ],
            'label' => ['nullable', 'string', 'max:60'],
            'capacity' => ['required', 'integer', 'min:1', 'max:1000'],
        ]);

        $table = EventTable::query()->create([
            'event_id' => $event->id,
            'number' => (int) $data['number'],
            'label' => $data['label'] ?? null,
            'capacity' => (int) $data['capacity'],
        ]);

        AuditLogger::record(
            'event.table_created',
            'Table '.$table->number.' was added to event "'.$event->title.'" with capacity '.$table->capacity.'.',
            'Event',
            $event->id,
            ['table_id' => $table->id]
        );

        $summary = $tables->summary($event);
        $position = $this->position($summary, (int) $table->number);

        return response()->json([
            'table' => $summary['tables'][$position] ?? null,
            'summary' => $summary,
        ], 201);
    }

    public function update(Request $request, Event $event, EventTable $table, TableOccupancyService $tables): JsonResponse
    {
        $this->authorize('manageGuests', $event);
        $this->ensureTable($event, $table);

        $data = $request->validate([
            'number' => [
                'sometimes', 'integer', 'min:1', 'max:100000',
                Rule::unique('event_tables', 'number')->where('event_id', $event->id)->ignore($table->id),
            ],
            'label' => ['sometimes', 'nullable', 'string', 'max:60'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:1000'],
        ]);

        if (array_key_exists('number', $data) && (int) $data['number'] !== (int) $table->number) {
            $assigned = $event->guests()->where('table_number', $table->number)->exists();

            if ($assigned) {
                throw ValidationException::withMessages([
                    'number' => ['Reassign seated guests before renumbering this table.'],
                ]);
            }
        }

        $table->update($data);

        AuditLogger::record(
            'event.table_updated',
            'Table '.$table->number.' was updated for event "'.$event->title.'".',
            'Event',
            $event->id,
            [
                'table_id' => $table->id,
                'capacity' => $table->capacity,
                'label' => $table->label,
            ]
        );

        $summary = $tables->summary($event);
        $position = $this->position($summary, (int) $table->number);

        return response()->json([
            'table' => $summary['tables'][$position] ?? null,
            'summary' => $summary,
        ]);
    }

    public function destroy(Event $event, EventTable $table): Response
    {
        $this->authorize('manageGuests', $event);
        $this->ensureTable($event, $table);

        $seated = $event->guests()->where('table_number', $table->number)->count();

        if ($seated > 0) {
            throw ValidationException::withMessages([
                'table' => ["Table {$table->number} still seats {$seated} guest(s). Move them before deleting the table."],
            ]);
        }

        AuditLogger::record(
            'event.table_deleted',
            'Table '.$table->number.' was removed from event "'.$event->title.'".',
            'Event',
            $event->id,
            ['table_number' => (int) $table->number]
        );

        $table->delete();

        return response()->noContent();
    }

    private function ensureTable(Event $event, EventTable $table): void
    {
        abort_unless((int) $table->event_id === (int) $event->id, 404, 'Table not found for this event.');
    }

    /**
     * @param  array{tables: list<array<string, mixed>>}  $summary
     */
    private function position(array $summary, int $number): int
    {
        foreach ($summary['tables'] as $index => $row) {
            if ((int) $row['number'] === $number) {
                return $index;
            }
        }

        return 0;
    }
}
