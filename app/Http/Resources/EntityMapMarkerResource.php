<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityMapMarkerResource extends JsonResource
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
            'x_percent' => $this->x_percent,
            'y_percent' => $this->y_percent,
            'marker_type' => $this->marker_type,
            'icon' => $this->icon,
            'color' => $this->color,
            'metadata' => $this->metadata,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
