<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityMutationStage extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'trigger_entity_id',
        'stage_number',
        'name',
        'trigger',
        'description',
        'physical_changes',
        'abilities_gained',
        'abilities_lost',
        'threat_level',
        'is_reversible',
        'fictional_date',
        'sort_order',
    ];

    protected $casts = [
        'physical_changes' => 'array',
        'abilities_gained' => 'array',
        'abilities_lost' => 'array',
        'is_reversible' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function triggerEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'trigger_entity_id');
    }
}
