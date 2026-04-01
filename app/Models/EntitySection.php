<?php

namespace App\Models;

use App\Concerns\BustsEntityCache;
use App\Concerns\HasImage;
use App\Concerns\HasRevisions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EntitySection extends Model
{
    use BustsEntityCache, HasImage, HasRevisions;

    protected $fillable = [
        'entity_id',
        'title',
        'slug',
        'section_type',
        'content',
        'sort_order',
        'is_collapsible',
        'parent_id',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_collapsible' => 'boolean',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(EntitySection::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(EntitySection::class, 'parent_id')->orderBy('sort_order');
    }

    public function crossReferences(): HasMany
    {
        return $this->hasMany(EntityCrossReference::class, 'source_section_id');
    }
}
