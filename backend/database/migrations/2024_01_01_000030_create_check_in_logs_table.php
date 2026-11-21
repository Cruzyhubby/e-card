<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('check_in_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('usher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('device_id', 100)->nullable();
            $table->string('token_attempted', 100)->nullable();
            $table->enum('validation_status', ['valid', 'already_checked_in', 'denied']);
            $table->timestamp('scanned_at');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['event_id', 'scanned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('check_in_logs');
    }
};
