<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('role');
            $table->foreignId('event_id')->nullable()->after('device_id')->constrained('events')->nullOnDelete();

            $table->index('status');
        });

        if (DB::getDriverName() === 'mysql') {
            // Widen first so existing "admin" rows stay valid, then narrow.
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','organizer','usher','super_admin') NOT NULL DEFAULT 'organizer'");
        }

        DB::table('users')->where('role', 'admin')->update(['role' => 'super_admin']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('super_admin','organizer','usher') NOT NULL DEFAULT 'organizer'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','organizer','usher','super_admin') NOT NULL DEFAULT 'organizer'");
        }

        DB::table('users')->where('role', 'super_admin')->update(['role' => 'admin']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','organizer','usher') NOT NULL DEFAULT 'organizer'");
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'event_id']);
        });
    }
};
