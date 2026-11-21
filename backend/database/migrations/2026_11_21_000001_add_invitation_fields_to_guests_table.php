<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->enum('card_type', ['single', 'double', 'group', 'vip'])->default('single')->after('is_vip');
            $table->unsignedSmallInteger('attendees_count')->default(1)->after('card_type');
            $table->enum('confirmation_status', ['pending', 'confirmed', 'declined'])->default('pending')->after('attendees_count');
            $table->string('confirmation_source', 20)->nullable()->after('confirmation_status');
            $table->timestamp('confirmed_at')->nullable()->after('confirmation_source');
            $table->text('notes')->nullable()->after('confirmed_at');

            $table->index(['event_id', 'confirmation_status']);
            $table->index(['event_id', 'card_type']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->json('settings')->nullable()->after('ecard_config');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('device_label', 40)->nullable()->unique()->after('device_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['device_label']);
            $table->dropColumn('device_label');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('settings');
        });

        Schema::table('guests', function (Blueprint $table) {
            $table->dropIndex(['event_id', 'confirmation_status']);
            $table->dropIndex(['event_id', 'card_type']);
            $table->dropColumn([
                'card_type',
                'attendees_count',
                'confirmation_status',
                'confirmation_source',
                'confirmed_at',
                'notes',
            ]);
        });
    }
};
