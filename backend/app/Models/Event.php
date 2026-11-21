<?php

namespace App\Models;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'category',
        'host_name',
        'event_date',
        'start_time',
        'venue',
        'total_seats',
        'total_tables',
        'description',
        'accent_color',
        'invitation_status',
        'ecard_config',
        'settings',
    ];

    protected $appends = [
        'guest_count',
        'vip_count',
        'sent_count',
        'checked_in_count',
        'confirmed_count',
        'declined_count',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'total_seats' => 'integer',
            'total_tables' => 'integer',
            'ecard_config' => 'array',
            'settings' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function guests(): HasMany
    {
        return $this->hasMany(Guest::class);
    }

    public function checkInLogs(): HasMany
    {
        return $this->hasMany(CheckInLog::class);
    }

    public function ushers(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function messageDispatches(): HasMany
    {
        return $this->hasMany(MessageDispatch::class);
    }

    public function eventTables(): HasMany
    {
        return $this->hasMany(EventTable::class);
    }

    public function usherAssignments(): HasMany
    {
        return $this->hasMany(EventUsherAssignment::class);
    }

    public function callingParticipants(): HasMany
    {
        return $this->hasMany(CallingParticipant::class);
    }

    public function callAllocations(): HasMany
    {
        return $this->hasMany(CallAllocation::class);
    }

    public function callAttempts(): HasMany
    {
        return $this->hasMany(CallAttempt::class);
    }

    public function designVersions(): HasMany
    {
        return $this->hasMany(DesignVersion::class);
    }

    public function approvedDesign(): ?DesignVersion
    {
        return $this->designVersions()->where('status', 'approved')->orderByDesc('version')->first();
    }

    /**
     * Count definitions shared by eager loading and query scopes.
     *
     * @return array<string, Closure|string>
     */
    public static function guestStatCounts(): array
    {
        return [
            'guests',
            'guests as vip_count' => fn (Builder $query) => $query->where('is_vip', true),
            'guests as sent_count' => fn (Builder $query) => $query->whereIn('status', ['sent', 'checked_in']),
            'guests as checked_in_count' => fn (Builder $query) => $query->where('status', 'checked_in'),
            'guests as confirmed_count' => fn (Builder $query) => $query->where('confirmation_status', 'confirmed'),
            'guests as declined_count' => fn (Builder $query) => $query->where('confirmation_status', 'declined'),
        ];
    }

    public function scopeWithStats(Builder $query): Builder
    {
        return $query->withCount(static::guestStatCounts());
    }

    public function loadGuestStats(): static
    {
        return $this->loadCount(static::guestStatCounts());
    }

    public function getStartTimeLabelAttribute(): string
    {
        $value = (string) $this->start_time;

        if (blank($value)) {
            return '—';
        }

        $timestamp = strtotime($value);

        return $timestamp === false ? $value : date('g:i A', $timestamp);
    }

    public function getGuestCountAttribute(): int
    {
        return $this->statCount('guests_count', fn (): int => $this->guests()->count());
    }

    public function getVipCountAttribute(): int
    {
        return $this->statCount('vip_count', fn (): int => $this->guests()->where('is_vip', true)->count());
    }

    public function getSentCountAttribute(): int
    {
        return $this->statCount(
            'sent_count',
            fn (): int => $this->guests()->whereIn('status', ['sent', 'checked_in'])->count()
        );
    }

    public function getCheckedInCountAttribute(): int
    {
        return $this->statCount(
            'checked_in_count',
            fn (): int => $this->guests()->where('status', 'checked_in')->count()
        );
    }

    public function getConfirmedCountAttribute(): int
    {
        return $this->statCount(
            'confirmed_count',
            fn (): int => $this->guests()->where('confirmation_status', 'confirmed')->count()
        );
    }

    public function getDeclinedCountAttribute(): int
    {
        return $this->statCount(
            'declined_count',
            fn (): int => $this->guests()->where('confirmation_status', 'declined')->count()
        );
    }

    private function statCount(string $attribute, Closure $fallback): int
    {
        if (array_key_exists($attribute, $this->attributes)) {
            return (int) $this->attributes[$attribute];
        }

        if ($this->relationLoaded('guests')) {
            return match ($attribute) {
                'vip_count' => $this->guests->where('is_vip', true)->count(),
                'sent_count' => $this->guests->whereIn('status', ['sent', 'checked_in'])->count(),
                'checked_in_count' => $this->guests->where('status', 'checked_in')->count(),
                'confirmed_count' => $this->guests->where('confirmation_status', 'confirmed')->count(),
                'declined_count' => $this->guests->where('confirmation_status', 'declined')->count(),
                default => $this->guests->count(),
            };
        }

        return (int) $fallback();
    }
}
