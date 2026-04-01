<?php

namespace App\Concerns;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Provides cache read/write/invalidation helpers for Eloquent models.
 *
 * Cache keys follow the pattern: {table}:{id}:{context}
 * e.g.  entities:42:show
 *       universes:1:sidebar-tree
 *
 * Usage:
 *   1. Add `use HasCaching;` to the model.
 *   2. Optionally override `cacheContexts()` to list which contexts the base
 *      `flushCache()` should clear automatically on save/delete.
 *   3. Override `flushCache()` if you need cascade invalidation (e.g. bust a
 *      parent universe cache whenever an entity changes).
 *   4. Call `$model->rememberCache('context', $ttl, fn() => ...)` in controllers.
 */
trait HasCaching
{
    protected static function bootHasCaching(): void
    {
        static::saved(fn ($model) => $model->flushCache());
        static::deleted(fn ($model) => $model->flushCache());
    }

    /**
     * Deterministic cache key for a given context on this model instance.
     */
    public function cacheKey(string $context): string
    {
        return $this->getTable() . ':' . $this->getKey() . ':' . $context;
    }

    /**
     * Retrieve a cached value or run the callback, cache and return the result.
     */
    public function rememberCache(string $context, int $seconds, Closure $callback): mixed
    {
        return Cache::remember($this->cacheKey($context), $seconds, $callback);
    }

    /**
     * Delete all owned cache contexts for this model instance.
     * Override in the concrete model for cascade invalidation.
     */
    public function flushCache(): void
    {
        foreach ($this->cacheContexts() as $context) {
            Cache::forget($this->cacheKey($context));
        }
    }

    /**
     * List of cache context strings owned by this model.
     * Override in the concrete model.
     */
    protected function cacheContexts(): array
    {
        return [];
    }
}
