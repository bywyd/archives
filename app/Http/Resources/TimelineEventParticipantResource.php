<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimelineEventParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'timeline_event_id' => $this->timeline_event_id,
            'entity_id' => $this->entity_id,
            // 'entity' => new EntitySummaryResource($this->whenLoaded('entity')),
            'entity' => $this->whenLoaded('entity', function () {
                return new EntitySummaryResource($this->entity);
            }),
            'role' => $this->role,
            'outcome' => $this->outcome,
            'notes' => $this->notes,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
