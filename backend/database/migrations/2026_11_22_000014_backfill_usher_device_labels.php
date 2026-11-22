<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Older gate accounts were provisioned with a device id only. The
        // scanner now signs in with the device label, so seed the label from
        // that id before organizers rename them.
        DB::table('users')
            ->where('role', 'usher')
            ->whereNotNull('device_id')
            ->where('device_id', '!=', '')
            ->where(function ($query): void {
                $query->whereNull('device_label')->orWhere('device_label', '');
            })
            ->update(['device_label' => DB::raw('device_id')]);
    }

    public function down(): void
    {
        // Intentional no-op: organizers may have renamed the labels since.
    }
};
