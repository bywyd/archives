<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityDeathRecord extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'killer_entity_id',
        'incident_entity_id',
        'location_entity_id',
        'death_type',
        'fictional_date',
        'cause_of_death',
        'circumstances',
        'is_confirmed',
        'is_revived',
        'revival_method',
        'fictional_date_revived',
        'revival_circumstances',
        'revived_by_entity_id',
        'body_modifications',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'is_confirmed'       => 'boolean',
        'is_revived'         => 'boolean',
        'body_modifications' => 'array',
        'metadata'           => 'array',
        'sort_order'         => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function killer(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'killer_entity_id');
    }

    public function incident(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'incident_entity_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'location_entity_id');
    }

    public function revivedBy(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'revived_by_entity_id');
    }
}
