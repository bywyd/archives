<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaEntityStatus extends Model
{
    protected $table = 'meta_entity_statuses';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
    ];

    public function entities(): HasMany
    {
        return $this->hasMany(Entity::class, 'entity_status_id');
    }
}
