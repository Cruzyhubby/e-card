<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Éclat password reset code</title>
</head>
<body style="margin:0;padding:28px 14px;background:#f4f1f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr>
            <td style="padding:30px 32px 8px;">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;font-weight:bold;">
                    Éclat Event Suite
                </p>
                <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;">
                    Hello {{ $recipientName }},
                </h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#374151;">
                    Use the code below to set a new password for your organizer or administrator account.
                </p>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:0 32px;">
                <div style="display:inline-block;padding:18px 28px;border-radius:14px;background:#f5f3ff;border:1px solid #ddd6fe;font-size:32px;letter-spacing:10px;font-weight:bold;color:#4c1d95;font-family:'Courier New',Courier,monospace;">
                    {{ $code }}
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 32px 30px;">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:#374151;">
                    The code expires in {{ $expiresInMinutes }} minutes and can be used once. If you did not request a password reset, ignore this e-mail — your current password stays unchanged.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                    For security, never share this code with anyone.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
