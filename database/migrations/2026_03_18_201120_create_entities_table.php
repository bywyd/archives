<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('entities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('universe_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->string('short_description')->nullable();
            $table->longText('content')->nullable();
            $table->foreignId('entity_type_id')->constrained('meta_entity_types')->onDelete('cascade');
            $table->foreignId('entity_status_id')->constrained('meta_entity_statuses')->onDelete('cascade');
            $table->json('metadata')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['universe_id', 'slug']);
            $table->index('entity_type_id');
            $table->index('entity_status_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entities');
    }
};
