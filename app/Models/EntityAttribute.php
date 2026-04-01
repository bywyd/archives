<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityAttribute extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'attribute_definition_id',
        'value',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(AttributeDefinition::class, 'attribute_definition_id');
    }
}
