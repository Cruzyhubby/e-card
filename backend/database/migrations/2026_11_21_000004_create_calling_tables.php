<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calling_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 16)->default('usher');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['event_id', 'user_id']);
            $table->index(['event_id', 'active']);
        });

        Schema::create('call_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->foreignId('participant_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 16)->default('assigned');
            $table->string('last_outcome', 24)->nullable();
            $table->timestamp('follow_up_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'guest_id']);
            $table->index(['participant_user_id', 'status']);
            $table->index(['event_id', 'status']);
            $table->index(['event_id', 'follow_up_at']);
        });

        Schema::create('call_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('outcome', 24);
            $table->text('notes')->nullable();
            $table->timestamp('follow_up_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'created_at']);
            $table->index(['guest_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_attempts');
        Schema::dropIfExists('call_allocations');
        Schema::dropIfExists('calling_participants');
    }
};
