<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category', 32);
            $table->string('host_name');
            $table->date('event_date');
            $table->string('start_time', 5);
            $table->string('venue');
            $table->unsignedInteger('total_seats');
            $table->unsignedInteger('total_tables');
            $table->text('description')->nullable();
            $table->char('accent_color', 7)->default('#C084FC');
            $table->enum('invitation_status', ['draft', 'live'])->default('draft');
            $table->json('ecard_config')->nullable();
            $table->timestamps();

            $table->index('event_date');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
