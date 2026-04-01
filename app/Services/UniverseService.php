<?php

namespace App\Services;

use App\Models\Entity;
use App\Models\MetaEntityType;
use App\Models\Universe;
use Illuminate\Support\Facades\DB;

class UniverseService
{
    // This service can be used for more complex universe-related logic in the future.

    public static function universeTree(Universe $universe)
    {
    
        return $universe->rememberCache('sidebar-tree', 1800, function () use ($universe) {
            $typeCounts = $universe->entities()
                ->selectRaw('entity_type_id, count(*) as count')
                ->groupBy('entity_type_id')
                ->pluck('count', 'entity_type_id');

            $entityTypes = MetaEntityType::orderBy('name')
                ->get()
                ->map(fn ($t) => array_merge($t->toArray(), [
                    'entities_count' => (int) $typeCounts->get($t->id, 0),
                ]));

            $timelines = $universe->timelines()
                ->withCount('entities')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug']);

            $categories = $universe->categories()
                ->whereNull('parent_id')
                ->with(['children' => fn ($q) => $q
                    ->select(['id', 'name', 'slug', 'parent_id'])
                    ->orderBy('sort_order')
                    ->orderBy('name'),
                ])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'parent_id']);

            $mediaSources = $universe->mediaSources()
                ->withCount('entities')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'media_type']);

            $mapTypeId    = MetaEntityType::where('slug', 'map')->value('id');
            $hasMapTypeId = DB::table('meta_entity_relation_types')->where('slug', 'has-map')->value('id');

            $featuredMaps = Entity::query()
                ->select([
                    'entities.id',
                    'entities.name',
                    'entities.slug',
                    'entities.metadata',
                    'parent.id as parent_id',
                    'parent.name as parent_name',
                    'parent.slug as parent_slug',
                ])
                ->join('entity_relations as er', function ($join) use ($hasMapTypeId) {
                    $join->on('er.to_entity_id', '=', 'entities.id')
                         ->where('er.relation_type_id', '=', $hasMapTypeId);
                })
                ->join('entities as parent', 'parent.id', '=', 'er.from_entity_id')
                ->where('entities.universe_id', $universe->id)
                ->where('entities.entity_type_id', $mapTypeId)
                ->where('entities.is_featured', true)
                ->orderBy('entities.name')
                ->get()
                ->map(fn ($m) => [
                    'id'          => $m->id,
                    'name'        => $m->name,
                    'slug'        => $m->slug,
                    'entity_id'   => $m->parent_id,
                    'entity_name' => $m->parent_name ?? '',
                    'entity_slug' => $m->parent_slug ?? '',
                ]);

            return [
                'entity_types' => $entityTypes->values()->toArray(),
                'timelines' => $timelines->values()->toArray(),
                'categories' => $categories->values()->toArray(),
                'media_sources' => $mediaSources->values()->toArray(),
                'maps' => $featuredMaps->values()->toArray(),
                'total_entities' => (int) $typeCounts->sum(),
            ];
        });

    }

}