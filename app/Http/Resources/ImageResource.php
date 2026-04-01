<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'thumbnail_url' => $this->thumbnail_url,
            'url' => $this->url,
            'alt_text' => $this->alt_text,
            'caption' => $this->caption,
            'credit' => $this->credit,
            'metadata' => $this->metadata,
            'sort_order' => $this->sort_order,
        ];
    }
}
