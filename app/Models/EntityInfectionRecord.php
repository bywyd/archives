<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityInfectionRecord extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'pathogen_entity_id',
        'cure_entity_id',
        'pathogen_name',
        'infection_method',
        'cure_name',
        'cure_method',
        'fictional_date_infected',
        'fictional_date_cured',
        'status',
        'severity',
        'side_effects',
        'symptoms_exhibited',
        'notes',
        'sort_order',
    ];

    protected $casts = [
        'side_effects' => 'array',
        'symptoms_exhibited' => 'array',
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function pathogen(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'pathogen_entity_id');
    }

    public function cure(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'cure_entity_id');
    }
}
