<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEntityRelationRequest;
use App\Http\Resources\EntityRelationResource;
use App\Models\EntityRelation;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EntityRelationController extends Controller
{
    public function index(Request $request, Universe $universe): AnonymousResourceCollection
    {
        $relations = EntityRelation::query()
            ->whereHas('fromEntity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['fromEntity.entityType', 'toEntity.entityType', 'relationType'])
            ->when($request->input('type'), fn ($q, $type) => $q->whereHas('relationType', fn ($q) => $q->where('slug', $type)))
            ->when($request->input('entity_id'), function ($q, $entityId) {
                $q->where(fn ($q) => $q->where('from_entity_id', $entityId)->orWhere('to_entity_id', $entityId));
            })
            ->orderBy('sort_order')
            ->paginate($request->input('per_page', 15));

        return EntityRelationResource::collection($relations);
    }

    public function store(StoreEntityRelationRequest $request, Universe $universe): EntityRelationResource
    {
        $relation = EntityRelation::create($request->validated());
        $relation->load(['fromEntity.entityType', 'toEntity.entityType', 'relationType']);

        return new EntityRelationResource($relation);
    }

    public function show(Universe $universe, EntityRelation $relation): EntityRelationResource
    {
        $relation->load(['fromEntity.entityType', 'toEntity.entityType', 'relationType']);

        return new EntityRelationResource($relation);
    }

    public function update(Request $request, Universe $universe, EntityRelation $relation): EntityRelationResource
    {
        $validated = $request->validate([
            'relation_type_id' => ['sometimes', 'exists:meta_entity_relation_types,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'context' => ['nullable', 'string'],
            'fictional_start' => ['nullable', 'string', 'max:255'],
            'fictional_end' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,former,unknown'],
            'metadata' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $relation->update($validated);
        $relation->load(['fromEntity.entityType', 'toEntity.entityType', 'relationType']);

        return new EntityRelationResource($relation);
    }

    public function destroy(Universe $universe, EntityRelation $relation): \Illuminate\Http\JsonResponse
    {
        $relation->delete();

        return response()->json(null, 204);
    }
}
