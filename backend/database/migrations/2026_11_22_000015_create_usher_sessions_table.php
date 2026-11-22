<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usher_sessions')) {
            Schema::create('usher_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('event_id')->nullable()->constrained()->nullOnDelete();
                $table->unsignedBigInteger('personal_access_token_id')->nullable()->unique();
                $table->string('name', 100)->nullable();
                $table->string('phone', 32)->nullable();
                $table->string('email')->nullable();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('ended_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('check_in_logs', 'operator_name')) {
            Schema::table('check_in_logs', function (Blueprint $table) {
                $table->string('operator_name', 100)->nullable();
                $table->string('operator_phone', 32)->nullable();
                $table->string('operator_email')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('check_in_logs', 'operator_name')) {
            Schema::table('check_in_logs', function (Blueprint $table) {
                $table->dropColumn(['operator_name', 'operator_phone', 'operator_email']);
            });
        }

        Schema::dropIfExists('usher_sessions');
    }
};
