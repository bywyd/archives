<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal entity payload: id, name, slug, entity_type (name/icon/color), profile image.
 * Used for "related entities" sidebars / tag panels where full data is not needed.
 */
class EntityTinyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profileImage = $this->whenLoaded('images', function () {
            $img = $this->images->firstWhere('type', 'profile');
            if (! $img) {
                return null;
            }

            return [
                'url'           => $img->url,
                'thumbnail_url' => $img->thumbnail_url,
                'alt_text'      => $img->alt_text,
            ];
        });

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'entity_type' => $this->whenLoaded('entityType', function () {
                return [
                    'name'  => $this->entityType->name,
                    'slug'  => $this->entityType->slug,
                    'icon'  => $this->entityType->icon,
                    'color' => $this->entityType->color,
                ];
            }),
            'profile_image' => $profileImage,
        ];
    }
}
