<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityTransmissionRelation extends Model
{
    use BustsEntityCache;

    protected static function entityForeignKey(): string
    {
        return 'transmission_entity_id';
    }

    protected $fillable = [
        'transmission_entity_id',
        'participant_entity_id',
        'role',
        'callsign',
        'channel',
        'is_present',
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'is_present' => 'boolean',
        'metadata' => 'array',
    ];

    public function transmission(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'transmission_entity_id');
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'participant_entity_id');
    }
}
