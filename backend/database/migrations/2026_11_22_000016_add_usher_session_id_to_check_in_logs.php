<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('check_in_logs', 'usher_session_id')) {
            Schema::table('check_in_logs', function (Blueprint $table) {
                $table->unsignedBigInteger('usher_session_id')->nullable()->after('usher_id');
                $table->index('usher_session_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('check_in_logs', 'usher_session_id')) {
            Schema::table('check_in_logs', function (Blueprint $table) {
                $table->dropIndex(['usher_session_id']);
                $table->dropColumn('usher_session_id');
            });
        }
    }
};
