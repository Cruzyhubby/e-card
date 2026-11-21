<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Guest extends Model
{
    protected $fillable = [
        'event_id',
        'name',
        'phone',
        'email',
        'table_number',
        'seat_number',
        'is_vip',
        'card_type',
        'attendees_count',
        'confirmation_status',
        'confirmation_source',
        'confirmed_at',
        'notes',
        'status',
        'qr_token',
        'checked_in_at',
    ];

    protected $appends = [
        'invitation_url',
    ];

    protected $attributes = [
        'card_type' => 'single',
        'attendees_count' => 1,
        'confirmation_status' => 'pending',
        'status' => 'pending',
        'is_vip' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_vip' => 'boolean',
            'table_number' => 'integer',
            'seat_number' => 'integer',
            'attendees_count' => 'integer',
            'confirmed_at' => 'datetime',
            'checked_in_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Guest $guest): void {
            if (blank($guest->qr_token)) {
                $guest->qr_token = (string) Str::uuid();
            }
        });

        static::saving(function (Guest $guest): void {
            $cardTypeExplicit = $guest->isDirty('card_type');
            $vipExplicit = $guest->isDirty('is_vip');

            if ($cardTypeExplicit && $guest->card_type !== null) {
                $guest->is_vip = $guest->card_type === 'vip';
            } elseif ($vipExplicit && $guest->is_vip) {
                $guest->card_type = 'vip';
            }

            if ($guest->card_type === 'single') {
                $guest->attendees_count = 1;
            } elseif ($guest->card_type === 'double') {
                $guest->attendees_count = 2;
            } elseif ($guest->card_type === 'vip' && (int) $guest->attendees_count < 1) {
                $guest->attendees_count = 1;
            }
        });
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function checkInLogs(): HasMany
    {
        return $this->hasMany(CheckInLog::class);
    }

    public function messageDispatches(): HasMany
    {
        return $this->hasMany(MessageDispatch::class);
    }

    public function callAllocation(): HasOne
    {
        return $this->hasOne(CallAllocation::class);
    }

    public function callAttempts(): HasMany
    {
        return $this->hasMany(CallAttempt::class);
    }

    public function getInvitationUrlAttribute(): string
    {
        return rtrim((string) config('app.url'), '/').'/i/'.$this->qr_token;
    }

    public function getEcardUrlAttribute(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/invitations/'.$this->qr_token.'/ecard.svg';
    }

    public function getEcardDownloadUrlAttribute(): string
    {
        return $this->ecard_url.'?download=1';
    }

    public function getQrImageUrlAttribute(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/invitations/'.$this->qr_token.'/qr.png';
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $like = '%'.$term.'%';

        return $query->where(function (Builder $query) use ($like): void {
            $query->whereLike('name', $like)
                ->orWhereLike('phone', $like)
                ->orWhereLike('email', $like);
        });
    }

    public function scopeWhereQrToken(Builder $query, string $token): Builder
    {
        if (! Str::isUuid($token)) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where('qr_token', $token);
    }

    public function scopeWithStatus(Builder $query, ?string $status): Builder
    {
        return $status === null || $status === ''
            ? $query
            : $query->where('status', $status);
    }

    public function scopeWithConfirmation(Builder $query, ?string $status): Builder
    {
        return $status === null || $status === ''
            ? $query
            : $query->where('confirmation_status', $status);
    }

    public function scopeWithCardType(Builder $query, ?string $cardType): Builder
    {
        return $cardType === null || $cardType === ''
            ? $query
            : $query->where('card_type', $cardType);
    }
}
