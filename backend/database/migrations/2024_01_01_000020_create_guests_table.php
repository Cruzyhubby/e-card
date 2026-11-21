<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->unsignedInteger('table_number')->nullable();
            $table->unsignedInteger('seat_number')->nullable();
            $table->boolean('is_vip')->default(false);
            $table->enum('status', ['pending', 'sent', 'checked_in', 'cancelled'])->default('pending');
            $table->uuid('qr_token')->unique();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['event_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guests');
    }
};
