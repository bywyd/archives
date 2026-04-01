<?php

namespace App\Http\Controllers;

use App\Http\Resources\CategoryResource;
use App\Http\Resources\EntityResource;
use App\Http\Resources\EntitySummaryResource;
use App\Http\Resources\MediaSourceResource;
use App\Http\Resources\TimelineResource;
use App\Http\Resources\UniverseResource;
use App\Models\Category;
use App\Models\Entity;
use App\Models\EntityRelation;
use App\Models\MediaSource;
use App\Models\MetaEntityType;
use App\Models\Revision;
use App\Models\Timeline;
use App\Models\Universe;
use App\Services\UniverseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class WikiController extends Controller
{
    /**
     * Landing page  hero, universes, featured entities, stats.
     */
    public function landing(): Response
    {
        $universes = Universe::query()
            ->withCount(['entities', 'timelines', 'mediaSources'])
            ->with('images')
            ->orderBy('name')
            ->get();

        $featured = Entity::query()
            ->with(['entityType', 'entityStatus', 'images', 'tags', 'universe'])
            ->where('is_featured', true)
            ->inRandomOrder()
            ->limit(8)
            ->get();

        $stats = Cache::remember('wiki:landing-stats', 600, fn () => [
            'universes' => Universe::count(),
            'entities' => Entity::count(),
            'timelines' => Timeline::count(),
            'media_sources' => MediaSource::count(),
        ]);

        return Inertia::render('landing', [
            'universes' => UniverseResource::collection($universes)->resolve(),
            'featured' => EntitySummaryResource::collection($featured)->resolve(),
            'stats' => $stats,
        ]);
    }

    /**
     * Wiki home  list all universes.
     */
    public function home(): Response
    {
        $universes = Universe::query()
            ->withCount(['entities', 'timelines', 'mediaSources'])
            ->with('images')
            ->orderBy('name')
            ->get();

        return Inertia::render('wiki/index', [
            'universes' => UniverseResource::collection($universes)->resolve(),
        ]);
    }

    /**
     * Universe overview page.
     */
    public function universe(Universe $universe): Response
    {
        $universe->loadCount(['entities', 'timelines', 'mediaSources']);
        $universe->load('images');

        $sidebarTree = $this->getSidebarTree($universe);

        $typeCounts = $universe->entities()
            ->selectRaw('entity_type_id, count(*) as count')
            ->groupBy('entity_type_id')
            ->pluck('count', 'entity_type_id');

        $entityTypes = MetaEntityType::orderBy('name')
            ->get()
            ->map(fn ($t) => array_merge($t->toArray(), [
                'entities_count' => (int) $typeCounts->get($t->id, 0),
            ]))
            ->filter(fn ($t) => $t['entities_count'] > 0)
            ->values();

        $featuredEntities = $universe->entities()
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->where('is_featured', true)
            ->limit(12)
            ->get();

        $recentEntities = $universe->entities()
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $timelines = $universe->timelines()
            ->withCount(['entities', 'events'])
            ->with('images')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $mediaSources = $universe->mediaSources()
            ->withCount('entities')
            ->with('images')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $categories = $universe->categories()
            ->whereNull('parent_id')
            ->with('children')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('wiki/universe', [
            'universe' => (new UniverseResource($universe))->resolve(),
            'sidebarTree' => $sidebarTree,
            'entityTypes' => $entityTypes,
            'featuredEntities' => EntitySummaryResource::collection($featuredEntities)->resolve(),
            'recentEntities' => EntitySummaryResource::collection($recentEntities)->resolve(),
            'timelines' => TimelineResource::collection($timelines)->resolve(),
            'mediaSources' => MediaSourceResource::collection($mediaSources)->resolve(),
            'categories' => CategoryResource::collection($categories)->resolve(),
        ]);
    }

    /**
     * Entity type listing page  paginated entities of a specific type.
     */
    public function entityTypeList(Request $request, Universe $universe, MetaEntityType $entityType): Response
    {
        $sidebarTree = $this->getSidebarTree($universe);

        $entities = $universe->entities()
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->where('entity_type_id', $entityType->id)
            ->when($request->input('search'), function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('short_description', 'like', "%{$search}%");
                });
            })
            ->orderBy($request->input('sort', 'name'), $request->input('direction', 'asc'))
            ->paginate($request->input('per_page', 24))
            ->withQueryString();

        return Inertia::render('wiki/entity-type', [
            'universe' => (new UniverseResource($universe->loadCount(['entities', 'timelines', 'mediaSources'])->load('images')))->resolve(),
            'sidebarTree' => $sidebarTree,
            'entityType' => $entityType->toArray(),
            'entities' => EntitySummaryResource::collection($entities)->response()->getData(true),
        ]);
    }

    /**
     * Build a consistent universe prop array for Inertia responses.
     * Includes images and settings needed for frontend branding.
     */
    private function universeProps(Universe $universe): array
    {
        $universe->loadMissing('images');

        return [
            'id'        => $universe->id,
            'name'      => $universe->name,
            'slug'      => $universe->slug,
            'is_locked' => (bool) $universe->is_locked,
            'settings'  => $universe->settings,
            'images'    => $universe->images->map(fn ($img) => [
                'id'            => $img->id,
                'type'          => $img->type,
                'url'           => $img->url,
                'thumbnail_url' => $img->thumbnail_url,
            ])->values()->all(),
        ];
    }

    /**
     * Entity revision history page.
     */
    public function entityHistory(Universe $universe, Entity $entity): Response
    {
        abort_if($entity->universe_id !== $universe->id, 404);

        $sectionIds = $entity->sections()->pluck('id');

        $revisions = \App\Models\Revision::query()
            ->where(function ($q) use ($entity, $sectionIds) {
                $q->where([
                    'revisionable_type' => $entity->getMorphClass(),
                    'revisionable_id'   => $entity->id,
                ])->orWhere(function ($q2) use ($sectionIds) {
                    $q2->where('revisionable_type', (new \App\Models\EntitySection())->getMorphClass())
                       ->whereIn('revisionable_id', $sectionIds);
                });
            })
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        $data = $revisions->map(fn (\App\Models\Revision $rev) => [
            'id'         => $rev->id,
            'action'     => $rev->action,
            'model_type' => class_basename($rev->revisionable_type),
            'old_values' => $rev->old_values,
            'new_values' => $rev->new_values,
            'created_at' => $rev->created_at->toIso8601String(),
            'user'       => $rev->user ? ['id' => $rev->user->id, 'name' => $rev->user->name] : null,
        ])->values()->all();

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/entity-history', [
            'universe'    => $this->universeProps($universe),
            'entity' => [
                'id'                => $entity->id,
                'name'              => $entity->name,
                'slug'              => $entity->slug,
                'short_description' => $entity->short_description,
                'is_locked'         => (bool) $entity->is_locked,
                'entity_type'       => $entity->entityType ? [
                    'slug' => $entity->entityType->slug,
                    'name' => $entity->entityType->name,
                ] : null,
            ],
            'revisions'   => $data,
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Full entity wiki page.
     */
    public function entity(Universe $universe, Entity $entity): Response
    {
        abort_if($entity->universe_id !== $universe->id, 404);

        $data = $entity->rememberCache('show', 1800, function () use ($entity) {
            $entity->load([
                'entityType', 'entityStatus', 'universe', 'aliases',
                'sections.children', 'sections.images',
                'attributes.definition', 'images',
                'outgoingRelations.toEntity.entityType',
                'outgoingRelations.toEntity.images',
                'outgoingRelations.relationType',
                'incomingRelations.fromEntity.entityType',
                'incomingRelations.fromEntity.images',
                'incomingRelations.relationType',
                'timelines', 'mediaSources', 'tags', 'categories',
                'infectionRecords.pathogen.entityType',
                'infectionRecords.cure.entityType',
                'mutationStages.triggerEntity.entityType',
                'affiliationHistory.organization.entityType',
                'quotes.sourceMedia',
                'powerProfiles.sourceEntity.entityType',
                'consciousnessRecords.vessel.entityType',
                'intelligenceRecords.observer.entityType',
                'intelligenceRecords.subject.entityType',
                'deathRecords.killer.entityType',
                'deathRecords.incident.entityType',
                'deathRecords.location.entityType',
                'deathRecords.revivedBy.entityType',
                'transmissionParticipants.participant.entityType',
                'transmissionRecords.speaker.entityType',
                'maps.floors.images',
            ]);

            return json_decode(json_encode(new EntityResource($entity)), true);
        });

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/entity', [
            'universe'    => $this->universeProps($universe),
            'entity' => $data,
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Entity map wiki page.
     */
    public function entityMap(Universe $universe, Entity $entity, Entity $map): Response
    {
        abort_if($entity->universe_id !== $universe->id, 404);

        // Verify the map entity is linked to the parent entity via has-map relation.
        $hasMapTypeId = \App\Models\MetaEntityRelationType::where('slug', 'has-map')->value('id');
        $isOwned = EntityRelation::where('from_entity_id', $entity->id)
            ->where('to_entity_id', $map->id)
            ->where('relation_type_id', $hasMapTypeId ?? 0)
            ->exists();
        abort_unless($isOwned, 404);

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/entity-map', [
            'universe'    => $this->universeProps($universe),
            'entity' => [
                'id'   => $entity->id,
                'name' => $entity->name,
                'slug' => $entity->slug,
            ],
            'map' => [
                'id'           => $map->id,
                'name'         => $map->name,
                'slug'         => $map->slug,
                'description'  => $map->short_description,
                'floors_count' => $map->floors()->count(),
            ],
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Timeline page.
     */
    public function timeline(Universe $universe, Timeline $timeline): Response
    {
        abort_if($timeline->universe_id !== $universe->id, 404);

        $timeline->load([
            'events.entity.entityType',
            'events.location.entityType',
            'events.participants.entity.entityType',
            'entities.entityType',
            'entities.entityStatus',
            'entities.images',
            'images',
        ]);

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/timeline', [
            'universe'    => $this->universeProps($universe),
            'timeline' => (new TimelineResource($timeline))->resolve(),
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Media source page.
     */
    public function mediaSource(Universe $universe, MediaSource $mediaSource): Response
    {
        abort_if($mediaSource->universe_id !== $universe->id, 404);

        $mediaSource->load([
            'entities.entityType',
            'entities.entityStatus',
            'entities.images',
            'images',
            'tags',
        ]);

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/media-source', [
            'universe'    => $this->universeProps($universe),
            'mediaSource' => (new MediaSourceResource($mediaSource))->resolve(),
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Category page.
     */
    public function category(Request $request, Universe $universe, Category $category): Response
    {
        abort_if($category->universe_id !== $universe->id, 404);

        $category->load('children');

        $entities = Entity::query()
            ->where('universe_id', $universe->id)
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->whereHas('categories', fn ($q) => $q->where('categories.id', $category->id))
            ->orderBy('name')
            ->paginate($request->input('per_page', 24))
            ->withQueryString();

        $sidebarTree = $this->getSidebarTree($universe);

        return Inertia::render('wiki/category', [
            'universe'    => $this->universeProps($universe),
            'category' => (new CategoryResource($category))->resolve(),
            'entities' => EntitySummaryResource::collection($entities)->response()->getData(true),
            'sidebarTree' => $sidebarTree,
        ]);
    }

    /**
     * Search results page.
     */
    public function search(Request $request): Response
    {
        $query = $request->input('q', '');
        $universeSlug = $request->input('universe');
        $typeSlug = $request->input('type');
        $perPage = min((int) $request->input('per_page', 24), 100);

        $universes = Universe::orderBy('name')->get(['id', 'name', 'slug']);
        $entityTypes = MetaEntityType::orderBy('name')->get(['id', 'name', 'slug', 'icon', 'color']);

        $entities = collect();
        $pagination = null;

        if ($query) {
            $builder = Entity::query()
                ->with(['entityType', 'entityStatus', 'images', 'tags', 'universe'])
                ->where(function ($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('short_description', 'like', "%{$query}%")
                      ->orWhereHas('aliases', fn ($q) => $q->where('alias', 'like', "%{$query}%"));
                })
                ->when($universeSlug, fn ($q) => $q->whereHas('universe', fn ($q) => $q->where('slug', $universeSlug)))
                ->when($typeSlug, fn ($q) => $q->whereHas('entityType', fn ($q) => $q->where('slug', $typeSlug)))
                ->orderBy('name');

            $paginated = $builder->paginate($perPage)->withQueryString();
            $pagination = EntitySummaryResource::collection($paginated)->response()->getData(true);
        }

        return Inertia::render('wiki/search', [
            'query' => $query,
            'selectedUniverse' => $universeSlug,
            'selectedType' => $typeSlug,
            'results' => $pagination,
            'universes' => $universes->toArray(),
            'entityTypes' => $entityTypes->toArray(),
        ]);
    }

    /**
     * Changelog  recent revisions from the Revision model.
     */
    public function changelog(Request $request): Response
    {
        $revisions = Revision::query()
            ->with(['user', 'revisionable.universe', 'revisionable.entity.universe'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 30))
            ->withQueryString();

        $items = $revisions->through(function (Revision $rev) {
            $model = $rev->revisionable;
            $entityName = null;
            $entitySlug = null;
            $universeSlug = null;
            $modelType = class_basename($rev->revisionable_type);

            if ($model instanceof Entity) {
                $entityName = $model->name;
                $entitySlug = $model->slug;
                $universeSlug = $model->universe?->slug;
            } elseif ($model && method_exists($model, 'entity')) {
                $entity = $model->entity;
                if ($entity) {
                    $entityName = $entity->name;
                    $entitySlug = $entity->slug;
                    $universeSlug = $entity->universe?->slug;
                }
            }

            return [
                'id' => $rev->id,
                'action' => $rev->action,
                'model_type' => $modelType,
                'entity_id' => $model instanceof Entity ? $model->id : ($model && method_exists($model, 'entity') ? $model->entity?->id : null),
                'universe_id' => $model instanceof Entity ? $model->universe?->id : ($model && method_exists($model, 'entity') ? $model->entity?->universe?->id : null),
                'entity_name' => $entityName,
                'entity_slug' => $entitySlug,
                'universe_slug' => $universeSlug,
                'user_name' => $rev->user?->name,
                'created_at' => $rev->created_at->toIso8601String(),
                'changes_count' => is_array($rev->new_values) ? count($rev->new_values) : 0,
            ];
        });

        return Inertia::render('wiki/changelog', [
            'revisions' => $items,
        ]);
    }

    /**
     * Get sidebar tree data for a universe (cached).
     */
    private function getSidebarTree(Universe $universe): array
    {
        return UniverseService::universeTree($universe);
    }
}
