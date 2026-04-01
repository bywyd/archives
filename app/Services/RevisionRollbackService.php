<?php

namespace App\Services;

use App\Models\Entity;
use App\Models\EntitySection;
use App\Models\Revision;
use App\Models\Universe;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RevisionRollbackService
{
    /**
     * Supported rollback matrix:
     *   updated  + Entity        → apply old_values fields back to the entity
     *   updated  + EntitySection → apply old_values fields back to the section
     *   deleted  + EntitySection → re-create the section from old_values
     *   created  + EntitySection → delete the vandal section
     *
     * Entity create/delete revisions are not supported here; use restore() for soft-deletes.
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException (via abort)
     */
    public function rollback(Entity $entity, Revision $revision): void
    {
        $modelType = class_basename($revision->revisionable_type);

        // Validate ownership: revision must belong to this entity or one of its sections
        $this->assertBelongsToEntity($entity, $revision, $modelType);

        DB::transaction(function () use ($entity, $revision, $modelType) {
            match (true) {
                $revision->action === 'updated' && $modelType === 'Entity'        => $this->rollbackUpdatedEntity($entity, $revision),
                $revision->action === 'updated' && $modelType === 'EntitySection' => $this->rollbackUpdatedSection($revision),
                $revision->action === 'deleted' && $modelType === 'EntitySection' => $this->rollbackDeletedSection($entity, $revision),
                $revision->action === 'created' && $modelType === 'EntitySection' => $this->rollbackCreatedSection($revision),
                default                                                            => abort(422, 'This revision type cannot be rolled back.'),
            };
        });

        // Bust entity show cache after any rollback
        $entity->flushCache();
    }

    /**
     * Restore a soft-deleted Entity within the given Universe.
     */
    public function restore(Universe $universe, int $entityId): Entity
    {
        $entity = Entity::withTrashed()
            ->where('id', $entityId)
            ->where('universe_id', $universe->id)
            ->firstOrFail();

        abort_unless($entity->trashed(), 422, 'Entity is not deleted and cannot be restored.');

        DB::transaction(fn () => $entity->restore());

        $entity->flushCache();

        return $entity->fresh();
    }

    //  Private helpers 

    private function assertBelongsToEntity(Entity $entity, Revision $revision, string $modelType): void
    {
        if ($modelType === 'Entity') {
            abort_unless(
                (int) $revision->revisionable_id === $entity->id,
                403,
                'This revision does not belong to the specified entity.'
            );
            return;
        }

        if ($modelType === 'EntitySection') {
            $sectionIds = $entity->sections()->pluck('id');
            abort_unless(
                $sectionIds->contains((int) $revision->revisionable_id),
                403,
                'This revision does not belong to a section of the specified entity.'
            );
            return;
        }

        abort(422, 'This revision type cannot be rolled back.');
    }

    private function rollbackUpdatedEntity(Entity $entity, Revision $revision): void
    {
        $old = $revision->old_values ?? [];

        if (empty($old)) {
            return;
        }

        $fillable = $entity->getFillable();
        $safeValues = collect($old)->only($fillable)->toArray();

        if (!empty($safeValues)) {
            $entity->fill($safeValues)->save();
        }
    }

    private function rollbackUpdatedSection(Revision $revision): void
    {
        $section = EntitySection::find((int) $revision->revisionable_id);

        if (!$section) {
            abort(404, 'The section no longer exists. It may have been deleted.');
        }

        $old = $revision->old_values ?? [];

        if (empty($old)) {
            return;
        }

        $fillable = $section->getFillable();
        $safeValues = collect($old)->only($fillable)->toArray();

        if (!empty($safeValues)) {
            $section->fill($safeValues)->save();
        }
    }

    private function rollbackDeletedSection(Entity $entity, Revision $revision): void
    {
        $old = $revision->old_values ?? [];

        if (empty($old)) {
            abort(422, 'No data available to restore the deleted section.');
        }

        $fillable = (new EntitySection())->getFillable();
        $data = collect($old)->only($fillable)->toArray();

        // Ensure the section belongs to this entity
        $data['entity_id'] = $entity->id;

        // Guard against slug conflicts (UNIQUE constraint on entity_id + slug)
        if (!empty($data['slug'])) {
            $slugExists = EntitySection::where('entity_id', $entity->id)
                ->where('slug', $data['slug'])
                ->exists();

            if ($slugExists) {
                $data['slug'] = $data['slug'] . '-restored-' . now()->timestamp;
            }
        }

        EntitySection::create($data);
    }

    private function rollbackCreatedSection(Revision $revision): void
    {
        $section = EntitySection::find((int) $revision->revisionable_id);

        // If it's already gone, nothing to do
        if ($section) {
            $section->delete();
        }
    }
}
