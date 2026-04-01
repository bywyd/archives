<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drops the now-obsolete entity_maps table and cleans up entity_map_floors:
 *  - Drops entity_map_floors.entity_map_id (FK to entity_maps).
 *  - Adds unique constraint (entity_id, slug) on entity_map_floors.
 *  - Drops the entity_maps table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->dropForeign(['entity_map_id']);
            $table->dropIndex(['entity_map_id']);
            $table->dropColumn('entity_map_id');

            $table->unique(['entity_id', 'slug']);
        });

        Schema::dropIfExists('entity_maps');
    }

    public function down(): void
    {
        // Recreate entity_maps.
        Schema::create('entity_maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('entities')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['entity_id', 'slug']);
            $table->index('entity_id');
        });

        // Restore entity_map_id column on floors.
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->dropUnique(['entity_id', 'slug']);

            $table->foreignId('entity_map_id')->nullable()->after('id')
                ->constrained('entity_maps')->cascadeOnDelete();
            $table->index('entity_map_id');
        });
    }
};
