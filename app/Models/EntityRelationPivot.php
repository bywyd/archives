<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class EntityRelationPivot extends Pivot
{
    protected $table = 'entity_relations';
}