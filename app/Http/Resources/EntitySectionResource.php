<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntitySectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'sort_order' => $this->sort_order,
            'is_collapsible' => $this->is_collapsible,
            'parent_id' => $this->parent_id,
            'children' => EntitySectionResource::collection($this->whenLoaded('children'))->resolve(),
            'images' => ImageResource::collection($this->whenLoaded('images'))->resolve(),
        ];
    }
}
