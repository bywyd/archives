<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityMapFloorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id'   => $this->entity_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'floor_number' => $this->floor_number,
            'image_width' => $this->image_width,
            'image_height' => $this->image_height,
            'sort_order' => $this->sort_order,
            'images' => ImageResource::collection($this->whenLoaded('images')),
            'markers' => EntityMapMarkerResource::collection($this->whenLoaded('markers')),
            'regions' => EntityMapRegionResource::collection($this->whenLoaded('regions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
