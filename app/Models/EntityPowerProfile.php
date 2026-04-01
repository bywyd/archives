<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityPowerProfile extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'source_entity_id',
        'name',
        'description',
        'source',
        'category',
        'power_level',
        'status',
        'fictional_date_acquired',
        'fictional_date_lost',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function sourceEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'source_entity_id');
    }
}
