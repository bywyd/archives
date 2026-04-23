<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEntitySectionRequest;
use App\Http\Resources\EntitySectionResource;
use App\Models\Entity;
use App\Models\EntitySection;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EntitySectionController extends Controller
{
    public function index(Universe $universe, Entity $entity): AnonymousResourceCollection
    {
        $sections = $entity->sections()
            ->whereNull('parent_id')
            ->with([
                'images',
                'children.images',
                'children.children.images',
                'children.children.children.images',
            ])
            ->orderBy('sort_order')
            ->get();

        return EntitySectionResource::collection($sections);
    }

    public function store(StoreEntitySectionRequest $request, Universe $universe, Entity $entity): EntitySectionResource
    {
        $data = $request->validated();
        $data['entity_id'] = $entity->id;

        $section = EntitySection::create($data);
        $section->load([
            'images',
            'children.images',
            'children.children.images',
        ]);

        return new EntitySectionResource($section);
    }

    public function show(Universe $universe, Entity $entity, EntitySection $section): EntitySectionResource
    {
        $section->load([
            'images',
            'children.images',
            'children.children.images',
            'children.children.children.images',
        ]);

        return new EntitySectionResource($section);
    }

    public function update(Request $request, Universe $universe, Entity $entity, EntitySection $section): EntitySectionResource
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'is_collapsible' => ['nullable', 'boolean'],
            'parent_id' => ['nullable', 'exists:entity_sections,id'],
        ]);

        $section->update($validated);
        $section->load([
            'images',
            'children.images',
            'children.children.images',
            'children.children.children.images',
        ]);

        return new EntitySectionResource($section);
    }

    public function destroy(Universe $universe, Entity $entity, EntitySection $section): \Illuminate\Http\JsonResponse
    {
        $section->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, Universe $universe, Entity $entity): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'sections' => ['required', 'array'],
            'sections.*.id' => ['required', 'exists:entity_sections,id'],
            'sections.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($validated['sections'] as $item) {
            EntitySection::where('id', $item['id'])
                ->where('entity_id', $entity->id)
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Sections reordered']);
    }
}
