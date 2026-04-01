<?php

namespace App\Models;

use App\Concerns\HasImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EntityMapFloor extends Model
{
    use HasImage;

    protected $fillable = [
        'entity_id',
        'name',
        'slug',
        'floor_number',
        'image_width',
        'image_height',
        'sort_order',
    ];

    protected $casts = [
        'entity_id' => 'integer',
        'floor_number' => 'integer',
        'image_width' => 'integer',
        'image_height' => 'integer',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        $flush = function (self $model) {
            if ($model->entity_id) {
                // Flush this map entity's own show cache.
                Cache::forget("entities:{$model->entity_id}:show");

                // Also flush any parent entity that has a has-map relation pointing to this map entity.
                $hasMapTypeId = \App\Models\MetaEntityRelationType::where('slug', 'has-map')->value('id');
                if ($hasMapTypeId) {
                    $parentIds = \Illuminate\Support\Facades\DB::table('entity_relations')
                        ->where('to_entity_id', $model->entity_id)
                        ->where('relation_type_id', $hasMapTypeId)
                        ->pluck('from_entity_id');
                    foreach ($parentIds as $parentId) {
                        Cache::forget("entities:{$parentId}:show");
                    }
                }
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }

    public function mapEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'entity_id');
    }

    public function markers(): HasMany
    {
        return $this->hasMany(EntityMapMarker::class)->orderBy('sort_order');
    }

    public function regions(): HasMany
    {
        return $this->hasMany(EntityMapRegion::class)->orderBy('sort_order');
    }
}
