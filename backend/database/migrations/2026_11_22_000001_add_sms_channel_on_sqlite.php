<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        Schema::table('message_dispatches', function (Blueprint $table): void {
            $table->enum('channel', ['whatsapp', 'email', 'sms'])->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        Schema::table('message_dispatches', function (Blueprint $table): void {
            $table->enum('channel', ['whatsapp', 'email'])->change();
        });
    }
};
