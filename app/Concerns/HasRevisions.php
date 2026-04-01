<?php

namespace App\Concerns;

use App\Models\Revision;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Auth;

/**
 * Automatically creates revision records when a model is created, updated, or deleted.
 *
 * Usage:
 *   1. Add `use HasRevisions;` to the model.
 *   2. Optionally set `protected array $revisionExclude = [...]` to skip certain attributes.
 */
trait HasRevisions
{
    protected static function bootHasRevisions(): void
    {
        static::created(function ($model) {
            $model->recordRevision('created', [], $model->getRevisionableAttributes());
        });

        static::updated(function ($model) {
            $dirty = $model->getDirty();
            $exclude = $model->getRevisionExclude();
            $changed = array_diff_key($dirty, array_flip($exclude));

            if (empty($changed)) {
                return;
            }

            $old = array_intersect_key($model->getOriginal(), $changed);

            $model->recordRevision('updated', $old, $changed);
        });

        static::deleted(function ($model) {
            $model->recordRevision('deleted', $model->getRevisionableAttributes(), []);
        });
    }

    public function revisions(): MorphMany
    {
        return $this->morphMany(Revision::class, 'revisionable');
    }

    protected function recordRevision(string $action, array $oldValues, array $newValues): void
    {
        Revision::create([
            'revisionable_id' => $this->getKey(),
            'revisionable_type' => $this->getMorphClass(),
            'user_id' => Auth::id(),
            'action' => $action,
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'created_at' => now(),
        ]);
    }

    protected function getRevisionableAttributes(): array
    {
        $exclude = $this->getRevisionExclude();

        return array_diff_key($this->getAttributes(), array_flip($exclude));
    }

    protected function getRevisionExclude(): array
    {
        return property_exists($this, 'revisionExclude')
            ? $this->revisionExclude
            : ['created_at', 'updated_at', 'deleted_at'];
    }
}
