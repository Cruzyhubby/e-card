<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>You are invited to {{ $event->title }}</title>
</head>
<body style="margin:0;padding:28px 14px;background:#f4f1f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr>
            <td style="padding:26px 30px 10px;">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{{ $event->accent_color }};font-weight:bold;">
                    {{ $event->title }}
                </p>
                <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;">
                    Hello {{ $guest->name }},
                </h1>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#374151;">
                    {{ $invitationMessage }}
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:0 24px;">
                <div style="border-radius:14px;overflow:hidden;">
                    {!! $ecardSvg !!}
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 24px 0;text-align:center;">
                <p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;font-weight:bold;">
                    Scan to download your e-card
                </p>
                <img src="{{ $guest->qr_image_url }}" width="180" height="180" alt="QR code to download the e-card for {{ $guest->name }}" style="display:block;margin:0 auto;padding:8px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
                    Or <a href="{{ $guest->ecard_download_url }}" style="color:{{ $event->accent_color }};font-weight:bold;">download the e-card</a> directly.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:22px 30px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;color:#374151;">
                    <tr>
                        <td style="color:#6b7280;">Date</td>
                        <td align="right" style="font-weight:bold;">{{ $event->event_date?->format('l, j F Y') }} · {{ $event->start_time }}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;">Venue</td>
                        <td align="right" style="font-weight:bold;">{{ $event->venue }}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;">Table</td>
                        <td align="right" style="font-weight:bold;">{{ $guest->table_number ?? 'To be assigned' }}</td>
                    </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                    Keep this e-mail for your personalised QR entry pass, or open
                    <a href="{{ $guest->invitation_url }}" style="color:{{ $event->accent_color }};font-weight:bold;">your invitation page</a>.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
