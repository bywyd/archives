<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityConsciousnessRecord extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'vessel_entity_id',
        'status',
        'transfer_method',
        'vessel_status',
        'fictional_date_start',
        'fictional_date_end',
        'description',
        'notes',
        'side_effects',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'side_effects' => 'array',
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function vessel(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'vessel_entity_id');
    }
}
