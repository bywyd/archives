<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityIntelligenceRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'entity_id'                   => $this->entity_id,
            'observer_entity_id'          => $this->observer_entity_id,
            'subject_entity_id'           => $this->subject_entity_id,
            'timeline_event_id'           => $this->timeline_event_id,
            'observer'                    => new EntitySummaryResource($this->whenLoaded('observer')),
            'subject'                     => new EntitySummaryResource($this->whenLoaded('subject')),
            'classification'              => $this->classification,
            'discovered_during'           => $this->discovered_during,
            'fictional_date_learned'      => $this->fictional_date_learned,
            'fictional_date_declassified' => $this->fictional_date_declassified,
            'intelligence_summary'        => $this->intelligence_summary,
            'redacted_details'            => $this->redacted_details,
            'source'                      => $this->source,
            'reliability'                 => $this->reliability,
            'metadata'                    => $this->metadata,
            'sort_order'                  => $this->sort_order,
            'created_at'                  => $this->created_at,
            'updated_at'                  => $this->updated_at,
        ];
    }
}
