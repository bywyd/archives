<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    public function index(Request $request, Universe $universe): AnonymousResourceCollection
    {
        $categories = $universe->categories()
            ->whereNull('parent_id')
            ->withCount('entities')
            ->with(['children' => fn($q) => $q->withCount('entities')])
            ->orderBy('sort_order')
            ->paginate($request->input('per_page', 50));

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request, Universe $universe): CategoryResource
    {
        $data = $request->validated();
        $data['universe_id'] = $universe->id;

        $category = Category::create($data);
        $category->load('children');

        return new CategoryResource($category);
    }

    public function show(Universe $universe, Category $category): CategoryResource
    {
        $category->loadCount('entities');
        $category->load(['children' => fn($q) => $q->withCount('entities')]);

        return new CategoryResource($category);
    }

    public function update(Request $request, Universe $universe, Category $category): CategoryResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $category->update($validated);
        $category->load('children');

        return new CategoryResource($category);
    }

    public function destroy(Universe $universe, Category $category): \Illuminate\Http\JsonResponse
    {
        $category->delete();

        return response()->json(null, 204);
    }
}
