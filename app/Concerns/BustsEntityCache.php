<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Cache;

/**
 * Applied to sub-record models that are children of an Entity
 * (EntitySection, EntityAttribute, EntityInfectionRecord, etc.).
 *
 * When the record is saved or deleted, the parent entity's cached
 * show payload is invalidated so the next GET returns fresh data.
 *
 * Override `entityForeignKey()` if the FK column is not `entity_id`.
 * Override `flushEntityCache()` if multiple entity IDs must be invalidated
 * (e.g. EntityRelation which has both from_entity_id and to_entity_id).
 */
trait BustsEntityCache
{
    protected static function bootBustsEntityCache(): void
    {
        $flush = fn (self $model) => $model->flushEntityCache();
        static::saved($flush);
        static::deleted($flush);
    }

    protected function flushEntityCache(): void
    {
        $entityId = $this->{static::entityForeignKey()};
        if ($entityId) {
            $this->forgetEntityShowCache((int) $entityId);
        }
    }

    /**
     * FK column that points to the owning entity.
     * Override in the model if the column is not `entity_id`.
     */
    protected static function entityForeignKey(): string
    {
        return 'entity_id';
    }

    /**
     * Clear the cached show payload for a given entity ID.
     * Centralised here so overrides of flushEntityCache() can call it
     * without needing to import the Cache facade themselves.
     */
    protected function forgetEntityShowCache(int $entityId): void
    {
        Cache::forget("entities:{$entityId}:show");
        Cache::forget("entities:{$entityId}:graph");
    }
}
