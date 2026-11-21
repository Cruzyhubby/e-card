<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('guests')
            ->where('is_vip', true)
            ->where('card_type', '!=', 'vip')
            ->update(['card_type' => 'vip']);
    }

    public function down(): void
    {
        // Card type was derived from the pre-existing VIP flag; nothing to undo.
    }
};
