<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DesignVersion extends Model
{
    protected $fillable = [
        'event_id',
        'template_id',
        'version',
        'kind',
        'format',
        'status',
        'file_path',
        'file_data',
        'original_name',
        'config',
        'approval_token',
        'approved_at',
        'approved_by_name',
        'feedback',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'config' => 'array',
            'approved_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SharedTemplate::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(DesignApproval::class);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }
}
