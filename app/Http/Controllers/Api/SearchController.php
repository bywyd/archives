<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EntitySummaryResource;
use App\Models\Entity;
use App\Models\Universe;
use App\Services\AdvancedSearchService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request, Universe $universe): \Illuminate\Http\JsonResponse
    {
        if ($request->has('search') && !$request->has('q')) {
            $request->merge(['q' => $request->query('search')]);
        }

        $validated = $request->validate([
            'q' => ['required_without:search', 'string', 'min:1', 'max:255'],
            'types' => ['nullable', 'array'],
            'search' => ['nullable', 'string', 'min:1', 'max:255'], // Optional but good for strictness
            'types.*' => ['string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $validated['q'] ?? $validated['search'];
        $perPage = $validated['per_page'] ?? 15;

        $entities = Entity::where('universe_id', $universe->id)
            ->with(['entityType', 'entityStatus', 'images', 'tags'])
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('short_description', 'like', "%{$query}%")
                  ->orWhere('content', 'like', "%{$query}%")
                  ->orWhereHas('aliases', fn ($q) => $q->where('alias', 'like', "%{$query}%"))
                  ->orWhereHas('sections', fn ($q) => $q->where('content', 'like', "%{$query}%"));
            })
            ->when(
                $validated['types'] ?? null,
                fn ($q, $types) => $q->whereHas('entityType', fn ($q) => $q->whereIn('slug', $types))
            )
            ->paginate($perPage);

        return response()->json([
            'data' => EntitySummaryResource::collection($entities),
            'meta' => [
                'query' => $query,
                'total' => $entities->total(),
                'current_page' => $entities->currentPage(),
                'last_page' => $entities->lastPage(),
            ],
        ]);
    }

    public function globalSearch(Request $request): \Illuminate\Http\JsonResponse
    {
        if ($request->has('search') && !$request->has('q')) {
            $request->merge(['q' => $request->query('search')]);
        }

        $validated = $request->validate([
            'q' => ['required_without:search', 'string', 'min:1', 'max:255'],
            'search' => ['nullable', 'string', 'min:1', 'max:255'], // Optional but good for strictness
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $validated['q'] ?? $validated['search'];
        $perPage = $validated['per_page'] ?? 15;

        $entities = Entity::query()
            ->with(['entityType', 'entityStatus', 'universe', 'images', 'tags'])
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('short_description', 'like', "%{$query}%")
                  ->orWhereHas('aliases', fn ($q) => $q->where('alias', 'like', "%{$query}%"));
            })
            ->paginate($perPage);

        return response()->json([
            'data' => EntitySummaryResource::collection($entities),
            'meta' => [
                'query' => $query,
                'total' => $entities->total(),
                'current_page' => $entities->currentPage(),
                'last_page' => $entities->lastPage(),
            ],
        ]);
    }

    /**
     * Advanced natural-language search with multi-signal scoring,
     * query intent parsing, briefing generation, and connection graph.
     */
    public function advancedSearch(Request $request, Universe $universe): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:500'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $service = new AdvancedSearchService();
        $results = $service->search(
            $universe,
            $validated['q'],
            $validated['limit'] ?? 20,
        );

        return response()->json($results);
    }
}
