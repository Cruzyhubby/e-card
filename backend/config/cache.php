<?php

return [
    'default' => env('CACHE_STORE', 'file'),

    'stores' => [
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],

        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('CACHE_DB_CONNECTION'),
            'table' => env('CACHE_DB_TABLE', 'cache'),
            'lock_connection' => env('CACHE_DB_LOCK_CONNECTION'),
            'lock_table' => env('CACHE_DB_LOCK_TABLE', 'cache_locks'),
        ],
    ],

    'prefix' => env('CACHE_PREFIX', 'eclat_cache_'),
];
