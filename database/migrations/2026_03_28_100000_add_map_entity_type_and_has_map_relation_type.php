<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('meta_entity_types')->insert([
            'name'        => 'Map',
            'slug'        => 'map',
            'description' => 'A floor-plan or geographical map belonging to a location, building, or facility.',
            'icon'        => 'map',
            'color'       => '#22C55E',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        DB::table('meta_entity_relation_types')->insert([
            'name'           => 'Has Map',
            'slug'           => 'has-map',
            'description'    => 'A relationship where one entity owns or contains a map.',
            'inverse_name'   => 'Is Map Of',
            'is_directional' => true,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('meta_entity_relation_types')->where('slug', 'has-map')->delete();
        DB::table('meta_entity_types')->where('slug', 'map')->delete();
    }
};
