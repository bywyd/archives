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
        Schema::create('entity_cross_references', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_entity_id')->constrained('entities')->onDelete('cascade');
            $table->foreignId('target_entity_id')->constrained('entities')->onDelete('cascade');
            $table->foreignId('source_section_id')->nullable()->constrained('entity_sections')->onDelete('set null');
            $table->string('context')->nullable();
            $table->timestamps();

            $table->index(['source_entity_id', 'target_entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entity_cross_references');
    }
};
