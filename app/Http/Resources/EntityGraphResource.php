<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal entity payload for the connections graph view.
 * Only returns the fields required by the frontend graph renderer:
 * id, slug, name, entity_type (slug/color/icon), and both relation lists
 * with their connected entities' type info and the relation type name.
 */
class EntityGraphResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'slug'        => $this->slug,
            'name'        => $this->name,
            'profile_image_url' => $this->whenLoaded('images', function () {
                $img = $this->images->firstWhere('type', 'profile');
                return $img ? ($img->thumbnail_url ?? $img->url) : null;
            }),
            'entity_type' => $this->whenLoaded('entityType', fn () => [
                'slug'  => $this->entityType?->slug,
                'color' => $this->entityType?->color,
                'icon'  => $this->entityType?->icon,
                'name'  => $this->entityType?->name,
            ]),
            'outgoing_relations' => $this->whenLoaded('outgoingRelations', function () {
                return $this->outgoingRelations->map(fn ($rel) => [
                    'id'            => $rel->id,
                    'to_entity'     => [
                        'id'          => $rel->toEntity->id,
                        'slug'        => $rel->toEntity->slug,
                        'name'        => $rel->toEntity->name,
                        'profile_image_url' => $rel->toEntity->relationLoaded('images')
                            ? (($img = $rel->toEntity->images->firstWhere('type', 'profile')) ? ($img->thumbnail_url ?? $img->url) : null)
                            : null,
                        'entity_type' => $rel->toEntity->entityType ? [
                            'slug'  => $rel->toEntity->entityType->slug,
                            'color' => $rel->toEntity->entityType->color,
                            'icon'  => $rel->toEntity->entityType->icon,
                            'name'  => $rel->toEntity->entityType->name,
                        ] : null,
                    ],
                    'relation_type' => $rel->relationType ? [
                        'name'         => $rel->relationType->name,
                        'inverse_name' => $rel->relationType->inverse_name,
                        'is_directional' => $rel->relationType->is_directional,
                    ] : null,
                    'status'        => $rel->status,
                    'description'   => $rel->description,
                ]);
            }),
            'incoming_relations' => $this->whenLoaded('incomingRelations', function () {
                return $this->incomingRelations->map(fn ($rel) => [
                    'id'            => $rel->id,
                    'from_entity'   => [
                        'id'          => $rel->fromEntity->id,
                        'slug'        => $rel->fromEntity->slug,
                        'name'        => $rel->fromEntity->name,
                        'profile_image_url' => $rel->fromEntity->relationLoaded('images')
                            ? (($img = $rel->fromEntity->images->firstWhere('type', 'profile')) ? ($img->thumbnail_url ?? $img->url) : null)
                            : null,
                        'entity_type' => $rel->fromEntity->entityType ? [
                            'slug'  => $rel->fromEntity->entityType->slug,
                            'color' => $rel->fromEntity->entityType->color,
                            'icon'  => $rel->fromEntity->entityType->icon,
                            'name'  => $rel->fromEntity->entityType->name,
                        ] : null,
                    ],
                    'relation_type' => $rel->relationType ? [
                        'name'         => $rel->relationType->name,
                        'inverse_name' => $rel->relationType->inverse_name,
                        'is_directional' => $rel->relationType->is_directional,
                    ] : null,
                    'status'        => $rel->status,
                    'description'   => $rel->description,
                ]);
            }),
        ];
    }
}
