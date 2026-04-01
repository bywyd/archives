<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTimelineRequest;
use App\Http\Resources\TimelineResource;
use App\Models\Timeline;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TimelineController extends Controller
{
    public function index(Request $request, Universe $universe): AnonymousResourceCollection
    {
        $timelines = $universe->timelines()
            ->withCount(['entities', 'events'])
            ->when($request->input('search'), fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('sort_order')
            ->paginate($request->input('per_page', 15));

        return TimelineResource::collection($timelines);
    }

    public function store(StoreTimelineRequest $request, Universe $universe): TimelineResource
    {
        $data = $request->validated();
        $data['universe_id'] = $universe->id;

        $timeline = Timeline::create($data);

        return new TimelineResource($timeline);
    }

    public function show(Universe $universe, Timeline $timeline): TimelineResource
    {
        $timeline->load([
            'events.entity.entityType',
            'entities.entityType',
            'images',
        ]);
        $timeline->loadCount(['entities', 'events']);

        return new TimelineResource($timeline);
    }

    public function update(Request $request, Universe $universe, Timeline $timeline): TimelineResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $timeline->update($validated);

        return new TimelineResource($timeline);
    }

    public function destroy(Universe $universe, Timeline $timeline): \Illuminate\Http\JsonResponse
    {
        $timeline->delete();

        return response()->json(null, 204);
    }

    public function attachEntity(Request $request, Universe $universe, Timeline $timeline): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'entity_id' => ['required', 'exists:entities,id'],
            'role' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'fictional_start' => ['nullable', 'string', 'max:255'],
            'fictional_end' => ['nullable', 'string', 'max:255'],
        ]);

        $timeline->entities()->syncWithoutDetaching([
            $validated['entity_id'] => collect($validated)->except('entity_id')->toArray(),
        ]);

        return response()->json(['message' => 'Entity attached to timeline']);
    }

    public function detachEntity(Universe $universe, Timeline $timeline, int $entityId): \Illuminate\Http\JsonResponse
    {
        $timeline->entities()->detach($entityId);

        return response()->json(null, 204);
    }
}
