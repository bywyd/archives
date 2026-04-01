<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_map_floors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_map_id')->constrained('entity_maps')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->integer('floor_number')->default(0);
            $table->integer('image_width')->nullable();
            $table->integer('image_height')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['entity_map_id', 'slug']);
            $table->index('entity_map_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_map_floors');
    }
};
