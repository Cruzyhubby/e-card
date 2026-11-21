<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventUsherAssignment extends Model
{
    protected $fillable = [
        'event_id',
        'user_id',
        'calling_enabled',
        'status',
        'assigned_at',
        'ended_at',
        'assigned_by',
    ];

    protected function casts(): array
    {
        return [
            'calling_enabled' => 'boolean',
            'assigned_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
