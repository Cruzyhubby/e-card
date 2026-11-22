<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>You are invited to {{ $event->title }}</title>
</head>
<body style="margin:0;padding:28px 14px;background:#FDFAF3;font-family:'DM Sans',Arial,Helvetica,sans-serif;color:#2E2A24;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid rgba(196,154,60,0.22);">
        <tr>
            <td style="padding:18px 30px;background:#152B22;border-bottom:2px solid #C49A3C;">
                <img src="{{ asset('branding/fahari-logo.png') }}" alt="Fahari Creative" height="30" style="display:block;height:30px;width:auto;">
            </td>
        </tr>
        <tr>
            <td style="padding:26px 30px 10px;">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8A6A1A;font-weight:bold;">
                    {{ $event->title }}
                </p>
                <h1 style="margin:0 0 12px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:600;font-size:26px;line-height:1.25;color:#2E2A24;">
                    Hello {{ $guest->name }},
                </h1>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#4B453C;">
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
                <p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6358;font-weight:bold;">
                    Scan to download your e-card
                </p>
                <img src="{{ $guest->qr_image_url }}" width="180" height="180" alt="QR code to download the e-card for {{ $guest->name }}" style="display:block;margin:0 auto;padding:8px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6B6358;">
                    Or <a href="{{ $guest->ecard_download_url }}" style="color:#8A6A1A;font-weight:bold;">download the e-card</a> directly.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:22px 30px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;color:#4B453C;">
                    <tr>
                        <td style="color:#6B6358;">Date</td>
                        <td align="right" style="font-weight:bold;">{{ $event->event_date?->format('l, j F Y') }} · {{ $event->start_time }}</td>
                    </tr>
                    <tr>
                        <td style="color:#6B6358;">Venue</td>
                        <td align="right" style="font-weight:bold;">{{ $event->venue }}</td>
                    </tr>
                    <tr>
                        <td style="color:#6B6358;">Table</td>
                        <td align="right" style="font-weight:bold;">{{ $guest->table_number ?? 'To be assigned' }}</td>
                    </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6B6358;">
                    Keep this e-mail for your personalised QR entry pass, or open
                    <a href="{{ $guest->invitation_url }}" style="color:#8A6A1A;font-weight:bold;">your invitation page</a>.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:14px 30px;background:#F5EFD8;font-size:11px;letter-spacing:0.8px;color:#6B6358;">
                Fahari Creative · We are crafting
            </td>
        </tr>
    </table>
</body>
</html>
