<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckInLog extends Model
{
    protected $fillable = [
        'event_id',
        'guest_id',
        'usher_id',
        'device_id',
        'operator_name',
        'operator_phone',
        'operator_email',
        'token_attempted',
        'validation_status',
        'scanned_at',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function usher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usher_id');
    }
}
