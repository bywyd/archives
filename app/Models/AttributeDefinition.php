<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttributeDefinition extends Model
{
    protected $fillable = [
        'meta_entity_type_id',
        'name',
        'slug',
        'data_type',
        'group_name',
        'is_filterable',
        'is_required',
        'default_value',
        'sort_order',
    ];

    protected $casts = [
        'is_filterable' => 'boolean',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function entityType(): BelongsTo
    {
        return $this->belongsTo(MetaEntityType::class, 'meta_entity_type_id');
    }

    public function entityAttributes(): HasMany
    {
        return $this->hasMany(EntityAttribute::class);
    }
}
