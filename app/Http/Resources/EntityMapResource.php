<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityMapResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'description' => $this->short_description,
            'metadata'    => $this->metadata,
            'is_featured' => $this->is_featured,
            'sort_order'  => $this->metadata['sort_order'] ?? 0,
            'floors'      => EntityMapFloorResource::collection($this->whenLoaded('floors')),
            'floors_count' => $this->when(isset($this->floors_count), fn () => $this->floors_count),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
