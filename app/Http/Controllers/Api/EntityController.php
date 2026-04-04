<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEntityRequest;
use App\Http\Requests\Api\UpdateEntityRequest;
use App\Http\Resources\EntityGraphResource;
use App\Http\Resources\EntityResource;
use App\Http\Resources\EntitySummaryResource;
use App\Models\Entity;
use App\Models\EntitySection;
use App\Models\Revision;
use App\Models\Universe;
use App\Services\RevisionRollbackService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EntityController extends Controller
{
    public function index(Request $request, Universe $universe): AnonymousResourceCollection
    {
        $entities = $universe->entities()
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->when($request->input('search'), function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('short_description', 'like', "%{$search}%")
                      ->orWhereHas('aliases', fn ($q) => $q->where('alias', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('type'), fn ($q, $type) => $q->whereHas('entityType', fn ($q) => $q->where('slug', $type)))
            ->when($request->input('status'), fn ($q, $status) => $q->whereHas('entityStatus', fn ($q) => $q->where('slug', $status)))
            ->when($request->input('tag'), fn ($q, $tag) => $q->whereHas('tags', fn ($q) => $q->where('slug', $tag)))
            ->when($request->input('category'), fn ($q, $cat) => $q->whereHas('categories', fn ($q) => $q->where('slug', $cat)))
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->orderBy($request->input('sort', 'name'), $request->input('direction', 'asc'))
            ->paginate($request->input('per_page', 15));

        return EntitySummaryResource::collection($entities);
    }

    public function store(StoreEntityRequest $request, Universe $universe): EntityResource
    {
        $data = $request->validated();
        $data['universe_id'] = $universe->id;
        $aliases = $data['aliases'] ?? [];
        unset($data['aliases']);

        $entity = Entity::create($data);

        foreach ($aliases as $alias) {
            $entity->aliases()->create($alias);
        }

        $entity->load(['entityType', 'entityStatus', 'aliases']);

        return new EntityResource($entity);
    }

    public function show(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        // Cache a plain PHP array, not an Eloquent model instance.
        // json_encode() on a JsonResource triggers its JsonSerializable interface,
        // which recursively resolves all nested resources to scalars/arrays.
        // json_decode(..., true) converts the result to a plain associative array
        // that any cache driver can safely serialize without needing class autoloading.
        $data = $entity->rememberCache('show', 1800, function () use ($entity) {
            $entity->load([
                'entityType',
                'entityStatus',
                'universe',
                'aliases',
                'sections.children',
                'sections.images',
                'attributes.definition',
                'images',
                'outgoingRelations.toEntity.entityType',
                'outgoingRelations.relationType',
                'incomingRelations.fromEntity.entityType',
                'incomingRelations.relationType',
                'timelines',
                'mediaSources',
                'tags',
                'categories',
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

        return response()->json(['data' => $data]);
    }

    public function update(UpdateEntityRequest $request, Universe $universe, Entity $entity): EntityResource
    {
        $data = $request->validated();

        // Handle tags sync if provided
        if ($request->has('tag_ids')) {
            $entity->tags()->sync($request->input('tag_ids', []));
            unset($data['tag_ids']);
        }

        // Handle categories sync if provided
        if ($request->has('category_ids')) {
            $entity->categories()->sync($request->input('category_ids', []));
            unset($data['category_ids']);
        }

        // Handle aliases sync if provided
        if ($request->has('aliases')) {
            $entity->aliases()->delete();
            foreach ($request->input('aliases', []) as $alias) {
                $entity->aliases()->create($alias);
            }
            unset($data['aliases']);
        }

        $entity->update($data);
        $entity->load(['entityType', 'entityStatus', 'aliases', 'tags', 'categories']);

        return new EntityResource($entity);
    }

    public function destroy(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $entity->delete();

        return response()->json(null, 204);
    }

    public function toggleLock(Universe $universe, Entity $entity): EntityResource
    {
        $entity->update(['is_locked' => ! $entity->is_locked]);
        $entity->load(['entityType', 'entityStatus']);

        return new EntityResource($entity);
    }

    /**
     * Lightweight entity preview - name, slug, type, status, profile thumbnail.
     * Cached for 1 hour. Used by the wiki hover-card feature.
     */
    public function preview(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        // $data = \Illuminate\Support\Facades\Cache::remember(
        //     "entity_preview:{$entity->id}",
        //     3600,
        //     function () use ($entity) {
        //         $entity->loadMissing(['entityType', 'entityStatus', 'images']);
        //         $profile = $entity->images->firstWhere('type', 'profile');

        //         return [
        //             'id'                => $entity->id,
        //             'name'              => $entity->name,
        //             'slug'              => $entity->slug,
        //             'short_description' => $entity->short_description,
        //             'entity_type'       => $entity->entityType ? [
        //                 'id'   => $entity->entityType->id,
        //                 'name' => $entity->entityType->name,
        //                 'slug' => $entity->entityType->slug,
        //             ] : null,
        //             'entity_status' => $entity->entityStatus ? [
        //                 'id'    => $entity->entityStatus->id,
        //                 'name'  => $entity->entityStatus->name,
        //                 'color' => $entity->entityStatus->color,
        //             ] : null,
        //             'profile_image' => $profile?->thumbnail_url,
        //         ];
        //     }
        // );
        $data = $entity->rememberCache('preview', 3600, function () use ($entity) {
            $entity->loadMissing(['entityType', 'entityStatus', 'images']);
            $profile = $entity->images->firstWhere('type', 'profile');

            return [
                'id'                => $entity->id,
                'name'              => $entity->name,
                'slug'              => $entity->slug,
                'short_description' => $entity->short_description,
                'entity_type'       => $entity->entityType ? [
                    'id'   => $entity->entityType->id,
                    'name' => $entity->entityType->name,
                    'slug' => $entity->entityType->slug,
                ] : null,
                'entity_status' => $entity->entityStatus ? [
                    'id'    => $entity->entityStatus->id,
                    'name'  => $entity->entityStatus->name,
                    'color' => $entity->entityStatus->color,
                ] : null,
                'profile_image' => $profile?->thumbnail_url,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function revisions(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $sectionIds = $entity->sections()->pluck('id');

        $revisions = Revision::query()
            ->where(function ($q) use ($entity, $sectionIds) {
                $q->where([
                    'revisionable_type' => $entity->getMorphClass(),
                    'revisionable_id'   => $entity->id,
                ])->orWhere(function ($q2) use ($sectionIds) {
                    $q2->where('revisionable_type', (new EntitySection())->getMorphClass())
                       ->whereIn('revisionable_id', $sectionIds);
                });
            })
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        $data = $revisions->map(fn (Revision $rev) => [
            'id'          => $rev->id,
            'action'      => $rev->action,
            'model_type'  => class_basename($rev->revisionable_type),
            'old_values'  => $rev->old_values,
            'new_values'  => $rev->new_values,
            'created_at'  => $rev->created_at->toIso8601String(),
            'user'        => $rev->user ? ['id' => $rev->user->id, 'name' => $rev->user->name] : null,
        ]);

        return response()->json(['data' => $data]);
    }

    public function relations(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $outgoing = $entity->outgoingRelations()
            ->with(['toEntity.entityType', 'relationType'])
            ->orderBy('sort_order')
            ->get();

        $incoming = $entity->incomingRelations()
            ->with(['fromEntity.entityType', 'relationType'])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'outgoing' => \App\Http\Resources\EntityRelationResource::collection($outgoing),
            'incoming' => \App\Http\Resources\EntityRelationResource::collection($incoming),
        ]);
    }

    public function infectionRecords(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->infectionRecords()
            ->with(['pathogen.entityType', 'cure.entityType'])
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityInfectionRecordResource::collection($records);
    }

    public function mutationStages(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $stages = $entity->mutationStages()
            ->with('triggerEntity.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityMutationStageResource::collection($stages);
    }

    public function affiliationHistory(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $history = $entity->affiliationHistory()
            ->with('organization.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityAffiliationHistoryResource::collection($history);
    }

    public function quotes(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $quotes = $entity->quotes()
            ->with('sourceMedia')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityQuoteResource::collection($quotes);
    }

    public function powerProfiles(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $profiles = $entity->powerProfiles()
            ->with('sourceEntity.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityPowerProfileResource::collection($profiles);
    }

    public function consciousnessRecords(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->consciousnessRecords()
            ->with('vessel.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityConsciousnessRecordResource::collection($records);
    }

    public function intelligenceRecords(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->intelligenceRecords()
            ->with(['observer.entityType', 'subject.entityType'])
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityIntelligenceRecordResource::collection($records);
    }

    public function deathRecords(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->deathRecords()
            ->with(['killer.entityType', 'incident.entityType', 'location.entityType', 'revivedBy.entityType'])
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityDeathRecordResource::collection($records);
    }

    public function transmissionParticipants(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->transmissionParticipants()
            ->with('participant.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityTransmissionRelationResource::collection($records);
    }

    public function transmissionRecords(Universe $universe, Entity $entity): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $records = $entity->transmissionRecords()
            ->with('speaker.entityType')
            ->orderBy('sort_order')
            ->get();

        return \App\Http\Resources\EntityTransmissionRecordResource::collection($records);
    }

    /**
     * Minimal graph payload  only id/slug/name/entity_type + both relation lists.
     * Much lighter than entity.show which loads 30+ nested relations.
     * Cached with a separate 'graph' context key so show() and graphData() invalidate independently.
     */
    public function graphData(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $data = $entity->rememberCache('graph', 1800, function () use ($entity) {
            $entity->load([
                'entityType',
                'images',
                'outgoingRelations.toEntity.entityType',
                'outgoingRelations.toEntity.images',
                'outgoingRelations.relationType',
                'incomingRelations.fromEntity.entityType',
                'incomingRelations.fromEntity.images',
                'incomingRelations.relationType',
            ]);

            return json_decode(json_encode(new EntityGraphResource($entity)), true);
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Roll back a specific revision for an entity or one of its sections.
     * Requires auth + entities.rollback permission (enforced via route middleware).
     */
    public function rollback(
        Universe $universe,
        Entity $entity,
        Revision $revision,
        RevisionRollbackService $service
    ): \Illuminate\Http\JsonResponse {
        $service->rollback($entity, $revision);

        $entity->load(['entityType', 'entityStatus']);

        return response()->json([
            'message' => 'Revision rolled back successfully.',
            'entity'  => [
                'id'   => $entity->id,
                'name' => $entity->name,
                'slug' => $entity->slug,
            ],
        ]);
    }

    /**
     * Restore a soft-deleted entity.
     * Requires auth + entities.rollback permission (enforced via route middleware).
     */
    public function restore(
        Request $request,
        Universe $universe,
        int $entityId,
        RevisionRollbackService $service
    ): \Illuminate\Http\JsonResponse {
        $entity = $service->restore($universe, $entityId);

        return response()->json([
            'message' => 'Entity restored successfully.',
            'entity'  => [
                'id'            => $entity->id,
                'name'          => $entity->name,
                'slug'          => $entity->slug,
                'universe_slug' => $universe->slug,
            ],
        ]);
    }

    /**
     * Return entities that share at least one tag with the given entity.
     * Result is grouped by tag: { tag_slug: { tag: {...}, entities: [...] } }
     * Up to 8 entities per tag are returned, excluding the entity itself.
     * Cached for 30 minutes; cache is busted by BustsEntityCache on the entity.
     */
    public function relatedByTag(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        abort_if($entity->universe_id !== $universe->id, 404);

        $data = $entity->rememberCache('related-tags', 1800, function () use ($entity, $universe) {
            $tags = $entity->tags()->get(['tags.id', 'tags.name', 'tags.slug', 'tags.color']);

            if ($tags->isEmpty()) {
                return [];
            }

            $result = [];

            foreach ($tags as $tag) {
                $related = $universe->entities()
                    ->with(['entityType', 'images'])
                    ->whereHas('tags', fn ($q) => $q->where('tags.id', $tag->id))
                    ->where('entities.id', '!=', $entity->id)
                    ->orderBy('name')
                    ->limit(20)
                    ->get();

                if ($related->isEmpty()) {
                    continue;
                }

                $result[$tag->slug] = [
                    'tag'      => [
                        'id'    => $tag->id,
                        'name'  => $tag->name,
                        'slug'  => $tag->slug,
                        'color' => $tag->color,
                    ],
                    'entities' => \App\Http\Resources\EntityTinyResource::collection($related)->resolve(),
                ];
            }

            return $result;
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Return all location-type entities in the universe that have
     * both a latitude and longitude attribute set.
     * Used by the operations map for entity pin rendering.
     */
    public function entityLocations(Universe $universe): \Illuminate\Http\JsonResponse
    {
        $data = $universe->rememberCache('entity-locations', 1800, function () use ($universe) {
            $entities = $universe->entities()
                ->with(['entityType', 'entityStatus', 'attributes.definition'])
                ->whereHas('entityType', fn ($q) => $q->where('slug', 'location'))
                ->get();

            return $entities->map(function ($entity) {
                $lat = $entity->attributes->first(fn ($a) => $a->definition?->slug === 'latitude');
                $lng = $entity->attributes->first(fn ($a) => $a->definition?->slug === 'longitude');

                if (! $lat?->value || ! $lng?->value) {
                    return null;
                }

                return [
                    'id'                => $entity->id,
                    'universe_id'       => $entity->universe_id,
                    'name'              => $entity->name,
                    'slug'              => $entity->slug,
                    'short_description' => $entity->short_description,
                    'entity_type'       => $entity->entityType?->name,
                    'entity_type_slug'  => $entity->entityType?->slug,
                    'entity_status'     => $entity->entityStatus?->name,
                    'entity_status_slug'=> $entity->entityStatus?->slug,
                    'latitude'          => (float) $lat->value,
                    'longitude'         => (float) $lng->value,
                ];
            })->filter()->values()->all();
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Event Reconstruction — returns all Entity type=event sub-events
     * that are related to the given incident entity via 'part-of'.
     */
    public function reconstruction(Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $partOfType = \App\Models\MetaEntityRelationType::where('slug', 'part-of')->first();
        $participatedInType = \App\Models\MetaEntityRelationType::where('slug', 'participated-in')->first();

        // Find all event entities that have outgoing 'part-of' relation to this incident
        $eventEntities = Entity::whereHas('outgoingRelations', function ($q) use ($entity, $partOfType) {
            $q->where('to_entity_id', $entity->id)
              ->where('relation_type_id', $partOfType?->id);
        })
        ->with([
            'entityType',
            'entityStatus',
            'images',
            'sections.children',
            'sections.images',
            'attributes.definition',
            'outgoingRelations.toEntity.entityType',
            'outgoingRelations.relationType',
            'incomingRelations.fromEntity.entityType',
            'incomingRelations.relationType',
            'intelligenceRecords.observer.entityType',
            'intelligenceRecords.subject.entityType',
        ])
        ->orderBy('name')
        ->get();

        // Group by phase attribute
        $phases = [];
        $allParticipantIds = collect();

        foreach ($eventEntities as $evt) {
            $phaseAttr = $evt->attributes->first(fn ($a) => $a->definition?->slug === 'phase');
            $phaseName = $phaseAttr?->value ?? 'Unclassified';
            $dateAttr  = $evt->attributes->first(fn ($a) => $a->definition?->slug === 'date');

            if (! isset($phases[$phaseName])) {
                $phases[$phaseName] = [];
            }
            $phases[$phaseName][] = [
                'event'     => $evt,
                'date_sort' => $dateAttr?->value ?? '9999',
            ];

            // Collect unique participant entity IDs from incoming 'participated-in' relations
            $participants = $evt->incomingRelations
                ->where('relation_type_id', $participatedInType?->id);
            foreach ($participants as $rel) {
                $allParticipantIds->push($rel->from_entity_id);
            }
        }

        // Sort events within each phase by date, then build response
        $phaseList = [];
        foreach ($phases as $name => $items) {
            usort($items, fn ($a, $b) => strcmp($a['date_sort'], $b['date_sort']));
            $phaseList[] = [
                'name'   => $name,
                'events' => array_map(
                    fn ($item) => json_decode(json_encode(new EntityResource($item['event'])), true),
                    $items
                ),
            ];
        }

        // Build entity roster (unique participants)
        $uniqueIds = $allParticipantIds->unique()->values();
        $roster = Entity::whereIn('id', $uniqueIds)
            ->with(['entityType', 'entityStatus', 'images'])
            ->get();

        $incidentData = json_decode(json_encode(new EntityResource($entity->load([
            'entityType', 'entityStatus', 'images', 'attributes.definition',
        ]))), true);

        return response()->json([
            'data' => [
                'incident' => $incidentData,
                'phases'   => $phaseList,
                'entities' => EntitySummaryResource::collection($roster)->resolve(),
            ],
        ]);
    }
}
