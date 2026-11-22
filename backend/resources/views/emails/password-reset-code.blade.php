<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Fahari password reset code</title>
</head>
<body style="margin:0;padding:28px 14px;background:#FDFAF3;font-family:'DM Sans',Arial,Helvetica,sans-serif;color:#2E2A24;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid rgba(196,154,60,0.22);">
        <tr>
            <td style="padding:18px 28px;background:#152B22;border-bottom:2px solid #C49A3C;">
                <img src="{{ asset('branding/fahari-logo.png') }}" alt="Fahari Creative" height="30" style="display:block;height:30px;width:auto;">
            </td>
        </tr>
        <tr>
            <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8A6A1A;font-weight:bold;">
                    Fahari Event Suite
                </p>
                <h1 style="margin:0 0 12px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:600;font-size:26px;line-height:1.25;color:#2E2A24;">
                    Hello {{ $recipientName }},
                </h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#4B453C;">
                    Use the code below to set a new password for your organizer or administrator account.
                </p>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:0 32px;">
                <div style="display:inline-block;padding:18px 28px;border-radius:14px;background:#F7F0DC;border:1px solid #E2C97E;font-size:32px;letter-spacing:10px;font-weight:bold;color:#6B4F12;font-family:'Courier New',Courier,monospace;">
                    {{ $code }}
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 32px 30px;">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:#4B453C;">
                    The code expires in {{ $expiresInMinutes }} minutes and can be used once. If you did not request a password reset, ignore this e-mail — your current password stays unchanged.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6B6358;">
                    For security, never share this code with anyone.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:14px 32px;background:#F5EFD8;font-size:11px;letter-spacing:0.8px;color:#6B6358;">
                Fahari Creative · We are crafting
            </td>
        </tr>
    </table>
</body>
</html>
