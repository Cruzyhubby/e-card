<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CallAllocation extends Model
{
    public const OUTCOMES = [
        'confirmed',
        'not_confirmed',
        'no_answer',
        'busy',
        'phone_off',
        'wrong_number',
        'call_back_later',
    ];

    protected $fillable = [
        'event_id',
        'guest_id',
        'participant_user_id',
        'status',
        'last_outcome',
        'follow_up_at',
        'assigned_at',
        'completed_at',
        'assigned_by',
    ];

    protected function casts(): array
    {
        return [
            'follow_up_at' => 'datetime',
            'assigned_at' => 'datetime',
            'completed_at' => 'datetime',
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

    public function participant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_user_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(CallAttempt::class, 'guest_id', 'guest_id');
    }

    public function scopeAssignedTo(Builder $query, int $userId): Builder
    {
        return $query->where('participant_user_id', $userId);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'assigned');
    }
}
