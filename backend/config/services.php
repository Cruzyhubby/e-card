<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'whatsapp' => [
        'token' => env('WHATSAPP_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),
        'from' => env('WHATSAPP_FROM'),
    ],

    'sms' => [
        'provider' => env('SMS_PROVIDER', 'kilakona'),
        'base_url' => env('KILAKONA_BASE_URL', 'https://api.kilakona.co.tz'),
        'api_key' => env('KILAKONA_API_KEY'),
        'sender_id' => env('KILAKONA_SENDER_ID'),
    ],
];
