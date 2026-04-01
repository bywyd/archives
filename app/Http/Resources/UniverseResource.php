<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UniverseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
                'settings' => $this->settings,          // array|null (auto-cast)
                'compound_names' => $this->compound_names ?? [],
            'is_locked' => (bool) $this->is_locked,
            'images' => $this->whenLoaded('images', function () {
                return ImageResource::collection($this->images)->resolve();
            }),
            'entities_count' => $this->whenCounted('entities'),
            'timelines_count' => $this->whenCounted('timelines'),
            'media_sources_count' => $this->whenCounted('mediaSources'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
