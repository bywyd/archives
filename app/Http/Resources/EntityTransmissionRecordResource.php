<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityTransmissionRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'transmission_entity_id'   => $this->transmission_entity_id,
            'speaker_entity_id'        => $this->speaker_entity_id,
            'speaker'                  => new EntitySummaryResource($this->whenLoaded('speaker')),
            'speaker_label'            => $this->speaker_label,
            'content'                  => $this->content,
            'content_type'             => $this->content_type,
            'tone'                     => $this->tone,
            'fictional_timestamp'      => $this->fictional_timestamp,
            'is_redacted'              => $this->is_redacted,
            'redacted_reason'          => $this->redacted_reason,
            'notes'                    => $this->notes,
            'sort_order'               => $this->sort_order,
            'metadata'                 => $this->metadata,
            'created_at'               => $this->created_at,
            'updated_at'               => $this->updated_at,
        ];
    }
}
