<?php

$frontendOrigins = array_values(array_unique(array_filter([
    env('FRONTEND_URL', 'http://localhost:5173'),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:8081',
])));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'i/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $frontendOrigins,
    'allowed_origins_patterns' => env('APP_ENV') === 'production'
        ? []
        : [
            '#^http://(localhost|127\.0\.0\.1)(:\d+)?$#',
            // Expo web / LAN previews (private ranges only).
            '#^http://(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$#',
        ],
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => false,
];
