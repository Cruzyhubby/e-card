<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_usher_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('calling_enabled')->default(false);
            $table->string('status', 16)->default('active');
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['event_id', 'status']);
        });

        $now = now();

        DB::table('users')
            ->select(['id', 'event_id'])
            ->where('role', 'usher')
            ->whereNotNull('event_id')
            ->orderBy('id')
            ->chunk(100, function ($ushers) use ($now): void {
                $rows = [];

                foreach ($ushers as $usher) {
                    $rows[] = [
                        'event_id' => $usher->event_id,
                        'user_id' => $usher->id,
                        'calling_enabled' => false,
                        'status' => 'active',
                        'assigned_at' => $now,
                        'ended_at' => null,
                        'assigned_by' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('event_usher_assignments')->insertOrIgnore($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_usher_assignments');
    }
};
