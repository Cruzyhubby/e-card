<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shared_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category', 32)->default('other');
            $table->string('format', 12)->default('svg');
            $table->string('file_path');
            $table->string('preview_path')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('category');
        });

        Schema::create('design_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('shared_templates')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('kind', 16)->default('working');
            $table->string('status', 24)->default('draft');
            $table->string('file_path')->nullable();
            $table->json('config')->nullable();
            $table->string('approval_token', 64)->nullable()->unique();
            $table->timestamp('approved_at')->nullable();
            $table->string('approved_by_name')->nullable();
            $table->text('feedback')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'version']);
            $table->index(['event_id', 'status']);
        });

        Schema::create('design_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('design_version_id')->constrained()->cascadeOnDelete();
            $table->string('action', 24);
            $table->string('actor_name')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment')->nullable();
            $table->timestamp('acted_at')->nullable();
            $table->timestamps();

            $table->index(['design_version_id', 'acted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_approvals');
        Schema::dropIfExists('design_versions');
        Schema::dropIfExists('shared_templates');
    }
};
