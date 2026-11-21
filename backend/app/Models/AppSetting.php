<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $table = 'app_settings';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'is_secret',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            // Secrets are encrypted at rest; non-secret values cost one extra
            // decryption but keep a single storage path for every setting.
            'value' => 'encrypted',
            'is_secret' => 'boolean',
        ];
    }
}
