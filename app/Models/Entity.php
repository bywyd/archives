<?php

namespace App\Models;

use App\Concerns\HasCaching;
use App\Concerns\HasImage;
use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Entity extends Model
{
    use HasCaching, HasImage, HasRevisions, SoftDeletes;

    protected $fillable = [
        'universe_id',
        'name',
        'slug',
        'short_description',
        'content',
        'entity_type_id',
        'entity_status_id',
        'metadata',
        'is_featured',
        'is_locked',
    ];

    protected $casts = [
        'universe_id' => 'integer',
        'metadata' => 'array',
        'is_featured' => 'boolean',
        'is_locked' => 'boolean',
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

    public function universe(): BelongsTo
    {
        return $this->belongsTo(Universe::class);
    }

    public function entityType(): BelongsTo
    {
        return $this->belongsTo(MetaEntityType::class, 'entity_type_id');
    }

    public function entityStatus(): BelongsTo
    {
        return $this->belongsTo(MetaEntityStatus::class, 'entity_status_id');
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(EntityAlias::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(EntitySection::class)->orderBy('sort_order');
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(EntityAttribute::class);
    }

    public function outgoingRelations(): HasMany
    {
        return $this->hasMany(EntityRelation::class, 'from_entity_id');
    }

    public function incomingRelations(): HasMany
    {
        return $this->hasMany(EntityRelation::class, 'to_entity_id');
    }

    public function timelines(): BelongsToMany
    {
        return $this->belongsToMany(Timeline::class, 'entity_timeline_pivots')
            ->using(EntityTimelinePivot::class)
            ->withPivot(['role', 'notes', 'fictional_start', 'fictional_end'])
            ->withTimestamps();
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(TimelineEvent::class);
    }

    public function mediaSources(): BelongsToMany
    {
        return $this->belongsToMany(MediaSource::class, 'entity_media_source')
            ->withPivot(['role', 'description', 'sort_order'])
            ->withTimestamps();
    }

    public function tags(): BelongsToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function categories(): BelongsToMany
    {
        return $this->morphToMany(Category::class, 'categorizable');
    }

    public function outgoingCrossReferences(): HasMany
    {
        return $this->hasMany(EntityCrossReference::class, 'source_entity_id');
    }

    public function incomingCrossReferences(): HasMany
    {
        return $this->hasMany(EntityCrossReference::class, 'target_entity_id');
    }

    public function infectionRecords(): HasMany
    {
        return $this->hasMany(EntityInfectionRecord::class)->orderBy('sort_order');
    }

    public function mutationStages(): HasMany
    {
        return $this->hasMany(EntityMutationStage::class)->orderBy('stage_number');
    }

    public function affiliationHistory(): HasMany
    {
        return $this->hasMany(EntityAffiliationHistory::class)->orderBy('sort_order');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(EntityQuote::class)->orderBy('sort_order');
    }

    public function powerProfiles(): HasMany
    {
        return $this->hasMany(EntityPowerProfile::class)->orderBy('sort_order');
    }

    public function consciousnessRecords(): HasMany
    {
        return $this->hasMany(EntityConsciousnessRecord::class)->orderBy('sort_order');
    }

    public function consciousnessVesselOf(): HasMany
    {
        return $this->hasMany(EntityConsciousnessRecord::class, 'vessel_entity_id');
    }

    public function infectedByThis(): HasMany
    {
        return $this->hasMany(EntityInfectionRecord::class, 'pathogen_entity_id');
    }

    public function curedByThis(): HasMany
    {
        return $this->hasMany(EntityInfectionRecord::class, 'cure_entity_id');
    }

    public function intelligenceRecords(): HasMany
    {
        return $this->hasMany(EntityIntelligenceRecord::class)->orderBy('sort_order');
    }

    public function intelligenceAbout(): HasMany
    {
        return $this->hasMany(EntityIntelligenceRecord::class, 'observer_entity_id')->orderBy('sort_order');
    }

    public function deathRecords(): HasMany
    {
        return $this->hasMany(EntityDeathRecord::class)->orderBy('sort_order');
    }

    public function transmissionParticipants(): HasMany
    {
        return $this->hasMany(EntityTransmissionRelation::class, 'transmission_entity_id')->orderBy('sort_order');
    }

    public function transmissionAppearances(): HasMany
    {
        return $this->hasMany(EntityTransmissionRelation::class, 'participant_entity_id')->orderBy('sort_order');
    }

    public function transmissionRecords(): HasMany
    {
        return $this->hasMany(EntityTransmissionRecord::class, 'transmission_entity_id')->orderBy('sort_order');
    }

    /**
     * Maps owned by this entity (via has-map EntityRelation).
     * Returns Entity models of type "map" ordered by metadata sort_order.
     */
    public function maps(): BelongsToMany
    {
        $hasMapTypeId = \App\Models\MetaEntityRelationType::where('slug', 'has-map')->value('id');

        return $this->belongsToMany(
            Entity::class,
            'entity_relations',
            'from_entity_id',
            'to_entity_id'
        )
        ->using(EntityRelationPivot::class)
        ->withPivot(['id', 'relation_type_id']) // removed: 'notes'
        ->withTimestamps()
        ->wherePivot('relation_type_id', $hasMapTypeId ?? 0);
    }

    /**
     * Floors belonging to this entity (when this entity IS a map).
     */
    public function floors(): HasMany
    {
        return $this->hasMany(EntityMapFloor::class)->orderBy('sort_order')->orderBy('floor_number');
    }

    /**
     * All markers across all floors of this map entity.
     */
    public function allMapMarkers(): HasManyThrough
    {
        return $this->hasManyThrough(EntityMapMarker::class, EntityMapFloor::class, 'entity_id', 'entity_map_floor_id');
    }

    /**
     * All regions across all floors of this map entity.
     */
    public function allMapRegions(): HasManyThrough
    {
        return $this->hasManyThrough(EntityMapRegion::class, EntityMapFloor::class, 'entity_id', 'entity_map_floor_id');
    }

    public function mapMarkerAppearances(): HasMany
    {
        return $this->hasMany(EntityMapMarker::class);
    }

    public function mapRegionAppearances(): HasMany
    {
        return $this->hasMany(EntityMapRegion::class);
    }



    /**
     * Flush own show cache and cascade to parent universe-level caches.
     * Called automatically by HasCaching on every save/delete.
     */
    public function flushCache(): void
    {
        Cache::forget($this->cacheKey('show'));
        Cache::forget($this->cacheKey('graph'));
        Cache::forget($this->cacheKey('relations'));
        Cache::forget($this->cacheKey('entity-locations'));
        Cache::forget($this->cacheKey('infection-records'));
        Cache::forget($this->cacheKey('mutation-stages'));
        Cache::forget($this->cacheKey('affiliation-history'));
        Cache::forget($this->cacheKey('preview'));
        Cache::forget($this->cacheKey('is_locked'));
        Cache::forget($this->cacheKey('map-markers'));
        Cache::forget($this->cacheKey('map'));
        Cache::forget($this->cacheKey('related-tags'));
        Cache::forget($this->cacheKey('briefing'));
        Cache::forget("entity:{$this->id}:is_locked");

        // Cascade to the parent entity's cache if this IS a map entity
        // (its show cache is keyed by its own id, already flushed above).
        // Also cascade to any parent entity that has a has-map relation to us.
        $hasMapTypeId = \App\Models\MetaEntityRelationType::where('slug', 'has-map')->value('id');
        if ($hasMapTypeId) {
            $parentIds = \App\Models\EntityRelation::where('to_entity_id', $this->id)
                ->where('relation_type_id', $hasMapTypeId)
                ->pluck('from_entity_id');
            foreach ($parentIds as $parentId) {
                Cache::forget("entities:{$parentId}:show");
            }
        }

        if ($this->universe_id) {
            Cache::forget("universes:{$this->universe_id}:sidebar-tree");
            Cache::forget("universes:{$this->universe_id}:entity-locations");
        }
    }
}
