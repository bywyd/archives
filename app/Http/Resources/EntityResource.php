<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EntityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'universe_id' => $this->universe_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'content' => $this->content,
            'metadata' => $this->metadata,
            'is_featured' => $this->is_featured,
            'is_locked' => (bool) $this->is_locked,
            'entity_type' => new MetaEntityTypeResource($this->whenLoaded('entityType')),
            'entity_status' => new MetaEntityStatusResource($this->whenLoaded('entityStatus')),
            'universe' => new UniverseResource($this->whenLoaded('universe')),
            'aliases' => EntityAliasResource::collection($this->whenLoaded('aliases')),
            'sections' => EntitySectionResource::collection($this->whenLoaded('sections')),
            'attributes' => EntityAttributeResource::collection($this->whenLoaded('attributes')),
            'images' => ImageResource::collection($this->whenLoaded('images')),
            'outgoing_relations' => EntityRelationResource::collection($this->whenLoaded('outgoingRelations')),
            'incoming_relations' => EntityRelationResource::collection($this->whenLoaded('incomingRelations')),
            'timelines' => TimelineResource::collection($this->whenLoaded('timelines')),
            'media_sources' => MediaSourceResource::collection($this->whenLoaded('mediaSources')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'infection_records' => EntityInfectionRecordResource::collection($this->whenLoaded('infectionRecords')),
            'mutation_stages' => EntityMutationStageResource::collection($this->whenLoaded('mutationStages')),
            'affiliation_history' => EntityAffiliationHistoryResource::collection($this->whenLoaded('affiliationHistory')),
            'quotes' => EntityQuoteResource::collection($this->whenLoaded('quotes')),
            'power_profiles' => EntityPowerProfileResource::collection($this->whenLoaded('powerProfiles')),
            'consciousness_records' => EntityConsciousnessRecordResource::collection($this->whenLoaded('consciousnessRecords')),
            'intelligence_records' => EntityIntelligenceRecordResource::collection($this->whenLoaded('intelligenceRecords')),
            'death_records' => EntityDeathRecordResource::collection($this->whenLoaded('deathRecords')),
            'transmission_participants' => EntityTransmissionRelationResource::collection($this->whenLoaded('transmissionParticipants')),
            'transmission_records' => EntityTransmissionRecordResource::collection($this->whenLoaded('transmissionRecords')),
            'maps' => EntityMapResource::collection($this->whenLoaded('maps')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
