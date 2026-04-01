<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityPowerProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'source_entity_id' => $this->source_entity_id,
            'source_entity' => new EntitySummaryResource($this->whenLoaded('sourceEntity')),
            'name' => $this->name,
            'description' => $this->description,
            'source' => $this->source,
            'category' => $this->category,
            'power_level' => $this->power_level,
            'status' => $this->status,
            'fictional_date_acquired' => $this->fictional_date_acquired,
            'fictional_date_lost' => $this->fictional_date_lost,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
