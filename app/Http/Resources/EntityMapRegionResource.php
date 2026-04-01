<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityMapRegionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_map_floor_id' => $this->entity_map_floor_id,
            'entity_id' => $this->entity_id,
            'entity' => new EntitySummaryResource($this->whenLoaded('entity')),
            'name' => $this->name,
            'description' => $this->description,
            'boundary_points' => $this->boundary_points,
            'region_type' => $this->region_type,
            'color' => $this->color,
            'fill_opacity' => $this->fill_opacity,
            'metadata' => $this->metadata,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
