<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaEntityType extends Model
{
    protected $table = 'meta_entity_types';

    public function resolveRouteBinding($value, $field = null): ?static
    {
        return is_numeric($value)
            ? $this->where('id', $value)->first()
            : $this->where('slug', $value)->first();
    }

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'schema',
    ];

    protected $casts = [
        'schema' => 'array',
    ];

    public function entities(): HasMany
    {
        return $this->hasMany(Entity::class, 'entity_type_id');
    }

    public function attributeDefinitions(): HasMany
    {
        return $this->hasMany(AttributeDefinition::class, 'meta_entity_type_id');
    }
}
