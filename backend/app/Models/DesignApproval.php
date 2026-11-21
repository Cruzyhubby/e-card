<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignApproval extends Model
{
    protected $fillable = [
        'design_version_id',
        'action',
        'actor_name',
        'actor_id',
        'comment',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'acted_at' => 'datetime',
        ];
    }

    public function designVersion(): BelongsTo
    {
        return $this->belongsTo(DesignVersion::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
