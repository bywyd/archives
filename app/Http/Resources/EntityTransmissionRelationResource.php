<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityTransmissionRelationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'transmission_entity_id'   => $this->transmission_entity_id,
            'participant_entity_id'    => $this->participant_entity_id,
            'participant'              => new EntitySummaryResource($this->whenLoaded('participant')),
            'role'                     => $this->role,
            'callsign'                 => $this->callsign,
            'channel'                  => $this->channel,
            'is_present'               => $this->is_present,
            'sort_order'               => $this->sort_order,
            'metadata'                 => $this->metadata,
            'created_at'               => $this->created_at,
            'updated_at'               => $this->updated_at,
        ];
    }
}
