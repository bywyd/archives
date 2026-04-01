<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityDeathRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'entity_id'               => $this->entity_id,
            'killer_entity_id'        => $this->killer_entity_id,
            'incident_entity_id'      => $this->incident_entity_id,
            'location_entity_id'      => $this->location_entity_id,
            'killer'                  => new EntitySummaryResource($this->whenLoaded('killer')),
            'incident'                => new EntitySummaryResource($this->whenLoaded('incident')),
            'location'                => new EntitySummaryResource($this->whenLoaded('location')),
            'revived_by'              => new EntitySummaryResource($this->whenLoaded('revivedBy')),
            'death_type'              => $this->death_type,
            'fictional_date'          => $this->fictional_date,
            'cause_of_death'          => $this->cause_of_death,
            'circumstances'           => $this->circumstances,
            'is_confirmed'            => $this->is_confirmed,
            'is_revived'              => $this->is_revived,
            'revival_method'          => $this->revival_method,
            'fictional_date_revived'  => $this->fictional_date_revived,
            'revival_circumstances'   => $this->revival_circumstances,
            'revived_by_entity_id'    => $this->revived_by_entity_id,
            'body_modifications'      => is_array($this->body_modifications) ? $this->body_modifications : json_decode($this->body_modifications, true),
            'metadata'                => $this->metadata,
            'sort_order'              => $this->sort_order,
            'created_at'              => $this->created_at,
            'updated_at'              => $this->updated_at,
        ];
    }
}
