<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttributeDefinitionResource;
use App\Http\Resources\MetaEntityRelationTypeResource;
use App\Http\Resources\MetaEntityStatusResource;
use App\Http\Resources\MetaEntityTypeResource;
use App\Models\AttributeDefinition;
use App\Models\MetaEntityRelationType;
use App\Models\MetaEntityStatus;
use App\Models\MetaEntityType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MetaController extends Controller
{
    public function entityTypes(): AnonymousResourceCollection
    {
        return MetaEntityTypeResource::collection(MetaEntityType::orderBy('name')->get());
    }

    public function storeEntityType(Request $request): MetaEntityTypeResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:meta_entity_types,name'],
            'slug' => ['required', 'string', 'max:255', 'unique:meta_entity_types,slug'],
            'description' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'schema' => ['nullable', 'array'],
        ]);

        return new MetaEntityTypeResource(MetaEntityType::create($validated));
    }

    public function updateEntityType(Request $request, MetaEntityType $entityType): MetaEntityTypeResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_types,name,' . $entityType->id],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_types,slug,' . $entityType->id],
            'description' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'schema' => ['nullable', 'array'],
        ]);

        $entityType->update($validated);

        return new MetaEntityTypeResource($entityType);
    }

    public function destroyEntityType(MetaEntityType $entityType): \Illuminate\Http\JsonResponse
    {
        $entityType->delete();

        return response()->json(null, 204);
    }

    public function entityStatuses(): AnonymousResourceCollection
    {
        return MetaEntityStatusResource::collection(MetaEntityStatus::orderBy('name')->get());
    }

    public function storeEntityStatus(Request $request): MetaEntityStatusResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:meta_entity_statuses,name'],
            'slug' => ['required', 'string', 'max:255', 'unique:meta_entity_statuses,slug'],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        return new MetaEntityStatusResource(MetaEntityStatus::create($validated));
    }

    public function updateEntityStatus(Request $request, MetaEntityStatus $entityStatus): MetaEntityStatusResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_statuses,name,' . $entityStatus->id],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_statuses,slug,' . $entityStatus->id],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $entityStatus->update($validated);

        return new MetaEntityStatusResource($entityStatus);
    }

    public function destroyEntityStatus(MetaEntityStatus $entityStatus): \Illuminate\Http\JsonResponse
    {
        $entityStatus->delete();

        return response()->json(null, 204);
    }

    public function relationTypes(): AnonymousResourceCollection
    {
        return MetaEntityRelationTypeResource::collection(MetaEntityRelationType::orderBy('name')->get());
    }

    public function storeRelationType(Request $request): MetaEntityRelationTypeResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:meta_entity_relation_types,name'],
            'slug' => ['required', 'string', 'max:255', 'unique:meta_entity_relation_types,slug'],
            'description' => ['nullable', 'string', 'max:255'],
            'inverse_name' => ['nullable', 'string', 'max:255'],
            'is_directional' => ['nullable', 'boolean'],
        ]);

        return new MetaEntityRelationTypeResource(MetaEntityRelationType::create($validated));
    }

    public function updateRelationType(Request $request, MetaEntityRelationType $relationType): MetaEntityRelationTypeResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_relation_types,name,' . $relationType->id],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:meta_entity_relation_types,slug,' . $relationType->id],
            'description' => ['nullable', 'string', 'max:255'],
            'inverse_name' => ['nullable', 'string', 'max:255'],
            'is_directional' => ['nullable', 'boolean'],
        ]);

        $relationType->update($validated);

        return new MetaEntityRelationTypeResource($relationType);
    }

    public function destroyRelationType(MetaEntityRelationType $relationType): \Illuminate\Http\JsonResponse
    {
        $relationType->delete();

        return response()->json(null, 204);
    }

    public function attributeDefinitions(Request $request): AnonymousResourceCollection
    {
        $definitions = AttributeDefinition::query()
            ->with('entityType')
            ->when($request->input('entity_type_id'), fn ($q, $id) => $q->where('meta_entity_type_id', $id)->orWhereNull('meta_entity_type_id'))
            ->orderBy('sort_order')
            ->get();

        return AttributeDefinitionResource::collection($definitions);
    }

    public function storeAttributeDefinition(Request $request): AttributeDefinitionResource
    {
        $validated = $request->validate([
            'meta_entity_type_id' => ['nullable', 'exists:meta_entity_types,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255'],
            'data_type' => ['required', 'string', 'in:string,integer,float,boolean,date,json,entity_reference'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'is_filterable' => ['nullable', 'boolean'],
            'is_required' => ['nullable', 'boolean'],
            'default_value' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $definition = AttributeDefinition::create($validated);
        $definition->load('entityType');

        return new AttributeDefinitionResource($definition);
    }

    public function updateAttributeDefinition(Request $request, AttributeDefinition $attributeDefinition): AttributeDefinitionResource
    {
        $validated = $request->validate([
            'meta_entity_type_id' => ['nullable', 'exists:meta_entity_types,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'data_type' => ['sometimes', 'string', 'in:string,integer,float,boolean,date,json,entity_reference'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'is_filterable' => ['nullable', 'boolean'],
            'is_required' => ['nullable', 'boolean'],
            'default_value' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $attributeDefinition->update($validated);
        $attributeDefinition->load('entityType');

        return new AttributeDefinitionResource($attributeDefinition);
    }

    public function destroyAttributeDefinition(AttributeDefinition $attributeDefinition): \Illuminate\Http\JsonResponse
    {
        $attributeDefinition->delete();

        return response()->json(null, 204);
    }
}
