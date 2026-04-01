<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimelineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'universe_id' => $this->universe_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            // 'events' => TimelineEventResource::collection($this->whenLoaded('events')),
            'events' => $this->whenLoaded('events', function () {
                return TimelineEventResource::collection($this->events)->resolve();
            }),
            // 'entities' => EntitySummaryResource::collection($this->whenLoaded('entities')),
            'entities' => $this->whenLoaded('entities', function () {
                return EntitySummaryResource::collection($this->entities)->resolve();
            }),
            // 'images' => ImageResource::collection($this->whenLoaded('images')),
            'images' => $this->whenLoaded('images', function () {
                return ImageResource::collection($this->images)->resolve();
            }),
            'entities_count' => $this->whenCounted('entities'),
            'events_count' => $this->whenCounted('events'),
            'pivot' => $this->when($this->pivot !== null, fn () => [
                'role' => $this->pivot->role,
                'notes' => $this->pivot->notes,
                'fictional_start' => $this->pivot->fictional_start,
                'fictional_end' => $this->pivot->fictional_end,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
