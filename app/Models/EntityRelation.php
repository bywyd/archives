<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityRelation extends Model
{
    use BustsEntityCache;
    protected $table = 'entity_relations';
    
    /**
     * Bust both sides of the relation  entity show embeds both
     * outgoing and incoming relations in its cached payload.
     */
    protected function flushEntityCache(): void
    {
        foreach (array_filter([$this->from_entity_id, $this->to_entity_id]) as $entityId) {
            $this->forgetEntityShowCache((int) $entityId);
        }
    }

    protected $fillable = [
        'from_entity_id',
        'to_entity_id',
        'relation_type_id',
        'description',
        'context',
        'fictional_start',
        'fictional_end',
        'status',
        'metadata',
        'sort_order',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sort_order' => 'integer',
    ];

    public function fromEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'from_entity_id');
    }

    public function toEntity(): BelongsTo
    {
        return $this->belongsTo(Entity::class, 'to_entity_id');
    }

    public function relationType(): BelongsTo
    {
        return $this->belongsTo(MetaEntityRelationType::class, 'relation_type_id');
    }
}
