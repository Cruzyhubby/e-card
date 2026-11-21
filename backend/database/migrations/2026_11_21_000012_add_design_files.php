<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shared_templates', function (Blueprint $table): void {
            $table->longText('file_data')->nullable()->after('file_path');
            $table->string('original_name')->nullable()->after('preview_path');
        });

        Schema::table('design_versions', function (Blueprint $table): void {
            $table->string('format', 12)->default('svg')->after('kind');
            $table->longText('file_data')->nullable()->after('file_path');
            $table->string('original_name')->nullable()->after('file_data');
        });
    }

    public function down(): void
    {
        Schema::table('shared_templates', function (Blueprint $table): void {
            $table->dropColumn(['file_data', 'original_name']);
        });

        Schema::table('design_versions', function (Blueprint $table): void {
            $table->dropColumn(['format', 'file_data', 'original_name']);
        });
    }
};
