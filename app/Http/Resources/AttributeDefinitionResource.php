<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttributeDefinitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'meta_entity_type_id' => $this->meta_entity_type_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'data_type' => $this->data_type,
            'group_name' => $this->group_name,
            'is_filterable' => $this->is_filterable,
            'is_required' => $this->is_required,
            'default_value' => $this->default_value,
            'sort_order' => $this->sort_order,
            'entity_type' => new MetaEntityTypeResource($this->whenLoaded('entityType')),
        ];
    }
}
