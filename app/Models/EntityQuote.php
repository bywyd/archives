<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityQuote extends Model
{
    use BustsEntityCache;

    protected $fillable = [
        'entity_id',
        'quote',
        'context',
        'source_media_id',
        'fictional_date',
        'is_featured',
        'sort_order',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function sourceMedia(): BelongsTo
    {
        return $this->belongsTo(MediaSource::class, 'source_media_id');
    }
}
