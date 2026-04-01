<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class EntityTimelinePivot extends Pivot
{
    protected $table = 'entity_timeline_pivots';

    public $incrementing = true;

    protected $fillable = [
        'entity_id',
        'timeline_id',
        'role',
        'notes',
        'fictional_start',
        'fictional_end',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function timeline(): BelongsTo
    {
        return $this->belongsTo(Timeline::class);
    }
}
