<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Guest;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GuestExportService
{
    private const HEADERS = [
        'Name',
        'Phone',
        'Email',
        'Card type',
        'Attendees',
        'RSVP',
        'Table',
        'Seat',
        'Delivery',
        'Checked in at',
        'Notes',
        'Invitation link',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function export(Event $event, array $filters = []): Spreadsheet
    {
        $guests = $event->guests()
            ->search($filters['search'] ?? null)
            ->withStatus($filters['status'] ?? null)
            ->withCardType($filters['card_type'] ?? null)
            ->withConfirmation($filters['confirmation_status'] ?? null)
            ->when(
                ! empty($filters['table_number']),
                fn ($query) => $query->where('table_number', (int) $filters['table_number'])
            )
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Guests');

        $sheet->fromArray(self::HEADERS, null, 'A1');

        $rows = $guests->map(fn ($guest): array => [
            $guest->name,
            $guest->phone,
            $guest->email,
            $this->label('card_type_labels', $guest->card_type),
            $guest->attendees_count,
            ucfirst((string) $guest->confirmation_status),
            $guest->table_number,
            $guest->seat_number,
            $this->deliveryLabel($guest->status),
            $guest->checked_in_at?->format('Y-m-d H:i'),
            $guest->notes,
            $guest->invitation_url,
        ])->all();

        $this->writeRows($sheet, $rows, 2);

        $lastRow = max(1, count($rows) + 1);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:L{$lastRow}");
        $sheet->getStyle('A1:L1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '111827']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(22);

        foreach ([
            'A' => 30,
            'B' => 18,
            'C' => 30,
            'D' => 14,
            'E' => 11,
            'F' => 12,
            'G' => 8,
            'H' => 8,
            'I' => 12,
            'J' => 18,
            'K' => 36,
            'L' => 70,
        ] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }

        $sheet->getStyle("E2:H{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E2:H{$lastRow}")->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_NUMBER);
        $sheet->getStyle("A1:L{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
        $sheet->getStyle("A1:L{$lastRow}")->getAlignment()->setWrapText(false);

        $this->addSummarySheet($spreadsheet, $event, $guests, $filters);

        return $spreadsheet;
    }

    public function template(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Guests');

        $sheet->fromArray(self::HEADERS, null, 'A1');
        $sheet->fromArray([
            ['Amina Yusuf', '+255 754 111 222', 'amina@example.com', 'Single', 1, 'Confirmed', 1, 1, null, null, 'Vegetarian', null],
            ['Baraka Mwinyi', '+255 754 333 444', 'baraka@example.com', 'Double', 2, 'Pending', 2, 1, null, null, null, null],
            ['Chausiku Family', '+255 754 555 666', null, 'Group', 4, 'Pending', 3, null, null, null, 'Four family members', null],
            ['Daudi Mkuu', '+255 754 777 888', null, 'VIP', 1, 'Confirmed', 1, 2, null, null, null, null],
        ], null, 'A2');

        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:L5');
        $sheet->getStyle('A1:L1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '111827']],
        ]);

        foreach (['A' => 30, 'B' => 18, 'C' => 28, 'D' => 14, 'E' => 11, 'F' => 12, 'G' => 8, 'H' => 8, 'I' => 10, 'J' => 10, 'K' => 32, 'L' => 20] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }

        $guide = $spreadsheet->createSheet();
        $guide->setTitle('Field guide');
        $guide->fromArray([
            ['Column', 'Accepted values', 'Notes'],
            ['Name', 'Free text, required', 'Matches are also detected by phone or email, so spelling can change safely.'],
            ['Phone', 'Any format', 'Used for WhatsApp and SMS delivery. Duplicates are matched on the last 9 digits.'],
            ['Email', 'a@example.com', 'Optional. Duplicates are matched case-insensitively.'],
            ['Card type', 'Single, Double, Group, VIP', 'Single seats 1, Double seats 2, Group uses the Attendees column, VIP seats 1.'],
            ['Attendees', '1 – 50', 'Only meaningful for Group cards; Single, Double and VIP are fixed.'],
            ['RSVP', 'Confirmed, Pending, Declined', 'Blank means Pending. Confirmed imports record the decision date.'],
            ['Table', 'Whole number', 'Tables are created automatically when they do not exist yet.'],
            ['Seat', 'Whole number', 'Optional seat label inside the table.'],
            ['Notes', 'Free text up to 2000 characters', 'Dietary needs, plus-ones or follow-up details.'],
            ['', '', ''],
            ['Duplicate handling', 'You review every match before anything is written.', 'Blank cells never overwrite existing guest data.'],
            ['Merging', 'Choose which fields to update per guest.', 'Untick a field to keep the value already stored on the event.'],
        ], null, 'A1');

        $guide->getStyle('A1:C1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '111827']],
        ]);
        $guide->getColumnDimension('A')->setWidth(24);
        $guide->getColumnDimension('B')->setWidth(34);
        $guide->getColumnDimension('C')->setWidth(80);
        $guide->getStyle('C1:C13')->getAlignment()->setWrapText(true);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    public function filename(Event $event, string $suffix = 'guests'): string
    {
        $slug = Str::slug((string) $event->title) ?: 'event';

        return "{$slug}-{$suffix}-".now()->format('Y-m-d').'.xlsx';
    }

    /**
     * @param  Collection<int, Guest>  $guests
     * @param  array<string, mixed>  $filters
     */
    private function addSummarySheet(Spreadsheet $spreadsheet, Event $event, $guests, array $filters): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Summary');

        $seats = (int) $guests->sum(fn ($guest): int => max(1, (int) $guest->attendees_count));
        $confirmed = $guests->where('confirmation_status', 'confirmed')->count();
        $declined = $guests->where('confirmation_status', 'declined')->count();
        $awaiting = $guests->where('confirmation_status', 'pending')->count();
        $checkedIn = $guests->where('status', 'checked_in')->count();
        $tables = $guests->pluck('table_number')->filter()->unique()->count();

        $this->writeRows($sheet, [
            ['Event', $event->title],
            ['Date', $event->event_date?->format('Y-m-d H:i')],
            ['Venue', $event->venue],
            ['Exported at', now()->format('Y-m-d H:i')],
            ['Filters', $this->filterSummary($filters)],
            ['', ''],
            ['Metric', 'Value'],
            ['Guests', $guests->count()],
            ['Seats allocated', $seats],
            ['Confirmed', $confirmed],
            ['Declined', $declined],
            ['Awaiting RSVP', $awaiting],
            ['Checked in', $checkedIn],
            ['Tables represented', $tables],
        ], 1);

        $sheet->getStyle('A1:A5')->getFont()->setBold(true);
        $sheet->getStyle('A7:B7')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '111827']],
        ]);
        $sheet->getColumnDimension('A')->setWidth(24);
        $sheet->getColumnDimension('B')->setWidth(48);
        $sheet->getStyle('B5')->getAlignment()->setWrapText(true);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function filterSummary(array $filters): string
    {
        $parts = [];

        foreach ([
            'search' => 'Search',
            'status' => 'Delivery',
            'card_type' => 'Card',
            'confirmation_status' => 'RSVP',
            'table_number' => 'Table',
        ] as $key => $label) {
            if (! empty($filters[$key])) {
                $parts[] = $label.': '.$filters[$key];
            }
        }

        return $parts === [] ? 'All guests' : implode(' · ', $parts);
    }

    /**
     * Writes every string as a literal text cell so guest-supplied values
     * such as "=HYPERLINK(...)" can never become a spreadsheet formula.
     *
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function writeRows(Worksheet $sheet, array $rows, int $startRow): void
    {
        foreach ($rows as $rowIndex => $row) {
            foreach (array_values($row) as $columnIndex => $value) {
                if ($value === null) {
                    continue;
                }

                $coordinate = Coordinate::stringFromColumnIndex($columnIndex + 1).($startRow + $rowIndex);

                if (is_int($value) || is_float($value)) {
                    $sheet->setCellValueExplicit($coordinate, $value, DataType::TYPE_NUMERIC);
                } else {
                    $sheet->setCellValueExplicit($coordinate, (string) $value, DataType::TYPE_STRING);
                }
            }
        }
    }

    private function label(string $configKey, ?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $labels = config("eclat.{$configKey}", []);

        return (string) (is_array($labels) && isset($labels[$value]) ? $labels[$value] : ucfirst($value));
    }

    private function deliveryLabel(?string $status): string
    {
        return match ($status) {
            'pending' => 'Pending',
            'sent' => 'Invited',
            'checked_in' => 'Checked in',
            'cancelled' => 'Cancelled',
            default => (string) ($status ?? ''),
        };
    }
}
