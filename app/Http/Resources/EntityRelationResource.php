<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityRelationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from_entity_id' => $this->from_entity_id,
            'to_entity_id' => $this->to_entity_id,
            'from_entity' => new EntitySummaryResource($this->whenLoaded('fromEntity')),
            'to_entity' => new EntitySummaryResource($this->whenLoaded('toEntity')),
            'relation_type' => new MetaEntityRelationTypeResource($this->whenLoaded('relationType')),
            'description' => $this->description,
            'context' => $this->context,
            'metadata' => $this->metadata,
            'fictional_start' => $this->fictional_start,
            'fictional_end' => $this->fictional_end,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
