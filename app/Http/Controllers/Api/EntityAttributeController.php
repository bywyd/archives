<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EntityAttributeResource;
use App\Models\Entity;
use App\Models\EntityAttribute;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EntityAttributeController extends Controller
{
    public function index(Universe $universe, Entity $entity): AnonymousResourceCollection
    {
        $attributes = $entity->attributes()
            ->with('definition')
            ->get();

        return EntityAttributeResource::collection($attributes);
    }

    public function store(Request $request, Universe $universe, Entity $entity): EntityAttributeResource
    {
        $validated = $request->validate([
            'attribute_definition_id' => ['required', 'exists:attribute_definitions,id'],
            'value' => ['required', 'string'],
        ]);

        $validated['entity_id'] = $entity->id;

        $attribute = EntityAttribute::updateOrCreate(
            [
                'entity_id' => $entity->id,
                'attribute_definition_id' => $validated['attribute_definition_id'],
            ],
            ['value' => $validated['value']]
        );

        $attribute->load('definition');

        return new EntityAttributeResource($attribute);
    }

    public function bulkUpdate(Request $request, Universe $universe, Entity $entity): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'attributes' => ['required', 'array'],
            'attributes.*.attribute_definition_id' => ['required', 'exists:attribute_definitions,id'],
            'attributes.*.value' => ['required', 'string'],
        ]);

        foreach ($validated['attributes'] as $attr) {
            EntityAttribute::updateOrCreate(
                [
                    'entity_id' => $entity->id,
                    'attribute_definition_id' => $attr['attribute_definition_id'],
                ],
                ['value' => $attr['value']]
            );
        }

        $attributes = $entity->attributes()->with('definition')->get();

        return EntityAttributeResource::collection($attributes);
    }

    public function destroy(Universe $universe, Entity $entity, EntityAttribute $attribute): \Illuminate\Http\JsonResponse
    {
        $attribute->delete();

        return response()->json(null, 204);
    }
}
