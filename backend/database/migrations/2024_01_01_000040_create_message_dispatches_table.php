<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('channel', ['whatsapp', 'email']);
            $table->string('recipient');
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->string('provider_message_id')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['event_id', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_dispatches');
    }
};
