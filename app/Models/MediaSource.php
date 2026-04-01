<?php

namespace App\Models;

use App\Concerns\BustsUniverseCache;
use App\Concerns\HasImage;
use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

class MediaSource extends Model
{
    use BustsUniverseCache, HasImage, HasRevisions;

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
        'media_type',
        'release_date',
        'description',
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'universe_id' => 'integer',
        'release_date' => 'date',
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    public function universe(): BelongsTo
    {
        return $this->belongsTo(Universe::class);
    }

    public function entities(): BelongsToMany
    {
        return $this->belongsToMany(Entity::class, 'entity_media_source')
            ->withPivot(['role', 'description', 'sort_order'])
            ->withTimestamps();
    }

    public function tags(): BelongsToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
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
