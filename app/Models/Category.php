<?php

namespace App\Models;

use App\Concerns\BustsUniverseCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Facades\Cache;

class Category extends Model
{
    use BustsUniverseCache;

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function resolveRouteBinding($value, $field = null): ?static
    {
        return is_numeric($value)
            ? $this->where('id', $value)->first()
            : $this->where('slug', $value)->first();
    }

    protected $fillable = [
        'universe_id',
        'name',
        'slug',
        'description',
        'parent_id',
        'sort_order',
    ];

    protected $casts = [
        'universe_id' => 'integer',
        'sort_order' => 'integer',
    ];

    public function universe(): BelongsTo
    {
        return $this->belongsTo(Universe::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order');
    }

    public function entities(): MorphToMany
    {
        return $this->morphedByMany(Entity::class, 'categorizable');
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
