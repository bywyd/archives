<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Converts every entity_maps row into a first-class Entity of type "map".
 *
 * For each EntityMap record this migration will:
 *  1. Resolve the parent entity's universe_id.
 *  2. INSERT a new row into `entities` (type=map, name/slug/description/metadata/is_featured).
 *     The slug is scoped to the universe; if another entity already uses the slug, it is
 *     prefixed with the parent entity's slug (e.g. "rpd-main-map" instead of "main-map").
 *  3. INSERT an EntityRelation (has-map) linking parent → new map entity.
 *  4. UPDATE entity_map_floors.entity_id = new entity id for every floor of that map.
 *
 * Finally the entity_id column on entity_map_floors is made NOT NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        $mapTypeId = DB::table('meta_entity_types')->where('slug', 'map')->value('id');
        $hasMapTypeId = DB::table('meta_entity_relation_types')->where('slug', 'has-map')->value('id');

        $maps = DB::table('entity_maps')
            ->join('entities as parent', 'entity_maps.entity_id', '=', 'parent.id')
            ->select(
                'entity_maps.id as map_id',
                'entity_maps.entity_id as parent_entity_id',
                'entity_maps.name as map_name',
                'entity_maps.slug as map_slug',
                'entity_maps.description as map_description',
                'entity_maps.metadata as map_metadata',
                'entity_maps.is_featured as map_is_featured',
                'entity_maps.sort_order as map_sort_order',
                'entity_maps.created_at as map_created_at',
                'entity_maps.updated_at as map_updated_at',
                'parent.universe_id as universe_id',
                'parent.slug as parent_slug',
            )
            ->get();

        foreach ($maps as $map) {
            // Resolve unique slug within the universe.
            $baseSlug = $map->map_slug;
            $slug     = $baseSlug;
            $exists   = DB::table('entities')
                ->where('universe_id', $map->universe_id)
                ->where('slug', $slug)
                ->exists();

            if ($exists) {
                $slug = $map->parent_slug . '-' . $baseSlug;
                // Last resort: append numeric suffix.
                $attempt = 1;
                while (DB::table('entities')->where('universe_id', $map->universe_id)->where('slug', $slug)->exists()) {
                    $slug = $map->parent_slug . '-' . $baseSlug . '-' . $attempt;
                    $attempt++;
                }
            }

            // Merge sort_order into metadata.
            $metadata = $map->map_metadata ? json_decode($map->map_metadata, true) : [];
            $metadata['sort_order'] = $map->map_sort_order;

            $newEntityId = DB::table('entities')->insertGetId([
                'universe_id'       => $map->universe_id,
                'entity_type_id'    => $mapTypeId,
                'entity_status_id'  => DB::table('meta_entity_statuses')->where('slug', 'active')->value('id'),
                'name'              => $map->map_name,
                'slug'              => $slug,
                'short_description' => $map->map_description,
                'metadata'          => json_encode($metadata),
                'is_featured'       => $map->map_is_featured,
                'is_locked'         => false,
                'created_at'        => $map->map_created_at,
                'updated_at'        => $map->map_updated_at,
            ]);

            // Link parent → map entity via has-map relation.
            DB::table('entity_relations')->insert([
                'from_entity_id'   => $map->parent_entity_id,
                'to_entity_id'     => $newEntityId,
                'relation_type_id' => $hasMapTypeId,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            // Point every floor of this map at the new entity.
            DB::table('entity_map_floors')
                ->where('entity_map_id', $map->map_id)
                ->update(['entity_id' => $newEntityId]);
        }

        // entity_id must now be non-null on all floors.
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->foreignId('entity_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        // Restore entity_map_floors.entity_id to nullable (reversal of NOT NULL constraint).
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->foreignId('entity_id')->nullable()->change();
        });

        $hasMapTypeId = DB::table('meta_entity_relation_types')->where('slug', 'has-map')->value('id');

        // Delete all entity_relations of type has-map.
        if ($hasMapTypeId) {
            DB::table('entity_relations')->where('relation_type_id', $hasMapTypeId)->delete();
        }

        // Delete all entities of type map.
        $mapTypeId = DB::table('meta_entity_types')->where('slug', 'map')->value('id');
        if ($mapTypeId) {
            DB::table('entities')->where('entity_type_id', $mapTypeId)->delete();
        }

        // Restore entity_map_floors.entity_id to NULL for all floors.
        DB::table('entity_map_floors')->update(['entity_id' => null]);
    }
};
