<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The live Supabase schema is maintained by hand and may already
        // contain these columns, so add each one only when it is missing.
        $this->addColumn('shared_templates', 'file_data', fn (Blueprint $table) => $table->longText('file_data')->nullable()->after('file_path'));
        $this->addColumn('shared_templates', 'original_name', fn (Blueprint $table) => $table->string('original_name')->nullable()->after('preview_path'));
        $this->addColumn('design_versions', 'format', fn (Blueprint $table) => $table->string('format', 12)->default('svg')->after('kind'));
        $this->addColumn('design_versions', 'file_data', fn (Blueprint $table) => $table->longText('file_data')->nullable()->after('file_path'));
        $this->addColumn('design_versions', 'original_name', fn (Blueprint $table) => $table->string('original_name')->nullable()->after('file_data'));
    }

    public function down(): void
    {
        $this->dropColumn('shared_templates', 'file_data');
        $this->dropColumn('shared_templates', 'original_name');
        $this->dropColumn('design_versions', 'format');
        $this->dropColumn('design_versions', 'file_data');
        $this->dropColumn('design_versions', 'original_name');
    }

    private function addColumn(string $table, string $column, Closure $definition): void
    {
        if (Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($definition): void {
            $definition($blueprint);
        });
    }

    private function dropColumn(string $table, string $column): void
    {
        if (! Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column): void {
            $blueprint->dropColumn($column);
        });
    }
};
