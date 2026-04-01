<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityConsciousnessRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'vessel_entity_id' => $this->vessel_entity_id,
            'vessel' => new EntitySummaryResource($this->whenLoaded('vessel')),
            'status' => $this->status,
            'transfer_method' => $this->transfer_method,
            'vessel_status' => $this->vessel_status,
            'fictional_date_start' => $this->fictional_date_start,
            'fictional_date_end' => $this->fictional_date_end,
            'description' => $this->description,
            'notes' => $this->notes,
            'side_effects' => $this->side_effects,
            'metadata' => $this->metadata,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
