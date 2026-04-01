<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EntityMapMarker extends Model
{
    protected $fillable = [
        'entity_map_floor_id',
        'entity_id',
        'name',
        'description',
        'x_percent',
        'y_percent',
        'marker_type',
        'icon',
        'color',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'entity_id' => 'integer',
        'x_percent' => 'float',
        'y_percent' => 'float',
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        $flush = function (self $model) {
            $floor = $model->floor;
            if ($floor?->entity_id) {
                // Flush map entity's show cache.
                Cache::forget("entities:{$floor->entity_id}:show");

                // Also flush parent entity's show cache (the entity that has-map this map entity).
                $hasMapTypeId = MetaEntityRelationType::where('slug', 'has-map')->value('id');
                if ($hasMapTypeId) {
                    $parentIds = DB::table('entity_relations')
                        ->where('to_entity_id', $floor->entity_id)
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

    public function floor(): BelongsTo
    {
        return $this->belongsTo(EntityMapFloor::class, 'entity_map_floor_id');
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }
}
