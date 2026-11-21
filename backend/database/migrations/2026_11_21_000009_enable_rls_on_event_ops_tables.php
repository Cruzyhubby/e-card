<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TABLES = [
        'event_tables',
        'event_usher_assignments',
        'calling_participants',
        'call_allocations',
        'call_attempts',
        'design_versions',
        'design_approvals',
        'shared_templates',
        'organizer_settings',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Supabase exposes every public table through PostgREST. Without RLS the
        // anon/authenticated keys can read and write these tables. The Laravel
        // role owns them and bypasses RLS, so the API keeps working unchanged.
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
