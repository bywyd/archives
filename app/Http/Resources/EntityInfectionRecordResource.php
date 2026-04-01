<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityInfectionRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'pathogen_entity_id' => $this->pathogen_entity_id,
            'cure_entity_id' => $this->cure_entity_id,
            'pathogen' => new EntitySummaryResource($this->whenLoaded('pathogen')),
            'cure' => new EntitySummaryResource($this->whenLoaded('cure')),
            'pathogen_name' => $this->pathogen_name,
            'infection_method' => $this->infection_method,
            'cure_name' => $this->cure_name,
            'cure_method' => $this->cure_method,
            'fictional_date_infected' => $this->fictional_date_infected,
            'fictional_date_cured' => $this->fictional_date_cured,
            'status' => $this->status,
            'severity' => $this->severity,
            'side_effects' => $this->side_effects,
            'symptoms_exhibited' => $this->symptoms_exhibited,
            'notes' => $this->notes,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
