<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityMutationStageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'trigger_entity_id' => $this->trigger_entity_id,
            'trigger_entity' => new EntitySummaryResource($this->whenLoaded('triggerEntity')),
            'stage_number' => $this->stage_number,
            'name' => $this->name,
            'trigger' => $this->trigger,
            'description' => $this->description,
            'physical_changes' => $this->physical_changes,
            'abilities_gained' => $this->abilities_gained,
            'abilities_lost' => $this->abilities_lost,
            'threat_level' => $this->threat_level,
            'is_reversible' => $this->is_reversible,
            'fictional_date' => $this->fictional_date,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
