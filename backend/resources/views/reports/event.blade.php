@php
    $accent = preg_match('/^#[0-9a-fA-F]{3,8}$/', (string) ($event['accent_color'] ?? '')) ? $event['accent_color'] : '#4f46e5';
    $date = $event['event_date'] ?? null;
    $dateLabel = $date ? \Illuminate\Support\Carbon::parse($date)->format('d M Y') : 'Date not set';
    $generated = \Illuminate\Support\Carbon::parse($generated_at)->format('d M Y, H:i');
    $confirmedShare = $totals['guests'] > 0 ? round(($confirmations['confirmed'] / $totals['guests']) * 100) : 0;
    $checkedShare = $totals['seats'] > 0 ? round(($totals['checked_in'] / $totals['seats']) * 100) : 0;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Event report — {{ $event['title'] }}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #1e293b; }
        .page { padding: 28px 32px; }
        .brandbar { border-bottom: 3px solid {{ $accent }}; padding-bottom: 10px; margin-bottom: 16px; }
        .brand { font-size: 20px; font-weight: bold; letter-spacing: 4px; color: #0f172a; }
        .brand small { display: block; font-size: 8px; letter-spacing: 2px; color: #64748b; font-weight: normal; margin-top: 2px; }
        .report-title { font-size: 15px; font-weight: bold; margin: 0 0 2px; color: #0f172a; }
        .muted { color: #64748b; }
        h2 { font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: {{ $accent }}; margin: 18px 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 3px 10px 3px 0; vertical-align: top; }
        .meta .k { color: #64748b; width: 90px; }
        .tiles { width: 100%; margin-top: 10px; }
        .tiles td { width: 20%; padding: 8px 6px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
        .tiles .n { font-size: 16px; font-weight: bold; color: #0f172a; display: block; }
        .tiles .l { font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
        .grid td { vertical-align: top; }
        .grid .col { padding-right: 12px; }
        .data th { text-align: left; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 4px 5px; }
        .data td { padding: 4px 5px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
        .data tr:nth-child(even) td { background: #fbfcfe; }
        .pill { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 7.5px; background: #eef2ff; color: #4338ca; }
        .right { text-align: right; }
        .center { text-align: center; }
        .empty { padding: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; color: #64748b; text-align: center; }
        .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7.5px; color: #94a3b8; }
    </style>
</head>
<body>
<div class="page">
    <table>
        <tr>
            <td>
                <div class="brand">{{ $brand['name'] }}<small>{{ $brand['tagline'] }}</small></div>
            </td>
            <td class="right muted">Generated {{ $generated }}</td>
        </tr>
    </table>

    <div class="brandbar" style="margin-top:12px">
        <p class="report-title">{{ $event['title'] }}</p>
        <span class="muted">General event report &amp; confirmed guest register</span>
    </div>

    <table class="meta">
        <tr>
            <td class="k">Host</td><td>{{ $event['host_name'] ?: '—' }}</td>
            <td class="k">Organizer</td><td>{{ $event['organizer']['name'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="k">Date &amp; time</td><td>{{ $dateLabel }} · {{ $event['start_time_label'] }}</td>
            <td class="k">Venue</td><td>{{ $event['venue'] ?: '—' }}</td>
        </tr>
        <tr>
            <td class="k">Invitation</td><td><span class="pill">{{ ucfirst($event['invitation_status'] ?? 'draft') }}</span></td>
            <td class="k">Report</td><td>Event #{{ $event['id'] }}</td>
        </tr>
    </table>

    <table class="tiles">
        <tr>
            <td><span class="n">{{ number_format($totals['guests']) }}</span><span class="l">Guest records</span></td>
            <td><span class="n">{{ number_format($totals['seats']) }}</span><span class="l">Seats</span></td>
            <td><span class="n">{{ number_format($confirmations['confirmed']) }}</span><span class="l">Confirmed ({{ $confirmedShare }}%)</span></td>
            <td><span class="n">{{ number_format($totals['checked_in']) }}</span><span class="l">Checked in ({{ $checkedShare }}%)</span></td>
            <td><span class="n">{{ number_format($totals['invited']) }}</span><span class="l">Invitations sent</span></td>
        </tr>
    </table>

    <table class="grid">
        <tr>
            <td class="col" style="width:50%">
                <h2>Confirmations</h2>
                <table class="data">
                    <tr><td>Confirmed</td><td class="right">{{ number_format($confirmations['confirmed']) }}</td></tr>
                    <tr><td>Pending</td><td class="right">{{ number_format($confirmations['pending']) }}</td></tr>
                    <tr><td>Declined</td><td class="right">{{ number_format($confirmations['declined']) }}</td></tr>
                </table>
                @if (count($confirmations['sources']))
                    <h2>Confirmation sources</h2>
                    <table class="data">
                        @foreach ($confirmations['sources'] as $source)
                            <tr><td>{{ $source['label'] }}</td><td class="right">{{ number_format($source['total']) }}</td></tr>
                        @endforeach
                    </table>
                @endif
            </td>
            <td class="col">
                <h2>Invitation delivery</h2>
                <table class="data">
                    <tr><th>Channel</th><th class="right">Sent</th><th class="right">Failed</th><th class="right">Queued</th></tr>
                    @foreach ($distribution as $channel)
                        <tr>
                            <td>{{ $channel['label'] }}</td>
                            <td class="right">{{ number_format($channel['sent']) }}</td>
                            <td class="right">{{ number_format($channel['failed']) }}</td>
                            <td class="right">{{ number_format($channel['queued']) }}</td>
                        </tr>
                    @endforeach
                </table>

                <h2>Gate activity</h2>
                <table class="data">
                    <tr><td>Total scans</td><td class="right">{{ number_format($attendance['scans']) }}</td></tr>
                    <tr><td>Valid admissions</td><td class="right">{{ number_format($attendance['valid']) }}</td></tr>
                    <tr><td>Repeat attempts</td><td class="right">{{ number_format($attendance['already_checked_in']) }}</td></tr>
                    <tr><td>Denied passes</td><td class="right">{{ number_format($attendance['denied']) }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="grid">
        <tr>
            <td class="col" style="width:50%">
                <h2>Calling operations</h2>
                <table class="data">
                    <tr><td>Active participants</td><td class="right">{{ count($calling['participants']) }}</td></tr>
                    <tr><td>Guests in call queue</td><td class="right">{{ number_format($calling['allocated']) }}</td></tr>
                    <tr><td>Completed calls</td><td class="right">{{ number_format($calling['completed']) }}</td></tr>
                    <tr><td>Follow-ups due</td><td class="right">{{ number_format($calling['follow_ups_due']) }}</td></tr>
                    <tr><td>Attempts logged</td><td class="right">{{ number_format($calling['attempts']) }}</td></tr>
                </table>
                @if (count($calling['participants']))
                    <table class="data">
                        @foreach ($calling['participants'] as $participant)
                            <tr><td>{{ $participant['name'] }}</td><td class="right">{{ ucfirst($participant['kind']) }}</td></tr>
                        @endforeach
                    </table>
                @endif
            </td>
            <td class="col">
                <h2>Call outcomes</h2>
                <table class="data">
                    @foreach ($calling['outcomes'] as $outcome)
                        <tr><td>{{ $outcome['label'] }}</td><td class="right">{{ number_format($outcome['total']) }}</td></tr>
                    @endforeach
                </table>
            </td>
        </tr>
    </table>

    <h2>Table plan</h2>
    <table class="data">
        <tr>
            <td>{{ number_format($tables['tables']) }} tables</td>
            <td>{{ number_format($tables['capacity']) }} capacity</td>
            <td>{{ number_format($tables['guests']) }} seated records</td>
            <td>{{ number_format($tables['seats']) }} seated places</td>
            <td>{{ number_format($tables['unassigned_guests']) }} unassigned</td>
            <td class="{{ $tables['over_capacity_tables'] > 0 ? '' : 'muted' }}">{{ number_format($tables['over_capacity_tables']) }} over capacity</td>
        </tr>
    </table>
    @if (count($tables['rows']))
        <table class="data">
            <tr><th>Table</th><th class="right">Capacity</th><th class="right">Guest records</th><th class="right">Seats</th><th class="right">Utilization</th></tr>
            @foreach ($tables['rows'] as $table)
                <tr>
                    <td>{{ $table['label'] ?: 'Table '.$table['number'] }}</td>
                    <td class="right">{{ number_format($table['capacity']) }}</td>
                    <td class="right">{{ number_format($table['guests']) }}</td>
                    <td class="right">{{ number_format($table['seats']) }}</td>
                    <td class="right">{{ $table['utilization_pct'] }}%</td>
                </tr>
            @endforeach
        </table>
    @endif

    <h2>Usher activity</h2>
    @if (count($ushers))
        <table class="data">
            <tr><th>Usher</th><th>Account</th><th>Status</th><th class="right">Scans</th><th>Last scan</th></tr>
            @foreach ($ushers as $usher)
                <tr>
                    <td>{{ $usher['name'] }}</td>
                    <td>{{ $usher['label'] ?: '—' }}</td>
                    <td>{{ ucfirst($usher['status']) }}</td>
                    <td class="right">{{ number_format($usher['scans']) }}</td>
                    <td>{{ $usher['last_scan_at'] ? \Illuminate\Support\Carbon::parse($usher['last_scan_at'])->format('d M Y H:i') : 'No scans yet' }}</td>
                </tr>
            @endforeach
        </table>
    @else
        <div class="empty">No gate accounts are attached to this event.</div>
    @endif

    <h2>Confirmed guest register</h2>
    @if (count($confirmed_guests))
        <table class="data">
            <tr>
                <th>Guest</th><th>Phone</th><th>Card</th><th class="right">Seats</th>
                <th>Table</th><th>Source</th><th>Confirmed</th><th>Delivered via</th>
            </tr>
            @foreach ($confirmed_guests as $guest)
                <tr>
                    <td>{{ $guest['name'] }}</td>
                    <td>{{ $guest['phone'] }}</td>
                    <td>{{ $guest['card_type_label'] }}</td>
                    <td class="right">{{ $guest['attendees'] }}</td>
                    <td>{{ $guest['table_label'] }}</td>
                    <td>{{ $guest['confirmation_source_label'] }}</td>
                    <td>{{ $guest['confirmed_at'] ? \Illuminate\Support\Carbon::parse($guest['confirmed_at'])->format('d M Y H:i') : '—' }}</td>
                    <td>{{ $guest['delivery_label'] }}</td>
                </tr>
            @endforeach
        </table>
    @else
        <div class="empty">No guests have confirmed yet.</div>
    @endif

    <div class="footer">
        {{ $brand['name'] }} · {{ $brand['url'] }} · Report generated {{ $generated }} for {{ $event['title'] }}.
    </div>
</div>
</body>
</html>
