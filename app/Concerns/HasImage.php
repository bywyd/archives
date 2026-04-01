<?php

namespace App\Concerns;

trait HasImage
{

    public function images()
    {
        return $this->morphMany(\App\Models\Image::class, 'imageable');
    }

}
