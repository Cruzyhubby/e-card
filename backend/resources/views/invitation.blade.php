<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $event->title }} · Your invitation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..800&family=Playfair+Display:wght@400..900&display=swap" rel="stylesheet">
    <style>
        :root {
            --accent: {{ $event->accent_color }};
            --ink: #2E2A24;
            --forest: #152B22;
            --gold: #C49A3C;
            --gold-light: #E2C97E;
            --muted: #6B6358;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            min-height: 100dvh;
            padding: 32px 16px;
            font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            color: var(--ink);
            background:
                radial-gradient(circle at 12% 8%, rgba(196, 154, 60, 0.16), transparent 42%),
                radial-gradient(circle at 88% 92%, rgba(61, 122, 94, 0.12), transparent 46%),
                #FDFAF3;
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

        .brandbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 14px;
            padding: 12px 18px;
            border-radius: 16px;
            background: var(--forest);
            border: 1px solid rgba(226, 201, 126, 0.18);
        }

        .brandbar img {
            display: block;
            height: 28px;
            width: auto;
        }

        .brandbar span {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: rgba(253, 250, 243, 0.55);
        }

        .card {
            overflow: hidden;
            min-width: 0;
            border-radius: 26px;
            background: #FFFFFF;
            border: 1px solid rgba(196, 154, 60, 0.18);
            box-shadow: 0 30px 70px -30px rgba(21, 43, 34, 0.42);
        }

        .ecard {
            background: #08120E;
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
            font-family: "Playfair Display", Georgia, "Times New Roman", serif;
            font-weight: 600;
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
            border-top: 1px solid rgba(196, 154, 60, 0.24);
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
            color: {{ $guest->status === 'checked_in' ? '#2A5240' : '#8A6A1A' }};
            background: {{ $guest->status === 'checked_in' ? '#E7F0EA' : '#F7F0DC' }};
            border: 1px solid {{ $guest->status === 'checked_in' ? 'rgba(42, 82, 64, 0.2)' : 'rgba(196, 154, 60, 0.32)' }};
        }

        .download {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            margin-top: 22px;
            padding: 14px 20px;
            border-radius: 14px;
            background: var(--forest);
            color: var(--gold-light);
            border: 1px solid rgba(226, 201, 126, 0.25);
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
            color: var(--forest);
            font-weight: 600;
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
        <header class="brandbar">
            <img src="{{ asset('branding/fahari-logo.png') }}" alt="Fahari Creative">
            <span>E-Card Suite</span>
        </header>

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
            This page is your gate pass. Present the QR code above at the entrance — reopen this link any time.<br>
            Crafted by Fahari Creative.
        </p>
    </div>
</body>
</html>
