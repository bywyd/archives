<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreUniverseRequest;
use App\Http\Requests\Api\UpdateUniverseRequest;
use App\Http\Resources\UniverseResource;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UniverseController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $universes = Universe::query()
            ->withCount(['entities', 'timelines', 'mediaSources'])
            ->with('images')
            ->when($request->input('search'), fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($request->input('per_page', 15));

        return UniverseResource::collection($universes);
    }

    public function store(StoreUniverseRequest $request): UniverseResource
    {
        $universe = Universe::create($request->validated());

        return new UniverseResource($universe);
    }

    public function show(Universe $universe): UniverseResource
    {
        $universe->loadCount(['entities', 'timelines', 'mediaSources']);
        $universe->load('images');

        return new UniverseResource($universe);
    }

    public function update(UpdateUniverseRequest $request, Universe $universe): UniverseResource
    {
        $universe->update($request->validated());

        return new UniverseResource($universe);
    }

    public function destroy(Universe $universe): \Illuminate\Http\JsonResponse
    {
        $universe->delete();

        return response()->json(null, 204);
    }

    public function toggleLock(Universe $universe): UniverseResource
    {
        $universe->update(['is_locked' => ! $universe->is_locked]);

        return new UniverseResource($universe);
    }
}
