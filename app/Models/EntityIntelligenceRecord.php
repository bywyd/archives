<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityIntelligenceRecord extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'observer_entity_id',
        'subject_entity_id',
        'classification',
        'discovered_during',
        'fictional_date_learned',
        'fictional_date_declassified',
        'intelligence_summary',
        'redacted_details',
        'source',
        'reliability',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function observer(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'observer_entity_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'subject_entity_id');
    }
}
