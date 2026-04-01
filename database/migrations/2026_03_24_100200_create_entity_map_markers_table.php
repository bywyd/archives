<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_map_markers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_map_floor_id')->constrained('entity_map_floors')->cascadeOnDelete();
            $table->foreignId('entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('x_percent', 8, 4);
            $table->decimal('y_percent', 8, 4);
            $table->string('marker_type')->default('poi');
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->json('metadata')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('entity_map_floor_id');
            $table->index('entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_map_markers');
    }
};
