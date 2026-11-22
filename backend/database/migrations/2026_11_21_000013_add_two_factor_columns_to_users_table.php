<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'two_factor_secret')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->text('two_factor_secret')->nullable();
            });
        }

        if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->text('two_factor_recovery_codes')->nullable();
            });
        }

        if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->timestamp('two_factor_confirmed_at')->nullable();
            });
        }

        if (! Schema::hasColumn('users', 'two_factor_last_counter')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->unsignedBigInteger('two_factor_last_counter')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['two_factor_last_counter', 'two_factor_confirmed_at', 'two_factor_recovery_codes', 'two_factor_secret'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                Schema::table('users', function (Blueprint $table) use ($column): void {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
