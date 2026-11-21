<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $event->title }} · Your invitation</title>
    <style>
        :root {
            --accent: {{ $event->accent_color }};
            --ink: #0f172a;
            --muted: #64748b;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            min-height: 100dvh;
            padding: 32px 16px;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            color: var(--ink);
            background:
                radial-gradient(circle at 12% 8%, rgba(192, 132, 252, 0.18), transparent 42%),
                radial-gradient(circle at 88% 92%, rgba(14, 165, 233, 0.14), transparent 46%),
                #f6f4fb;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }

        .shell {
            width: 100%;
            max-width: 620px;
            min-width: 0;
            /* Auto block margins centre the card when it fits and top-align it when it scrolls. */
            margin-block: auto;
        }

        .card {
            overflow: hidden;
            min-width: 0;
            border-radius: 26px;
            background: #ffffff;
            box-shadow: 0 30px 70px -30px rgba(15, 23, 42, 0.42);
        }

        .ecard {
            background: #0b1120;
        }

        .ecard svg {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
        }

        .details {
            padding: 30px 32px 34px;
        }

        .eyebrow {
            margin: 0 0 6px;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--accent);
            font-weight: 700;
        }

        h1 {
            margin: 0 0 6px;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 30px;
            line-height: 1.15;
        }

        .event-title {
            margin: 0 0 22px;
            color: var(--muted);
            font-size: 15px;
        }

        .meta {
            display: grid;
            gap: 14px;
            margin: 0;
            padding: 20px 0 0;
            border-top: 1px solid #e2e8f0;
        }

        .meta div {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            font-size: 14px;
        }

        .meta dt {
            color: var(--muted);
            font-weight: 500;
        }

        .meta dd {
            margin: 0;
            text-align: right;
            font-weight: 600;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 20px;
            padding: 7px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: {{ $guest->status === 'checked_in' ? '#065f46' : '#4c1d95' }};
            background: {{ $guest->status === 'checked_in' ? '#d1fae5' : '#f3e8ff' }};
        }

        .download {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            margin-top: 22px;
            padding: 14px 20px;
            border-radius: 14px;
            background: var(--accent);
            color: #0b1120;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            text-decoration: none;
            transition: filter 0.15s ease, transform 0.15s ease;
        }

        .download:hover {
            filter: brightness(1.06);
            transform: translateY(-1px);
        }

        .download svg {
            width: 16px;
            height: 16px;
        }

        .hint {
            margin: 12px 0 0;
            font-size: 12px;
            line-height: 1.55;
            color: var(--muted);
            text-align: center;
        }

        .foot {
            margin: 22px 6px 0;
            text-align: center;
            font-size: 12px;
            line-height: 1.6;
            color: var(--muted);
        }

        .foot a {
            color: var(--ink);
        }

        @media (max-width: 480px) {
            .details {
                padding: 24px 22px 28px;
            }

            h1 {
                font-size: 26px;
            }
        }
    </style>
</head>
<body>
    <div class="shell">
        <article class="card">
            <div class="ecard">
                {!! $ecardSvg !!}
            </div>

            <div class="details">
                <p class="eyebrow">Your invitation</p>
                <h1>{{ $guest->name }}</h1>
                <p class="event-title">{{ $event->title }} · Hosted by {{ $event->host_name }}</p>

                <dl class="meta">
                    <div>
                        <dt>Date</dt>
                        <dd>{{ $event->event_date?->format('D, j M Y') }}</dd>
                    </div>
                    <div>
                        <dt>Time</dt>
                        <dd>{{ $event->start_time_label }}</dd>
                    </div>
                    <div>
                        <dt>Venue</dt>
                        <dd>{{ $event->venue }}</dd>
                    </div>
                    <div>
                        <dt>Table</dt>
                        <dd>{{ $guest->table_number ?? 'To be assigned' }}{{ $guest->seat_number ? ' · Seat '.$guest->seat_number : '' }}</dd>
                    </div>
                </dl>

                <span class="badge">
                    {{ $guest->status === 'checked_in' ? 'Checked in' : 'Ready for entry' }}
                </span>

                <a class="download" href="{{ $guest->ecard_download_url }}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download e-card
                </a>
                <p class="hint">Save the image and show it at the gate — the QR at the bottom is your pass.</p>
            </div>
        </article>

        <p class="foot">
            This page is your gate pass. Present the QR code above at the entrance — reopen this link any time.
        </p>
    </div>
</body>
</html>
