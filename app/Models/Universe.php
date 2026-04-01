<?php

namespace App\Models;

use App\Concerns\HasCaching;
use App\Concerns\HasImage;
use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Universe extends Model
{
    use HasCaching, HasImage, HasRevisions, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'settings',
        'is_locked',
    'compound_names',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_locked' => 'boolean',
    'compound_names' => 'array',
    ];

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

    public function entities(): HasMany
    {
        return $this->hasMany(Entity::class);
    }

    public function timelines(): HasMany
    {
        return $this->hasMany(Timeline::class);
    }

    public function mediaSources(): HasMany
    {
        return $this->hasMany(MediaSource::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /**
     * Eager-loads images so branding data (icon, banner, etc.) is available.
     */
    public function scopeWithBranding(Builder $query): Builder
    {
        return $query->with('images');
    }

    protected function cacheContexts(): array
    {
        return ['sidebar-tree', 'entity-locations'];
    }

    public function flushCache(): void
    {
        foreach ($this->cacheContexts() as $context) {
            Cache::forget($this->cacheKey($context));
        }

        Cache::forget("universe:{$this->id}:is_locked");
    }
}
