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
        Schema::create('attribute_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_entity_type_id')->nullable()->constrained('meta_entity_types')->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->string('data_type')->default('string'); // string, integer, float, boolean, date, json, entity_reference
            $table->string('group_name')->nullable(); // For UI grouping: "Physical", "Background", "Combat", etc.
            $table->boolean('is_filterable')->default(false);
            $table->boolean('is_required')->default(false);
            $table->string('default_value')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['meta_entity_type_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attribute_definitions');
    }
};
