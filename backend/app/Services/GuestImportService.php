<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Guest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use Throwable;

class GuestImportService
{
    /**
     * Columns accepted from a spreadsheet or CSV, in template order.
     *
     * @var array<string, array{label: string, aliases: list<string>}>
     */
    private const COLUMNS = [
        'name' => ['label' => 'Name', 'aliases' => ['full_name', 'guest_name', 'name', 'names']],
        'phone' => ['label' => 'Phone', 'aliases' => ['phone', 'phone_number', 'mobile', 'tel', 'telephone']],
        'email' => ['label' => 'Email', 'aliases' => ['email', 'email_address', 'e_mail']],
        'card_type' => ['label' => 'Card type', 'aliases' => ['card_type', 'card', 'type', 'ticket_type', 'invitation_card']],
        'attendees_count' => ['label' => 'Attendees', 'aliases' => ['attendees', 'attendees_count', 'group_size', 'seats', 'pax', 'guests_count']],
        'confirmation_status' => ['label' => 'RSVP', 'aliases' => ['rsvp', 'confirmation', 'rsvp_status', 'response']],
        'table_number' => ['label' => 'Table', 'aliases' => ['table', 'table_number', 'table_no']],
        'seat_number' => ['label' => 'Seat', 'aliases' => ['seat', 'seat_number', 'seat_no']],
        'notes' => ['label' => 'Notes', 'aliases' => ['notes', 'note', 'remarks', 'comment', 'comments']],
        'is_vip' => ['label' => 'VIP', 'aliases' => ['vip', 'is_vip']],
    ];

    /**
     * Field-level merge targets; is_vip is folded into card_type.
     *
     * @var list<string>
     */
    public const MERGE_FIELDS = [
        'name',
        'phone',
        'email',
        'card_type',
        'attendees_count',
        'confirmation_status',
        'table_number',
        'seat_number',
        'notes',
    ];

    /**
     * Read a CSV or XLSX upload and detect matches against the event guest list.
     *
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>, errors: list<string>}
     */
    public function analyze(Event $event, UploadedFile $file): array
    {
        $read = $this->read($file);

        if ($read['error'] !== null) {
            return [
                'summary' => ['total_rows' => 0, 'new' => 0, 'duplicates' => 0, 'invalid' => 0],
                'rows' => [],
                'errors' => [$read['error']],
            ];
        }

        $guests = $event->guests()->get();
        $byPhone = [];
        $byEmail = [];
        $byName = [];

        foreach ($guests as $guest) {
            $phoneKey = self::phoneKey($guest->phone);
            if ($phoneKey !== '') {
                $byPhone[$phoneKey] ??= $guest;
            }

            $emailKey = strtolower(trim((string) $guest->email));
            if ($emailKey !== '') {
                $byEmail[$emailKey] ??= $guest;
            }

            $nameKey = mb_strtolower(trim((string) $guest->name));
            if ($nameKey !== '') {
                $byName[$nameKey][] = $guest;
            }
        }

        $seenPhones = [];
        $seenEmails = [];
        $seenNames = [];
        $rows = [];
        $summary = ['total_rows' => 0, 'new' => 0, 'duplicates' => 0, 'invalid' => 0];

        foreach ($read['rows'] as $row) {
            $summary['total_rows']++;
            $data = $row['data'];
            $issues = $row['issues'];

            if ($issues !== []) {
                $summary['invalid']++;
                $rows[] = [
                    'line' => $row['line'],
                    'data' => $data,
                    'status' => 'invalid',
                    'issues' => $issues,
                    'match' => null,
                    'fields' => [],
                ];
                continue;
            }

            $phoneKey = self::phoneKey($data['phone']);
            $emailKey = strtolower(trim((string) $data['email']));
            $nameKey = mb_strtolower(trim((string) $data['name']));
            $contactless = $phoneKey === '' && $emailKey === '';

            $fileDuplicate = ($phoneKey !== '' && isset($seenPhones[$phoneKey]))
                || ($emailKey !== '' && isset($seenEmails[$emailKey]))
                || ($contactless && $nameKey !== '' && isset($seenNames[$nameKey]));

            if ($phoneKey !== '') {
                $seenPhones[$phoneKey] = $row['line'];
            }
            if ($emailKey !== '') {
                $seenEmails[$emailKey] = $row['line'];
            }
            if ($contactless && $nameKey !== '') {
                $seenNames[$nameKey] = $row['line'];
            }

            if ($fileDuplicate) {
                $summary['invalid']++;
                $rows[] = [
                    'line' => $row['line'],
                    'data' => $data,
                    'status' => 'invalid',
                    'issues' => ['Another row in this file uses the same phone or email.'],
                    'match' => null,
                    'fields' => [],
                ];
                continue;
            }

            $match = null;
            if ($emailKey !== '' && isset($byEmail[$emailKey])) {
                $match = $byEmail[$emailKey];
            } elseif ($phoneKey !== '' && isset($byPhone[$phoneKey])) {
                $match = $byPhone[$phoneKey];
            } elseif ($contactless && isset($byName[$nameKey])) {
                if (count($byName[$nameKey]) > 1) {
                    $summary['invalid']++;
                    $rows[] = [
                        'line' => $row['line'],
                        'data' => $data,
                        'status' => 'invalid',
                        'issues' => ['Several guests are named “'.$data['name'].'”. Add a phone or email so the right guest is updated.'],
                        'match' => null,
                        'fields' => [],
                    ];
                    continue;
                }
                $match = $byName[$nameKey][0];
            }

            if ($match === null) {
                $summary['new']++;
                $rows[] = [
                    'line' => $row['line'],
                    'data' => $data,
                    'status' => 'new',
                    'issues' => [],
                    'match' => null,
                    'fields' => [],
                ];
                continue;
            }

            $fields = $this->fieldDiffs($match, $data);

            if ($fields === []) {
                $summary['duplicates']++;
                $rows[] = [
                    'line' => $row['line'],
                    'data' => $data,
                    'status' => 'duplicate',
                    'issues' => ['Already up to date — nothing to change.'],
                    'match' => $this->matchPayload($match),
                    'fields' => [],
                ];
                continue;
            }

            $summary['duplicates']++;
            $rows[] = [
                'line' => $row['line'],
                'data' => $data,
                'status' => 'duplicate',
                'issues' => [],
                'match' => $this->matchPayload($match),
                'fields' => $fields,
            ];
        }

        return ['summary' => $summary, 'rows' => $rows, 'errors' => []];
    }

    /**
     * Apply the reviewed rows. Only whitelisted, non-empty incoming values are
     * written; blank spreadsheet cells never erase stored guest data.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array{created: int, updated: int, skipped: int, failed: int, errors: list<string>}
     */
    public function apply(Event $event, array $rows): array
    {
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0, 'errors' => []];
        $tableNumbers = [];
        $calling = app(CallingService::class);

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::transaction(function () use ($chunk, $event, $calling, &$result, &$tableNumbers): void {
                foreach ($chunk as $row) {
                    $action = $row['action'] ?? 'skip';

                    if ($action === 'skip') {
                        $result['skipped']++;
                        continue;
                    }

                    $data = is_array($row['data'] ?? null) ? $row['data'] : [];
                    $line = (int) ($row['line'] ?? 0);

                    try {
                        if ($action === 'create') {
                            $guest = $event->guests()->create($this->createPayload($event, $data));
                            $calling->autoAssignGuest($guest);
                            $result['created']++;

                            if ($guest->table_number !== null) {
                                $tableNumbers[] = (int) $guest->table_number;
                            }

                            continue;
                        }

                        if ($action === 'update') {
                            $guest = $event->guests()->find((int) ($row['guest_id'] ?? 0));

                            if ($guest === null) {
                                $result['failed']++;
                                $result['errors'][] = "Row {$line}: the matched guest no longer exists.";

                                continue;
                            }

                            $fields = is_array($row['fields'] ?? null) ? $row['fields'] : [];
                            $payload = $this->mergePayload($guest, $data, $fields);

                            if ($payload === []) {
                                $result['skipped']++;
                                continue;
                            }

                            $guest->update($payload);
                            $guest->refresh();

                            if ($guest->confirmation_status !== 'pending') {
                                $calling->closeForGuest($guest);
                            }

                            $result['updated']++;

                            if ($guest->table_number !== null) {
                                $tableNumbers[] = (int) $guest->table_number;
                            }

                            continue;
                        }

                        $result['skipped']++;
                    } catch (Throwable $error) {
                        $result['failed']++;
                        $result['errors'][] = "Row {$line}: could not be imported.";
                        report($error);
                    }
                }
            });
        }

        $tables = app(TableOccupancyService::class);
        foreach (array_unique($tableNumbers) as $number) {
            $tables->ensureTable($event, $number);
        }

        if ($result['created'] > 0 || $result['updated'] > 0) {
            AuditLogger::record(
                'guests.imported',
                sprintf(
                    'Guest spreadsheet imported: %d added, %d updated, %d skipped in event #%d.',
                    $result['created'],
                    $result['updated'],
                    $result['skipped'],
                    $event->id
                ),
                'Event',
                $event->id
            );
        }

        return $result;
    }

    /**
     * @return array{rows: list<array{line: int, data: array<string, mixed>, issues: list<string>}>, error: ?string}
     */
    private function read(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            $matrix = match ($extension) {
                'xlsx', 'xls' => $this->readSpreadsheet($file),
                default => $this->readCsv($file),
            };
        } catch (Throwable $error) {
            report($error);

            return ['rows' => [], 'error' => 'The spreadsheet could not be read. Save it as .xlsx or .csv and try again.'];
        }

        if ($matrix === []) {
            return ['rows' => [], 'error' => 'The uploaded file is empty.'];
        }

        $maxRows = max(1, (int) config('eclat.import_max_rows', 2000));
        $header = array_shift($matrix);
        $map = $this->columnMap($header);
        $hasHeader = $map !== null;

        if (! $hasHeader) {
            $map = array_combine(array_keys(self::COLUMNS), array_keys(self::COLUMNS));
            array_unshift($matrix, $header);
        }

        $rows = [];
        $overflow = count($matrix) > $maxRows;

        foreach (array_slice($matrix, 0, $maxRows) as $index => $cells) {
            $line = $index + ($hasHeader ? 2 : 1);

            if ($this->isEmptyRow($cells)) {
                continue;
            }

            [$data, $issues] = $this->normalizeRow($cells, $map);
            $rows[] = ['line' => $line, 'data' => $data, 'issues' => $issues];
        }

        if ($rows === []) {
            return ['rows' => [], 'error' => 'No guest rows were found in the uploaded file.'];
        }

        if ($overflow) {
            $rows[] = [
                'line' => $maxRows + ($hasHeader ? 2 : 1),
                'data' => $this->emptyRow(),
                'issues' => [sprintf('Only the first %d rows were read.', $maxRows)],
            ];
        }

        return ['rows' => $rows, 'error' => null];
    }

    /**
     * @return list<list<string>>
     */
    private function readCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw new \RuntimeException('The uploaded file could not be opened.');
        }

        $matrix = [];

        while (($cells = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $matrix[] = array_map(static fn ($value): string => trim((string) $value), $cells);
        }

        fclose($handle);

        if ($matrix !== []) {
            $matrix[0][0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) ($matrix[0][0] ?? '')) ?? '';
        }

        return $matrix;
    }

    /**
     * @return list<list<string>>
     */
    private function readSpreadsheet(UploadedFile $file): array
    {
        $reader = new XlsxReader();
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($file->getRealPath());
        $matrix = $spreadsheet->getActiveSheet()->toArray(null, false, true, false);
        $spreadsheet->disconnectWorksheets();

        return array_map(
            static fn (array $cells): array => array_map(
                static fn ($value): string => trim((string) $value),
                $cells
            ),
            $matrix
        );
    }

    /**
     * @param  list<string>  $header
     * @return array<string, int>|null
     */
    private function columnMap(array $header): ?array
    {
        $aliases = [];
        foreach (self::COLUMNS as $key => $column) {
            $aliases[$key] = $key;
            foreach ($column['aliases'] as $alias) {
                $aliases[$alias] = $key;
            }
        }

        $map = [];

        foreach ($header as $index => $label) {
            $normalized = strtolower(trim((string) $label));
            $normalized = (string) preg_replace('/[\s\-]+/', '_', $normalized);
            $key = $aliases[$normalized] ?? null;

            if ($key !== null && ! array_key_exists($key, $map)) {
                $map[$key] = $index;
            }
        }

        return array_key_exists('name', $map) ? $map : null;
    }

    /**
     * @param  list<string>  $cells
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private function normalizeRow(array $cells, array $map): array
    {
        $get = static function (string $key) use ($cells, $map): string {
            $index = $map[$key] ?? null;

            return $index === null || ! array_key_exists($index, $cells) ? '' : trim((string) $cells[$index]);
        };

        $issues = [];
        $name = $get('name');

        if ($name === '') {
            $issues[] = 'Name is required.';
        }

        if (mb_strlen($name) > 255) {
            $issues[] = 'Name is longer than 255 characters.';
            $name = mb_substr($name, 0, 255);
        }

        $email = $get('email');
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $issues[] = 'Email address is not valid.';
        }

        $phone = $get('phone');
        if (mb_strlen($phone) > 32) {
            $issues[] = 'Phone number is longer than 32 characters.';
            $phone = mb_substr($phone, 0, 32);
        }

        $table = $this->positiveInteger($get('table_number'));
        if ($get('table_number') !== '' && $table === null) {
            $issues[] = 'Table must be a whole number of 1 or more.';
        }

        $seat = $this->positiveInteger($get('seat_number'));
        if ($get('seat_number') !== '' && $seat === null) {
            $issues[] = 'Seat must be a whole number of 1 or more.';
        }

        $attendees = $this->positiveInteger($get('attendees_count'));
        $cardType = $this->cardType($get('card_type'));

        if ($get('card_type') !== '' && $cardType === null) {
            $issues[] = 'Card type must be Single, Double, Group or VIP.';
        }

        if ($this->truthy($get('is_vip'))) {
            $cardType = 'vip';
        }

        $confirmation = $this->confirmation($get('confirmation_status'));
        if ($get('confirmation_status') !== '' && $confirmation === null) {
            $issues[] = 'RSVP must be Confirmed, Pending or Declined.';
        }

        $notes = $get('notes');
        if (mb_strlen($notes) > 2000) {
            $issues[] = 'Notes are longer than 2000 characters.';
            $notes = mb_substr($notes, 0, 2000);
        }

        // Blank cells stay blank: defaults are only applied when creating a new guest,
        // so a reviewed update never rewrites a field the organizer left empty.
        return [
            [
                'name' => $name,
                'phone' => $phone === '' ? null : $phone,
                'email' => $email === '' ? null : mb_substr($email, 0, 255),
                'card_type' => $cardType,
                'attendees_count' => $attendees,
                'confirmation_status' => $confirmation,
                'table_number' => $table,
                'seat_number' => $seat,
                'notes' => $notes === '' ? null : $notes,
            ],
            array_values(array_unique($issues)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyRow(): array
    {
        return [
            'name' => '',
            'phone' => null,
            'email' => null,
            'card_type' => 'single',
            'attendees_count' => 1,
            'confirmation_status' => 'pending',
            'table_number' => null,
            'seat_number' => null,
            'notes' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array{key: string, label: string, current: string, incoming: string}>
     */
    private function fieldDiffs(Guest $guest, array $data): array
    {
        $fields = [];

        foreach (self::MERGE_FIELDS as $key) {
            $incoming = $this->displayValue($key, $data[$key] ?? null);

            if ($incoming === '') {
                continue;
            }

            $current = $this->displayValue($key, $guest->{$key});

            if ($current === $incoming) {
                continue;
            }

            $fields[] = [
                'key' => $key,
                'label' => self::COLUMNS[$key]['label'],
                'current' => $current,
                'incoming' => $incoming,
            ];
        }

        return $fields;
    }

    private function displayValue(string $key, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return match ($key) {
            'card_type' => (string) (config("eclat.card_type_labels.{$value}") ?? $value),
            'attendees_count', 'table_number', 'seat_number' => (string) $value,
            'confirmation_status' => ucfirst((string) $value),
            default => trim((string) $value),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function matchPayload(Guest $guest): array
    {
        return [
            'id' => $guest->id,
            'name' => $guest->name,
            'phone' => $guest->phone,
            'email' => $guest->email,
            'card_type' => $guest->card_type,
            'attendees_count' => $guest->attendees_count,
            'confirmation_status' => $guest->confirmation_status,
            'table_number' => $guest->table_number,
            'seat_number' => $guest->seat_number,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function createPayload(Event $event, array $data): array
    {
        $payload = $this->sanitize($data);

        $cardType = $payload['card_type'] ?? match (true) {
            ($payload['attendees_count'] ?? 1) > 2 => 'group',
            ($payload['attendees_count'] ?? 1) === 2 => 'double',
            default => 'single',
        };
        $payload['card_type'] = $cardType;

        $maxAttendees = (int) config('eclat.max_group_attendees', 50);
        $fixedAttendees = config("eclat.card_type_attendees.{$cardType}");
        $payload['attendees_count'] = is_int($fixedAttendees)
            ? $fixedAttendees
            : max(1, min($maxAttendees, (int) ($payload['attendees_count'] ?? 1)));

        $payload['confirmation_status'] ??= 'pending';
        $payload['status'] = 'pending';

        if (in_array($payload['confirmation_status'], ['confirmed', 'declined'], true)) {
            $payload['confirmed_at'] = now();
            $payload['confirmation_source'] = 'import';
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $fields
     * @return array<string, mixed>
     */
    private function mergePayload(Guest $guest, array $data, array $fields): array
    {
        $allowed = array_values(array_intersect(self::MERGE_FIELDS, $fields));
        $payload = [];

        foreach ($allowed as $key) {
            $sanitized = $this->sanitize([$key => $data[$key] ?? null]);

            if (! array_key_exists($key, $sanitized)) {
                continue;
            }

            if ($this->displayValue($key, $sanitized[$key]) === $this->displayValue($key, $guest->{$key})) {
                continue;
            }

            $payload[$key] = $sanitized[$key];
        }

        if (array_key_exists('confirmation_status', $payload)) {
            if ($payload['confirmation_status'] === 'pending') {
                $payload['confirmed_at'] = null;
                $payload['confirmation_source'] = null;
            } else {
                $payload['confirmed_at'] = now();
                $payload['confirmation_source'] = 'import';
            }
        }

        return $payload;
    }

    /**
     * Drop blank values so an empty spreadsheet cell can never erase data.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sanitize(array $data): array
    {
        $payload = [];

        foreach (self::MERGE_FIELDS as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }

            $value = $data[$key];

            if ($value === null || $value === '' || (is_string($value) && trim($value) === '')) {
                continue;
            }

            $payload[$key] = match ($key) {
                'name' => mb_substr(trim((string) $value), 0, 255),
                'phone' => mb_substr(trim((string) $value), 0, 32),
                'email' => mb_substr(trim((string) $value), 0, 255),
                'notes' => mb_substr(trim((string) $value), 0, 2000),
                'card_type' => in_array($value, config('eclat.card_types'), true) ? $value : 'single',
                'attendees_count' => max(1, min((int) config('eclat.max_group_attendees', 50), (int) $value)),
                'confirmation_status' => in_array($value, config('eclat.confirmation_statuses'), true) ? $value : 'pending',
                'table_number', 'seat_number' => max(1, (int) $value),
                default => $value,
            };
        }

        if (($payload['card_type'] ?? null) === 'single') {
            $payload['attendees_count'] = 1;
        } elseif (($payload['card_type'] ?? null) === 'double') {
            $payload['attendees_count'] = 2;
        } elseif (($payload['card_type'] ?? null) === 'vip' && ($payload['attendees_count'] ?? 1) < 1) {
            $payload['attendees_count'] = 1;
        }

        return $payload;
    }

    /**
     * @param  list<string>  $cells
     */
    private function isEmptyRow(array $cells): bool
    {
        foreach ($cells as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    private function positiveInteger(string $value): ?int
    {
        if ($value === '' || ! ctype_digit($value)) {
            return null;
        }

        $number = (int) $value;

        return $number > 0 ? $number : null;
    }

    private function cardType(string $value): ?string
    {
        $value = strtolower(trim($value));
        $value = strtok($value, " (") ?: $value;

        return match ($value) {
            'single', 's', '1', 'one' => 'single',
            'double', 'couple', 'c', '2', 'two' => 'double',
            'group', 'g', 'family' => 'group',
            'vip', 'v' => 'vip',
            default => null,
        };
    }

    private function confirmation(string $value): ?string
    {
        $value = strtolower(trim($value));

        if ($value === '') {
            return null;
        }

        return match ($value) {
            'pending', 'awaiting', 'maybe', 'not_sure' => 'pending',
            'confirmed', 'yes', 'y', '1', 'true', 'attending' => 'confirmed',
            'declined', 'no', 'n', '0', 'false', 'not_attending' => 'declined',
            default => null,
        };
    }

    private function truthy(string $value): bool
    {
        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y', 'vip'], true);
    }

    public static function phoneKey(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone) ?? '';

        if ($digits === '') {
            return '';
        }

        return strlen($digits) > 9 ? substr($digits, -9) : $digits;
    }
}
