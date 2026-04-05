<?php

namespace App\Models;

use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TimelineEvent extends Model
{
    use HasRevisions;
    protected $fillable = [
        'timeline_id',
        'entity_id',
        'location_entity_id',
        'title',
        'description',
        'narrative',
        'event_type',
        'severity',
        'phase',
        'duration',
        'fictional_date',
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    public function timeline(): BelongsTo
    {
        return $this->belongsTo(Timeline::class);
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'location_entity_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(TimelineEventParticipant::class)->orderBy('sort_order');
    }

    public function intelligenceRecords(): HasMany
    {
        return $this->hasMany(EntityIntelligenceRecord::class)->orderBy('sort_order');
    }
}
