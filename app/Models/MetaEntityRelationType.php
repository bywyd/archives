<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaEntityRelationType extends Model
{
    protected $table = 'meta_entity_relation_types';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'inverse_name',
        'is_directional',
    ];

    protected $casts = [
        'is_directional' => 'boolean',
    ];

    public function relations(): HasMany
    {
        return $this->hasMany(EntityRelation::class, 'relation_type_id');
    }
}
