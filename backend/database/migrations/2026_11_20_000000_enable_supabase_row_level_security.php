<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TABLES = [
        'migrations',
        'users',
        'events',
        'guests',
        'check_in_logs',
        'message_dispatches',
        'personal_access_tokens',
        'app_settings',
        'audit_logs',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Supabase exposes the public schema through PostgREST. The Laravel
        // database role owns these tables and bypasses RLS; anon/authenticated
        // keys get no policies, so they cannot read or write application data.
        foreach (self::TABLES as $table) {
            DB::statement('ALTER TABLE IF EXISTS "'.$table.'" ENABLE ROW LEVEL SECURITY');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement('ALTER TABLE IF EXISTS "'.$table.'" DISABLE ROW LEVEL SECURITY');
        }
    }
};
