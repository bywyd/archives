<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMediaSourceRequest;
use App\Http\Resources\MediaSourceResource;
use App\Models\MediaSource;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MediaSourceController extends Controller
{
    public function index(Request $request, Universe $universe): AnonymousResourceCollection
    {
        $sources = $universe->mediaSources()
            ->withCount('entities')
            ->when($request->input('search'), fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($request->input('media_type'), fn ($q, $type) => $q->where('media_type', $type))
            ->orderBy($request->input('sort', 'sort_order'), $request->input('direction', 'asc'))
            ->paginate($request->input('per_page', 15));

        return MediaSourceResource::collection($sources);
    }

    public function store(StoreMediaSourceRequest $request, Universe $universe): MediaSourceResource
    {
        $data = $request->validated();
        $data['universe_id'] = $universe->id;

        $source = MediaSource::create($data);

        return new MediaSourceResource($source);
    }

    public function show(Universe $universe, MediaSource $mediaSource): MediaSourceResource
    {
        $mediaSource->load(['images', 'entities.entityType', 'entities.images', 'tags']);
        $mediaSource->loadCount('entities');

        return new MediaSourceResource($mediaSource);
    }

    public function update(Request $request, Universe $universe, MediaSource $mediaSource): MediaSourceResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'media_type' => ['sometimes', 'string'],
            'release_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ]);

        $mediaSource->update($validated);

        return new MediaSourceResource($mediaSource);
    }

    public function destroy(Universe $universe, MediaSource $mediaSource): \Illuminate\Http\JsonResponse
    {
        $mediaSource->delete();

        return response()->json(null, 204);
    }

    public function attachEntity(Request $request, Universe $universe, MediaSource $mediaSource): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'entity_id' => ['required', 'exists:entities,id'],
            'role' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $mediaSource->entities()->syncWithoutDetaching([
            $validated['entity_id'] => collect($validated)->except('entity_id')->toArray(),
        ]);

        return response()->json(['message' => 'Entity attached to media source']);
    }

    public function detachEntity(Universe $universe, MediaSource $mediaSource, int $entityId): \Illuminate\Http\JsonResponse
    {
        $mediaSource->entities()->detach($entityId);

        return response()->json(null, 204);
    }
}
