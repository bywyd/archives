<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Facades\Cache;

class Tag extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
    ];

    public function entities(): MorphToMany
    {
        return $this->morphedByMany(Entity::class, 'taggable');
    }

    public function timelines(): MorphToMany
    {
        return $this->morphedByMany(Timeline::class, 'taggable');
    }

    public function mediaSources(): MorphToMany
    {
        return $this->morphedByMany(MediaSource::class, 'taggable');
    }

    protected static function booted(): void
    {
        $bustEntityCaches = function (self $model): void {
            $entityIds = $model->entities()->pluck('entities.id');
            foreach ($entityIds as $id) {
                Cache::forget("entities:{$id}:show");
                Cache::forget("entities:{$id}:graph");
            }
        };

        static::updated($bustEntityCaches);
        static::deleted($bustEntityCaches);
    }
}
