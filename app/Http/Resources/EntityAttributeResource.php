<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityAttributeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entity_id' => $this->entity_id,
            'attribute_definition_id' => $this->attribute_definition_id,
            'value' => $this->value,
            'definition' => new AttributeDefinitionResource($this->whenLoaded('definition')),
        ];
    }
}
