@php
    $generated = \Illuminate\Support\Carbon::parse($generated_at)->format('d M Y, H:i');
    $accent = '#4f46e5';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Platform report — {{ $brand['name'] }}</title>
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
        .tiles { width: 100%; margin-top: 10px; }
        .tiles td { width: 16.6%; padding: 8px 5px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
        .tiles .n { font-size: 16px; font-weight: bold; color: #0f172a; display: block; }
        .tiles .l { font-size: 7px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }
        .grid td { vertical-align: top; }
        .grid .col { padding-right: 12px; }
        .data th { text-align: left; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 4px 5px; }
        .data td { padding: 4px 5px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
        .data tr:nth-child(even) td { background: #fbfcfe; }
        .right { text-align: right; }
        .empty { padding: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; color: #64748b; text-align: center; }
        .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7.5px; color: #94a3b8; }
        .section-break { page-break-before: always; }
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
        <p class="report-title">Platform performance report</p>
        <span class="muted">Accounts, usage, delivery, calling and gate operations across every organizer</span>
    </div>

    <table class="tiles">
        <tr>
            <td><span class="n">{{ number_format($accounts['organizers']) }}</span><span class="l">Organizers</span></td>
            <td><span class="n">{{ number_format($accounts['ushers']) }}</span><span class="l">Usher accounts</span></td>
            <td><span class="n">{{ number_format($usage['events']) }}</span><span class="l">Events</span></td>
            <td><span class="n">{{ number_format($usage['guests']) }}</span><span class="l">Guests</span></td>
            <td><span class="n">{{ number_format($usage['guests_confirmed']) }}</span><span class="l">Confirmed</span></td>
            <td><span class="n">{{ number_format($usage['guests_checked_in']) }}</span><span class="l">Checked in</span></td>
        </tr>
    </table>

    <table class="grid">
        <tr>
            <td class="col" style="width:50%">
                <h2>Account health</h2>
                <table class="data">
                    <tr><td>Active organizers</td><td class="right">{{ number_format($accounts['organizers_active']) }}</td></tr>
                    <tr><td>Suspended organizers</td><td class="right">{{ number_format($accounts['organizers_suspended']) }}</td></tr>
                    <tr><td>Active usher accounts</td><td class="right">{{ number_format($accounts['ushers_active']) }}</td></tr>
                </table>

                <h2>Event portfolio</h2>
                <table class="data">
                    <tr><td>Live invitations</td><td class="right">{{ number_format($usage['events_live']) }}</td></tr>
                    <tr><td>Draft invitations</td><td class="right">{{ number_format($usage['events_draft']) }}</td></tr>
                    <tr><td>Upcoming</td><td class="right">{{ number_format($usage['events_upcoming']) }}</td></tr>
                    <tr><td>Already taken place</td><td class="right">{{ number_format($usage['events_completed']) }}</td></tr>
                </table>
            </td>
            <td class="col">
                <h2>Delivery reliability</h2>
                <table class="data">
                    <tr><th>Channel</th><th class="right">Sent</th><th class="right">Failed</th><th class="right">Queued</th></tr>
                    @foreach ($delivery['channels'] as $channel)
                        <tr>
                            <td>{{ $channel['label'] }}</td>
                            <td class="right">{{ number_format($channel['sent']) }}</td>
                            <td class="right">{{ number_format($channel['failed']) }}</td>
                            <td class="right">{{ number_format($channel['queued']) }}</td>
                        </tr>
                    @endforeach
                    <tr>
                        <td><strong>All channels</strong></td>
                        <td class="right"><strong>{{ number_format($delivery['sent']) }}</strong></td>
                        <td class="right"><strong>{{ number_format($delivery['failed']) }}</strong></td>
                        <td class="right"><strong>{{ number_format($delivery['queued']) }}</strong></td>
                    </tr>
                </table>

                <h2>Operations</h2>
                <table class="data">
                    <tr><td>Valid admissions</td><td class="right">{{ number_format($engagement['check_ins_valid']) }}</td></tr>
                    <tr><td>Repeat scan attempts</td><td class="right">{{ number_format($engagement['check_ins_duplicate']) }}</td></tr>
                    <tr><td>Denied passes</td><td class="right">{{ number_format($engagement['check_ins_denied']) }}</td></tr>
                    <tr><td>Calling participants</td><td class="right">{{ number_format($engagement['calling_participants']) }}</td></tr>
                    <tr><td>Guests in call queues</td><td class="right">{{ number_format($engagement['calling_allocated']) }}</td></tr>
                    <tr><td>Call attempts logged</td><td class="right">{{ number_format($engagement['calling_attempts']) }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <h2>Call outcomes</h2>
    <table class="data">
        <tr><th>Outcome</th><th class="right">Attempts</th></tr>
        @foreach ($engagement['calling_outcomes'] as $outcome)
            <tr><td>{{ $outcome['label'] }}</td><td class="right">{{ number_format($outcome['total']) }}</td></tr>
        @endforeach
    </table>

    <div class="section-break"></div>

    <h2>Organizer performance</h2>
    @if (count($organizers))
        <table class="data">
            <tr>
                <th>Organizer</th><th>Status</th><th class="right">Events</th><th class="right">Guests</th>
                <th class="right">Confirmed</th><th class="right">Checked in</th>
                <th class="right">Sent</th><th class="right">Failed</th><th class="right">Calls</th>
            </tr>
            @foreach ($organizers as $organizer)
                <tr>
                    <td>{{ $organizer['name'] }}<br><span class="muted">{{ $organizer['email'] }}</span></td>
                    <td>{{ ucfirst($organizer['status']) }}</td>
                    <td class="right">{{ number_format($organizer['events']) }}</td>
                    <td class="right">{{ number_format($organizer['guests']) }}</td>
                    <td class="right">{{ number_format($organizer['confirmed']) }}</td>
                    <td class="right">{{ number_format($organizer['checked_in']) }}</td>
                    <td class="right">{{ number_format($organizer['dispatches_sent']) }}</td>
                    <td class="right">{{ number_format($organizer['dispatches_failed']) }}</td>
                    <td class="right">{{ number_format($organizer['call_attempts']) }}</td>
                </tr>
            @endforeach
        </table>
    @else
        <div class="empty">No organizer accounts exist yet.</div>
    @endif

    <h2>Largest events</h2>
    @if (count($top_events))
        <table class="data">
            <tr><th>Event</th><th>Organizer</th><th>Date</th><th>Status</th><th class="right">Guests</th><th class="right">Confirmed</th><th class="right">Checked in</th></tr>
            @foreach ($top_events as $event)
                <tr>
                    <td>{{ $event['title'] }}</td>
                    <td>{{ $event['organizer'] ?: '—' }}</td>
                    <td>{{ $event['event_date'] ? \Illuminate\Support\Carbon::parse($event['event_date'])->format('d M Y') : '—' }}</td>
                    <td>{{ ucfirst($event['invitation_status']) }}</td>
                    <td class="right">{{ number_format($event['guests']) }}</td>
                    <td class="right">{{ number_format($event['confirmed']) }}</td>
                    <td class="right">{{ number_format($event['checked_in']) }}</td>
                </tr>
            @endforeach
        </table>
    @else
        <div class="empty">No events have been created yet.</div>
    @endif

    <div class="footer">
        {{ $brand['name'] }} · {{ $brand['url'] }} · Platform report generated {{ $generated }}. Guest personal data remains owned by organizers.
    </div>
</div>
</body>
</html>
