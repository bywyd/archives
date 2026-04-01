<?php

namespace App\Models;

use App\Concerns\BustsUniverseCache;
use App\Concerns\HasImage;
use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Timeline extends Model
{
    use BustsUniverseCache, HasImage, HasRevisions, SoftDeletes;

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

    public function entities(): BelongsToMany
    {
        return $this->belongsToMany(Entity::class, 'entity_timeline_pivots')
            ->using(EntityTimelinePivot::class)
            ->withPivot(['role', 'notes', 'fictional_start', 'fictional_end'])
            ->withTimestamps();
    }

    public function events(): HasMany
    {
        return $this->hasMany(TimelineEvent::class)->orderBy('sort_order');
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
 