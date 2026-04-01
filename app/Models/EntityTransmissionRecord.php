<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityTransmissionRecord extends Model
{
    use BustsEntityCache;

    protected static function entityForeignKey(): string
    {
        return 'transmission_entity_id';
    }

    protected $fillable = [
        'transmission_entity_id',
        'speaker_entity_id',
        'speaker_label',
        'content',
        'content_type',
        'tone',
        'fictional_timestamp',
        'is_redacted',
        'redacted_reason',
        'notes',
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'is_redacted' => 'boolean',
        'metadata' => 'array',
    ];

    public function transmission(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'transmission_entity_id');
    }

    public function speaker(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'speaker_entity_id');
    }
}
