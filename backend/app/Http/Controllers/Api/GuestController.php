<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportGuestsRequest;
use App\Http\Requests\SendInvitationRequest;
use App\Http\Requests\StoreGuestRequest;
use App\Http\Requests\UpdateGuestRequest;
use App\Http\Resources\GuestResource;
use App\Models\Event;
use App\Models\Guest;
use App\Models\User;
use App\Services\CallingService;
use App\Services\GuestExportService;
use App\Services\GuestImportService;
use App\Services\MessagingService;
use App\Services\OrganizerSettings;
use App\Services\TableOccupancyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GuestController extends Controller
{
    public function index(Request $request, Event $event): AnonymousResourceCollection
    {
        $this->authorize('manageGuests', $event);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:'.implode(',', config('eclat.guest_statuses'))],
            'card_type' => ['nullable', 'string', Rule::in(config('eclat.card_types'))],
            'confirmation_status' => ['nullable', 'string', Rule::in(config('eclat.confirmation_statuses'))],
            'table_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $guests = $event->guests()
            ->search($filters['search'] ?? null)
            ->withStatus($filters['status'] ?? null)
            ->withCardType($filters['card_type'] ?? null)
            ->withConfirmation($filters['confirmation_status'] ?? null)
            ->when(
                isset($filters['table_number']),
                fn ($query) => $query->where('table_number', (int) $filters['table_number'])
            )
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return GuestResource::collection($guests);
    }

    public function store(
        StoreGuestRequest $request,
        Event $event,
        OrganizerSettings $settings,
        TableOccupancyService $tables,
        CallingService $calling
    ): JsonResponse {
        $data = $this->withDefaults($request->validated(), $request->user(), $event, $settings);
        $data['status'] = $data['status'] ?? 'pending';

        if (! empty($data['table_number'])) {
            $error = $tables->assignmentError(
                $event,
                (int) $data['table_number'],
                (int) ($data['attendees_count'] ?? 1)
            );

            if ($error !== null) {
                throw ValidationException::withMessages(['table_number' => [$error]]);
            }
        }

        if ($data['status'] === 'checked_in') {
            $data['checked_in_at'] = now();
        }

        $guest = $event->guests()->create($data);
        $calling->autoAssignGuest($guest);

        $warnings = $this->seatingWarnings($event, $guest, $tables);
        $payload = (new GuestResource($guest))->toArray($request);

        return response()->json(array_merge($payload, ['warnings' => $warnings]), 201);
    }

    public function update(
        UpdateGuestRequest $request,
        Guest $guest,
        OrganizerSettings $settings,
        TableOccupancyService $tables,
        CallingService $calling
    ): JsonResponse {
        $data = $request->validated();
        $status = $data['status'] ?? null;

        if ($status === 'checked_in' && $guest->status !== 'checked_in' && ! array_key_exists('checked_in_at', $data)) {
            $data['checked_in_at'] = now();
        }

        if ($status !== null && $status !== 'checked_in' && $guest->status === 'checked_in' && ! array_key_exists('checked_in_at', $data)) {
            $data['checked_in_at'] = null;
        }

        $data = $this->withDefaults($data, $request->user(), $guest->event, $settings, $guest);

        $tableNumber = array_key_exists('table_number', $data)
            ? ($data['table_number'] === null ? null : (int) $data['table_number'])
            : ($guest->table_number === null ? null : (int) $guest->table_number);
        $seats = (int) ($data['attendees_count'] ?? $guest->attendees_count);
        $seatingChanged = (int) $tableNumber !== (int) $guest->table_number
            || $seats > (int) $guest->attendees_count;

        if ($seatingChanged) {
            $error = $tables->assignmentError($guest->event, $tableNumber, $seats, (int) $guest->id);

            if ($error !== null) {
                throw ValidationException::withMessages(['table_number' => [$error]]);
            }
        }

        $guest->update($data);
        $guest->refresh();

        if ($guest->confirmation_status !== 'pending') {
            $calling->closeForGuest($guest);
        }

        $warnings = $this->seatingWarnings($guest->event, $guest, $tables);
        $payload = (new GuestResource($guest))->toArray($request);

        return response()->json(array_merge($payload, ['warnings' => $warnings]));
    }

    public function destroy(Guest $guest): Response
    {
        $this->authorize('update', $guest->event);

        $guest->delete();

        return response()->noContent();
    }

    public function analyzeImport(ImportGuestsRequest $request, Event $event, GuestImportService $importer): JsonResponse
    {
        $this->authorize('manageGuests', $event);

        return response()->json($importer->analyze($event, $request->file('file')));
    }

    public function applyImport(Request $request, Event $event, GuestImportService $importer): JsonResponse
    {
        $this->authorize('manageGuests', $event);

        $data = $request->validate([
            'rows' => ['required', 'array', 'max:'.config('eclat.import_max_rows')],
            'rows.*.action' => ['required', 'string', 'in:create,update,skip'],
            'rows.*.line' => ['nullable', 'integer', 'min:1'],
            'rows.*.guest_id' => ['nullable', 'integer', 'min:1'],
            'rows.*.data' => ['required', 'array'],
            'rows.*.data.name' => ['nullable', 'string', 'max:255'],
            'rows.*.data.phone' => ['nullable', 'string', 'max:32'],
            'rows.*.data.email' => ['nullable', 'email', 'max:255'],
            'rows.*.data.card_type' => ['nullable', 'string', Rule::in(config('eclat.card_types'))],
            'rows.*.data.attendees_count' => ['nullable', 'integer', 'min:1', 'max:'.config('eclat.max_group_attendees')],
            'rows.*.data.confirmation_status' => ['nullable', 'string', Rule::in(config('eclat.confirmation_statuses'))],
            'rows.*.data.table_number' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'rows.*.data.seat_number' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'rows.*.data.notes' => ['nullable', 'string', 'max:2000'],
            'rows.*.fields' => ['nullable', 'array'],
            'rows.*.fields.*' => ['string', Rule::in(GuestImportService::MERGE_FIELDS)],
        ]);

        $result = $importer->apply($event, $data['rows']);

        return response()->json($result);
    }

    public function export(Request $request, Event $event, GuestExportService $exporter): StreamedResponse
    {
        $this->authorize('manageGuests', $event);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:'.implode(',', config('eclat.guest_statuses'))],
            'card_type' => ['nullable', 'string', Rule::in(config('eclat.card_types'))],
            'confirmation_status' => ['nullable', 'string', Rule::in(config('eclat.confirmation_statuses'))],
            'table_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $spreadsheet = $exporter->export($event, $filters);
        $filename = $exporter->filename($event);

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'private, max-age=0, must-revalidate',
        ]);
    }

    public function exportTemplate(Request $request, GuestExportService $exporter): StreamedResponse
    {
        abort_unless(
            $request->user()?->isOrganizer() || $request->user()?->isSuperAdmin(),
            403,
            'Only organizer accounts can download the guest import template.'
        );

        $spreadsheet = $exporter->template();

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, 'eclat-guest-import-template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'private, max-age=0, must-revalidate',
        ]);
    }

    public function send(SendInvitationRequest $request, Guest $guest, MessagingService $messaging): JsonResponse
    {
        $this->authorize('update', $guest->event);

        $data = $request->validated();
        $event = $guest->event;

        if ($guest->status === 'cancelled') {
            throw ValidationException::withMessages([
                'guest' => ['Cancelled guests cannot receive invitations.'],
            ]);
        }

        if ($data['channel'] === 'whatsapp' && trim((string) $guest->phone) === '') {
            throw ValidationException::withMessages([
                'guest' => ['This guest does not have a phone number.'],
            ]);
        }

        if ($data['channel'] === 'sms' && trim((string) $guest->phone) === '') {
            throw ValidationException::withMessages([
                'guest' => ['This guest does not have a phone number.'],
            ]);
        }

        if ($data['channel'] === 'email' && trim((string) $guest->email) === '') {
            throw ValidationException::withMessages([
                'guest' => ['This guest does not have an email address.'],
            ]);
        }

        $result = $messaging->sendToGuest($event, $guest, $data['channel'], $data['message_template'] ?? null);

        if (! $result['sent']) {
            return response()->json([
                'message' => $result['error'] ?? 'The invitation could not be sent.',
            ], 502);
        }

        return response()->json([
            'guest' => new GuestResource($guest->refresh()),
            'message' => $result['message'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withDefaults(
        array $data,
        User $actor,
        Event $event,
        OrganizerSettings $settings,
        ?Guest $guest = null
    ): array {
        $cardType = $data['card_type']
            ?? $guest?->card_type
            ?? (($data['is_vip'] ?? false) ? 'vip' : $settings->get($actor, 'guests.default_card_type'));
        $data['card_type'] = $cardType;

        if ($guest === null && ! array_key_exists('attendees_count', $data)) {
            $fixed = config("eclat.card_type_attendees.{$cardType}");
            $data['attendees_count'] = is_int($fixed)
                ? $fixed
                : max(1, $settings->int($actor, 'guests.default_group_size'));
        }

        if (array_key_exists('confirmation_status', $data)) {
            $confirmation = (string) $data['confirmation_status'];
            $unchanged = $guest !== null && $confirmation === $guest->confirmation_status;

            if ($unchanged) {
                // Re-saving an unchanged RSVP must not move the decision date.
                unset($data['confirmed_at'], $data['confirmation_source']);
            } elseif ($confirmation === 'pending') {
                $data['confirmed_at'] = null;
                $data['confirmation_source'] = null;
            } else {
                $data['confirmed_at'] = $data['confirmed_at'] ?? now();
                $data['confirmation_source'] = $data['confirmation_source'] ?? 'manual';
            }
        }

        return $data;
    }

    /**
     * @return list<string>
     */
    private function seatingWarnings(Event $event, Guest $guest, TableOccupancyService $tables): array
    {
        if ($guest->table_number !== null) {
            $tables->ensureTable($event, (int) $guest->table_number);
        }

        $warning = $tables->warningFor($event, $guest->table_number);

        return $warning === null ? [] : [$warning];
    }
}
