<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityAffiliationHistory extends Model
{
    use BustsEntityCache;

    protected $table = 'entity_affiliation_history';

    protected $fillable = [
        'entity_id',
        'organization_entity_id',
        'organization_name',
        'role',
        'rank',
        'fictional_start',
        'fictional_end',
        'status',
        'notes',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'organization_entity_id');
    }
}
