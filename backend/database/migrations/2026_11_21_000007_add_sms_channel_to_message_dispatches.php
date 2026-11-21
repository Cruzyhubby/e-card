<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE message_dispatches DROP CONSTRAINT IF EXISTS message_dispatches_channel_check');
            DB::statement("ALTER TABLE message_dispatches ADD CONSTRAINT message_dispatches_channel_check CHECK (channel IN ('whatsapp', 'email', 'sms'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE message_dispatches MODIFY channel ENUM('whatsapp', 'email', 'sms') NOT NULL");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE message_dispatches DROP CONSTRAINT IF EXISTS message_dispatches_channel_check');
            DB::statement("ALTER TABLE message_dispatches ADD CONSTRAINT message_dispatches_channel_check CHECK (channel IN ('whatsapp', 'email'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE message_dispatches MODIFY channel ENUM('whatsapp', 'email') NOT NULL");
        }
    }
};
