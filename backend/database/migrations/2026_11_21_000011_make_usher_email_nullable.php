<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Usher accounts start with only a gate label and password; the person
        // who signs in supplies their own name, e-mail and phone.
        Schema::table('users', function (Blueprint $table): void {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        foreach (DB::table('users')->whereNull('email')->pluck('id') as $id) {
            DB::table('users')->where('id', $id)->update(['email' => 'gate-'.$id.'@gate.eclat.local']);
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->string('email')->nullable(false)->change();
        });
    }
};
