<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->string('label', 60)->nullable();
            $table->unsignedInteger('capacity')->default(0);
            $table->timestamps();

            $table->unique(['event_id', 'number']);
        });

        $now = now();

        DB::table('events')
            ->select(['id', 'total_seats', 'total_tables'])
            ->orderBy('id')
            ->chunk(100, function ($events) use ($now): void {
                foreach ($events as $event) {
                    $tableCount = max(0, (int) $event->total_tables);

                    if ($tableCount === 0) {
                        continue;
                    }

                    $seats = max(0, (int) $event->total_seats);
                    $base = intdiv($seats, $tableCount);
                    $remainder = $seats % $tableCount;

                    $rows = [];

                    for ($number = 1; $number <= $tableCount; $number++) {
                        $rows[] = [
                            'event_id' => $event->id,
                            'number' => $number,
                            'label' => null,
                            'capacity' => $base + ($number <= $remainder ? 1 : 0),
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }

                    DB::table('event_tables')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_tables');
    }
};
