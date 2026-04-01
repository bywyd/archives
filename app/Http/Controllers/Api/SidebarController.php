<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MetaEntityType;
use App\Models\Universe;
use App\Services\UniverseService;
use Illuminate\Http\JsonResponse;

class SidebarController extends Controller
{
    /**
     * Return a compact tree payload for a universe sidebar expansion.
     * One request instead of N separate calls for entity types, timelines,
     * categories and media sources.
     */
    public function universeTree(Universe $universe): JsonResponse
    {
        $data = UniverseService::universeTree($universe);
        // $data = $universe->rememberCache('sidebar-tree', 1800, function () use ($universe) {
        //     // Count entities per type within this universe only
        //     $typeCounts = $universe->entities()
        //         ->selectRaw('entity_type_id, count(*) as count')
        //         ->groupBy('entity_type_id')
        //         ->pluck('count', 'entity_type_id');

        //     $entityTypes = MetaEntityType::orderBy('name')
        //         ->get()
        //         ->map(fn ($t) => array_merge($t->toArray(), [
        //             'entities_count' => (int) $typeCounts->get($t->id, 0),
        //         ]));

        //     $timelines = $universe->timelines()
        //         ->withCount('entities')
        //         ->orderBy('sort_order')
        //         ->orderBy('name')
        //         ->get(['id', 'name', 'slug']);

        //     $categories = $universe->categories()
        //         ->whereNull('parent_id')
        //         ->with(['children' => fn ($q) => $q
        //             ->select(['id', 'name', 'slug', 'parent_id'])
        //             ->orderBy('sort_order')
        //             ->orderBy('name'),
        //         ])
        //         ->orderBy('sort_order')
        //         ->orderBy('name')
        //         ->get(['id', 'name', 'slug', 'parent_id']);

        //     $mediaSources = $universe->mediaSources()
        //         ->withCount('entities')
        //         ->orderBy('sort_order')
        //         ->orderBy('name')
        //         ->get(['id', 'name', 'slug', 'media_type']);

        //     return [
        //         'entity_types'   => $entityTypes->values()->toArray(),
        //         'timelines'      => $timelines->values()->toArray(),
        //         'categories'     => $categories->values()->toArray(),
        //         'media_sources'  => $mediaSources->values()->toArray(),
        //         'total_entities' => (int) $typeCounts->sum(),
        //     ];
        // });

        return response()->json(['data' => $data]);
    }
}
