<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'must_change_password',
        'role',
        'status',
        'phone',
        'device_id',
        'device_label',
        'event_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_last_counter' => 'integer',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function checkInLogs(): HasMany
    {
        return $this->hasMany(CheckInLog::class, 'usher_id');
    }

    public function usherAssignments(): HasMany
    {
        return $this->hasMany(EventUsherAssignment::class);
    }

    public function callingParticipations(): HasMany
    {
        return $this->hasMany(CallingParticipant::class);
    }

    public function callAllocations(): HasMany
    {
        return $this->hasMany(CallAllocation::class, 'participant_user_id');
    }

    public function organizerSetting()
    {
        return $this->hasOne(OrganizerSetting::class, 'user_id');
    }

    public function activeUsherAssignment(): ?EventUsherAssignment
    {
        return $this->usherAssignments()->where('status', 'active')->latest('assigned_at')->first();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin();
    }

    public function isOrganizer(): bool
    {
        return $this->role === 'organizer';
    }

    public function isUsher(): bool
    {
        return $this->role === 'usher';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function hasEventScope(int $eventId): bool
    {
        if (! $this->isUsher()) {
            return false;
        }

        if ((int) $this->event_id === $eventId) {
            return true;
        }

        return $this->usherAssignments()
            ->where('event_id', $eventId)
            ->where('status', 'active')
            ->exists();
    }

    /**
     * The event an usher scanner should operate on. The stored event_id is a
     * cache; assignment history is the source of truth after a move.
     */
    public function currentAssignedEventId(): ?int
    {
        if ($this->event_id !== null) {
            return (int) $this->event_id;
        }

        $eventId = $this->usherAssignments()
            ->where('status', 'active')
            ->latest('assigned_at')
            ->value('event_id');

        return $eventId !== null ? (int) $eventId : null;
    }
}
