<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityCrossReference extends Model
{
    protected $fillable = [
        'source_entity_id',
        'target_entity_id',
        'source_section_id',
        'context',
    ];

    public function sourceEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'source_entity_id');
    }

    public function targetEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'target_entity_id');
    }

    public function sourceSection(): BelongsTo
    {
        return $this->belongsTo(EntitySection::class, 'source_section_id');
    }
}
