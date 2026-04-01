<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'universe_id' => $this->universe_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'media_type' => $this->media_type,
            'release_date' => $this->release_date?->toDateString(),
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            'metadata' => $this->metadata,
            // 'images' => ImageResource::collection($this->whenLoaded('images')),
            'images' => $this->whenLoaded('images', fn () => ImageResource::collection($this->images)->resolve()),
            // 'entities' => EntitySummaryResource::collection($this->whenLoaded('entities')),
            'entities' => $this->whenLoaded('entities', fn () => EntitySummaryResource::collection($this->entities)->resolve()),
            'entities_count' => $this->whenCounted('entities'),
            'pivot' => $this->when($this->pivot !== null, fn () => [
                'role' => $this->pivot->role,
                'description' => $this->pivot->description,
                'sort_order' => $this->pivot->sort_order,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
