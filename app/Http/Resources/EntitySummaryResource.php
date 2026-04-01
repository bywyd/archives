<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntitySummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'is_featured' => $this->is_featured,
            'is_locked' => (bool) $this->is_locked,
            'entity_type' => $this->whenLoaded('entityType', function () {
                return (new MetaEntityTypeResource($this->entityType))->resolve();
            }),
            'entity_status' => $this->whenLoaded('entityStatus', function () {
                return (new MetaEntityStatusResource($this->entityStatus))->resolve();
            }),
            // 'entity_type' => new MetaEntityTypeResource($this->whenLoaded('entityType')),
            // 'entity_status' => new MetaEntityStatusResource($this->whenLoaded('entityStatus')),
            // 'images' => ImageResource::collection($this->whenLoaded('images')),
            // 'tags' => TagResource::collection($this->whenLoaded('tags')),
            'images' => $this->whenLoaded('images', function () {
                return ImageResource::collection($this->images)->resolve();
            }),
            'tags' => $this->whenLoaded('tags', function () {
                return TagResource::collection($this->tags)->resolve();
            }),
            'pivot' => $this->when($this->pivot !== null, fn () => [
                'role'        => $this->pivot->role ?? null,
                'description' => $this->pivot->description ?? null,
                'sort_order'  => $this->pivot->sort_order ?? 0,
            ]),
            'universe' => [
                'id' => $this->universe_id,
                'name' => $this->whenLoaded('universe', fn () => $this->universe->name),
                'slug' => $this->whenLoaded('universe', fn () => $this->universe->slug),
            ],
        ];
    }
}
