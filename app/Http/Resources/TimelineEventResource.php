<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimelineEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'timeline_id' => $this->timeline_id,
            'title' => $this->title,
            'description' => $this->description,
            'narrative' => $this->narrative,
            'fictional_date' => $this->fictional_date,
            'event_type' => $this->event_type,
            'severity' => $this->severity,
            'phase' => $this->phase,
            'duration' => $this->duration,
            'sort_order' => $this->sort_order,
            'metadata' => $this->metadata,
            // 'entity' => new EntitySummaryResource($this->whenLoaded('entity')),
            'entity' => $this->whenLoaded('entity', function () {
                return (new EntitySummaryResource($this->entity))->resolve();
            }),
            // 'location' => new EntitySummaryResource($this->whenLoaded('location')),
            'location' => $this->whenLoaded('location', function () {
                return (new EntitySummaryResource($this->location))->resolve();
            }),
            // 'participants' => TimelineEventParticipantResource::collection($this->whenLoaded('participants')),
            'participants' => $this->whenLoaded('participants', function () {
                return TimelineEventParticipantResource::collection($this->participants)->resolve();
            }),
            'intelligence_records' => $this->whenLoaded('intelligenceRecords', function () {
                return EntityIntelligenceRecordResource::collection($this->intelligenceRecords)->resolve();
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
