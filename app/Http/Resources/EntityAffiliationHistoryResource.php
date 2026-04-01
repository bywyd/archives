<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityAffiliationHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'organization_entity_id' => $this->organization_entity_id,
            'organization' => new EntitySummaryResource($this->whenLoaded('organization')),
            'organization_name' => $this->organization_name,
            'role' => $this->role,
            'rank' => $this->rank,
            'fictional_start' => $this->fictional_start,
            'fictional_end' => $this->fictional_end,
            'status' => $this->status,
            'notes' => $this->notes,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
