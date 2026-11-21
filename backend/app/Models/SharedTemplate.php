<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SharedTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'category',
        'format',
        'file_path',
        'file_data',
        'preview_path',
        'original_name',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function designVersions(): HasMany
    {
        return $this->hasMany(DesignVersion::class, 'template_id');
    }
}
