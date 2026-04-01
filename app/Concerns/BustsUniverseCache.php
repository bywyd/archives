<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Cache;

/**
 * Applied to universe-child models (Timeline, Category, MediaSource).
 *
 * When saved or deleted the universe's sidebar-tree cache is invalidated
 * so the next navigation load rebuilds the correct counts and lists.
 */
trait BustsUniverseCache
{
    protected static function bootBustsUniverseCache(): void
    {
        $flush = function (self $model): void {
            if ($model->universe_id) {
                Cache::forget("universes:{$model->universe_id}:sidebar-tree");
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }
}
