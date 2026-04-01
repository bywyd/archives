<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EntityMapFloorResource;
use App\Http\Resources\EntityMapMarkerResource;
use App\Http\Resources\EntityMapRegionResource;
use App\Http\Resources\EntityMapResource;
use App\Models\Entity;
use App\Models\EntityMapFloor;
use App\Models\EntityMapMarker;
use App\Models\EntityMapRegion;
use App\Models\EntityRelation;
use App\Models\MetaEntityRelationType;
use App\Models\MetaEntityStatus;
use App\Models\MetaEntityType;
use App\Models\Universe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MapController extends Controller
{
    //  Ownership helper 

    /**
     * Abort 404 if $map is not linked to $entity by a has-map relation.
     */
    private function validateMapOwnership(Entity $entity, Entity $map): void
    {
        $hasMapTypeId = MetaEntityRelationType::where('slug', 'has-map')->value('id');
        $exists = EntityRelation::where('from_entity_id', $entity->id)
            ->where('to_entity_id', $map->id)
            ->where('relation_type_id', $hasMapTypeId ?? 0)
            ->exists();
        abort_unless($exists, 404);
    }

    //  Maps 

    public function index(Universe $universe, Entity $entity): AnonymousResourceCollection
    {
        $maps = $entity->maps()
            ->withCount('floors')
            ->get()
            ->sortBy(fn ($m) => $m->metadata['sort_order'] ?? 0)
            ->values();

        return EntityMapResource::collection($maps);
    }

    public function show(Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        $data = $map->rememberCache('map', 1800, function () use ($map) {
            $map->load([
                'floors.images',
                'floors.markers.entity.entityType',
                'floors.regions.entity.entityType',
            ]);

            return json_decode(json_encode(new EntityMapResource($map)), true);
        });

        return response()->json(['data' => $data]);
    }

    public function store(Request $request, Universe $universe, Entity $entity): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'slug'        => ['nullable', 'string', 'max:255', Rule::unique('entities', 'slug')->where('universe_id', $entity->universe_id)],
            'description' => ['nullable', 'string', 'max:5000'],
            'metadata'    => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order'  => ['nullable', 'integer'],
        ]);

        $slug = $data['slug'] ?? null;
        if (empty($slug)) {
            $slug = Str::slug($data['name']);
            // Prefix with parent slug if the slug is already taken in this universe.
            if (Entity::where('universe_id', $entity->universe_id)->where('slug', $slug)->exists()) {
                $slug = Str::slug($entity->slug . '-' . $data['name']);
            }
        }

        $metadata = $data['metadata'] ?? [];
        $metadata['sort_order'] = $data['sort_order'] ?? 0;

        $mapTypeId = MetaEntityType::where('slug', 'map')->value('id');

        $map = Entity::create([
            'universe_id'       => $entity->universe_id,
            'entity_type_id'    => $mapTypeId,
            'entity_status_id'  => MetaEntityStatus::where('slug', 'active')->value('id'),
            'name'              => $data['name'],
            'slug'              => $slug,
            'short_description' => $data['description'] ?? null,
            'metadata'          => $metadata,
            'is_featured'       => $data['is_featured'] ?? false,
            'is_locked'         => false,
        ]);

        $hasMapTypeId = MetaEntityRelationType::where('slug', 'has-map')->value('id');
        EntityRelation::create([
            'from_entity_id'   => $entity->id,
            'to_entity_id'     => $map->id,
            'relation_type_id' => $hasMapTypeId,
        ]);

        $map->load('floors');

        return response()->json([
            'data' => new EntityMapResource($map),
        ], 201);
    }

    public function update(Request $request, Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'slug'        => ['sometimes', 'string', 'max:255', Rule::unique('entities', 'slug')->where('universe_id', $map->universe_id)->ignore($map->id)],
            'description' => ['nullable', 'string', 'max:5000'],
            'metadata'    => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order'  => ['nullable', 'integer'],
        ]);

        $update = [];
        if (isset($data['name']))        $update['name']              = $data['name'];
        if (isset($data['slug']))        $update['slug']              = $data['slug'];
        if (array_key_exists('description', $data)) $update['short_description'] = $data['description'];
        if (isset($data['is_featured'])) $update['is_featured']       = $data['is_featured'];

        if (isset($data['sort_order']) || isset($data['metadata'])) {
            $metadata = $map->metadata ?? [];
            if (isset($data['metadata']))   $metadata = array_merge($metadata, $data['metadata']);
            if (isset($data['sort_order'])) $metadata['sort_order'] = $data['sort_order'];
            $update['metadata'] = $metadata;
        }

        $map->update($update);
        $map->load('floors');

        return response()->json([
            'data' => new EntityMapResource($map),
        ]);
    }

    public function destroy(Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        // Remove the has-map relation first, then delete the map entity (cascades to floors/markers/regions).
        $hasMapTypeId = MetaEntityRelationType::where('slug', 'has-map')->value('id');
        EntityRelation::where('from_entity_id', $entity->id)
            ->where('to_entity_id', $map->id)
            ->where('relation_type_id', $hasMapTypeId ?? 0)
            ->delete();

        $map->delete();

        return response()->json(null, 204);
    }

    //  Floors 

    public function storeFloor(Request $request, Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'slug'         => ['nullable', 'string', 'max:255', Rule::unique('entity_map_floors')->where('entity_id', $map->id)],
            'floor_number' => ['nullable', 'integer'],
            'image_width'  => ['nullable', 'integer', 'min:1'],
            'image_height' => ['nullable', 'integer', 'min:1'],
            'sort_order'   => ['nullable', 'integer'],
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $data['entity_id'] = $map->id;

        $floor = EntityMapFloor::create($data);
        $floor->load(['images', 'markers', 'regions']);

        return response()->json([
            'data' => new EntityMapFloorResource($floor),
        ], 201);
    }

    public function updateFloor(Request $request, Universe $universe, Entity $entity, Entity $map, EntityMapFloor $floor): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        abort_unless($floor->entity_id === $map->id, 404);

        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:255'],
            'slug'         => ['sometimes', 'string', 'max:255', Rule::unique('entity_map_floors')->where('entity_id', $map->id)->ignore($floor->id)],
            'floor_number' => ['nullable', 'integer'],
            'image_width'  => ['nullable', 'integer', 'min:1'],
            'image_height' => ['nullable', 'integer', 'min:1'],
            'sort_order'   => ['nullable', 'integer'],
        ]);

        $floor->update($data);
        $floor->load(['images', 'markers', 'regions']);

        return response()->json([
            'data' => new EntityMapFloorResource($floor),
        ]);
    }

    public function destroyFloor(Universe $universe, Entity $entity, Entity $map, EntityMapFloor $floor): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        abort_unless($floor->entity_id === $map->id, 404);

        $floor->delete();

        return response()->json(null, 204);
    }

    //  Markers 

    public function storeMarker(Request $request, Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        $data = $request->validate([
            'entity_map_floor_id' => ['required', 'exists:entity_map_floors,id'],
            'entity_id'           => ['nullable', 'exists:entities,id'],
            'name'                => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string', 'max:5000'],
            'x_percent'           => ['required', 'numeric', 'min:0', 'max:100'],
            'y_percent'           => ['required', 'numeric', 'min:0', 'max:100'],
            'marker_type'         => ['nullable', 'string', Rule::in(['poi', 'item', 'character', 'event', 'entrance', 'exit', 'save-point', 'boss', 'note', 'threat', 'objective', 'secret', 'safe-room', 'custom'])],
            'icon'                => ['nullable', 'string', 'max:50'],
            'color'               => ['nullable', 'string', 'max:20'],
            'metadata'            => ['nullable', 'array'],
            'sort_order'          => ['nullable', 'integer'],
        ]);

        // Ensure the floor belongs to this map entity.
        $floor = EntityMapFloor::where('id', $data['entity_map_floor_id'])
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $marker = EntityMapMarker::create($data);
        $marker->load('entity.entityType');

        return response()->json([
            'data' => new EntityMapMarkerResource($marker),
        ], 201);
    }

    public function updateMarker(Request $request, Universe $universe, Entity $entity, Entity $map, EntityMapMarker $marker): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        // Ensure the marker's floor belongs to this map.
        $floor = EntityMapFloor::where('id', $marker->entity_map_floor_id)
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $data = $request->validate([
            'entity_id'   => ['nullable', 'exists:entities,id'],
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'x_percent'   => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'y_percent'   => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'marker_type' => ['nullable', 'string', Rule::in(['poi', 'item', 'character', 'event', 'entrance', 'exit', 'save-point', 'boss', 'note', 'threat', 'objective', 'secret', 'safe-room', 'custom'])],
            'icon'        => ['nullable', 'string', 'max:50'],
            'color'       => ['nullable', 'string', 'max:20'],
            'metadata'    => ['nullable', 'array'],
            'sort_order'  => ['nullable', 'integer'],
        ]);

        $marker->update($data);
        $marker->load('entity.entityType');

        return response()->json([
            'data' => new EntityMapMarkerResource($marker),
        ]);
    }

    public function destroyMarker(Universe $universe, Entity $entity, Entity $map, EntityMapMarker $marker): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        EntityMapFloor::where('id', $marker->entity_map_floor_id)
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $marker->delete();

        return response()->json(null, 204);
    }

    //  Regions 

    public function storeRegion(Request $request, Universe $universe, Entity $entity, Entity $map): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);

        $data = $request->validate([
            'entity_map_floor_id' => ['required', 'exists:entity_map_floors,id'],
            'entity_id'           => ['nullable', 'exists:entities,id'],
            'name'                => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string', 'max:5000'],
            'boundary_points'     => ['required', 'array', 'min:3'],
            'boundary_points.*.x' => ['required', 'numeric', 'min:0', 'max:100'],
            'boundary_points.*.y' => ['required', 'numeric', 'min:0', 'max:100'],
            'region_type'         => ['nullable', 'string', Rule::in(['room', 'zone', 'corridor', 'outdoor', 'restricted', 'safe', 'boss-arena', 'containment', 'lab', 'storage', 'utility', 'exterior', 'safe-room', 'custom'])],
            'color'               => ['nullable', 'string', 'max:20'],
            'fill_opacity'        => ['nullable', 'numeric', 'min:0', 'max:1'],
            'metadata'            => ['nullable', 'array'],
            'sort_order'          => ['nullable', 'integer'],
        ]);

        // Ensure the floor belongs to this map entity.
        $floor = EntityMapFloor::where('id', $data['entity_map_floor_id'])
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $region = EntityMapRegion::create($data);
        $region->load('entity.entityType');

        return response()->json([
            'data' => new EntityMapRegionResource($region),
        ], 201);
    }

    public function updateRegion(Request $request, Universe $universe, Entity $entity, Entity $map, EntityMapRegion $region): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        EntityMapFloor::where('id', $region->entity_map_floor_id)
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $data = $request->validate([
            'entity_id'           => ['nullable', 'exists:entities,id'],
            'name'                => ['sometimes', 'string', 'max:255'],
            'description'         => ['nullable', 'string', 'max:5000'],
            'boundary_points'     => ['sometimes', 'array', 'min:3'],
            'boundary_points.*.x' => ['required_with:boundary_points', 'numeric', 'min:0', 'max:100'],
            'boundary_points.*.y' => ['required_with:boundary_points', 'numeric', 'min:0', 'max:100'],
            'region_type'         => ['nullable', 'string', Rule::in(['room', 'zone', 'corridor', 'outdoor', 'restricted', 'safe', 'boss-arena', 'containment', 'lab', 'storage', 'utility', 'exterior', 'safe-room', 'custom'])],
            'color'               => ['nullable', 'string', 'max:20'],
            'fill_opacity'        => ['nullable', 'numeric', 'min:0', 'max:1'],
            'metadata'            => ['nullable', 'array'],
            'sort_order'          => ['nullable', 'integer'],
        ]);

        $region->update($data);
        $region->load('entity.entityType');

        return response()->json([
            'data' => new EntityMapRegionResource($region),
        ]);
    }

    public function destroyRegion(Universe $universe, Entity $entity, Entity $map, EntityMapRegion $region): JsonResponse
    {
        $this->validateMapOwnership($entity, $map);
        EntityMapFloor::where('id', $region->entity_map_floor_id)
            ->where('entity_id', $map->id)
            ->firstOrFail();

        $region->delete();

        return response()->json(null, 204);
    }
}
