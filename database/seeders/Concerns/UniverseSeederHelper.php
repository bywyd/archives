<?php

namespace Database\Seeders\Concerns;

use App\Models\AttributeDefinition;
use App\Models\Entity;
use App\Models\EntityAlias;
use App\Models\EntityAttribute;
use App\Models\EntitySection;
use App\Models\MetaEntityRelationType;
use App\Models\MetaEntityStatus;
use App\Models\MetaEntityType;

trait UniverseSeederHelper
{
    protected array $types = [];
    protected array $statuses = [];
    protected array $relTypes = [];
    protected array $attrDefs = [];

    protected function loadLookups(): void
    {
        foreach (MetaEntityType::all() as $t) {
            $this->types[$t->slug] = $t->id;
        }
        foreach (MetaEntityStatus::all() as $s) {
            $this->statuses[$s->slug] = $s->id;
        }
        foreach (MetaEntityRelationType::all() as $r) {
            $this->relTypes[$r->slug] = $r->id;
        }
        foreach (AttributeDefinition::all() as $a) {
            $this->attrDefs[$a->meta_entity_type_id . '.' . $a->slug] = $a->id;
        }
    }

    protected function makeEntity(int $universeId, array $data): Entity
    {
        return Entity::create([
            'universe_id'       => $universeId,
            'name'              => $data['name'],
            'slug'              => $data['slug'],
            'short_description' => $data['short_description'] ?? null,
            'content'           => $data['content'] ?? null,
            'entity_type_id'    => $this->types[$data['type']],
            'entity_status_id'  => $this->statuses[$data['status']],
            'is_featured'       => $data['is_featured'] ?? false,
            'metadata'          => $data['metadata'] ?? null,
        ]);
    }

    protected function addAliases(Entity $entity, array $aliases): void
    {
        foreach ($aliases as $a) {
            EntityAlias::create([
                'entity_id' => $entity->id,
                'alias'     => $a['alias'],
                'context'   => $a['context'] ?? null,
            ]);
        }
    }

    protected function addSections(Entity $entity, array $sections): void
    {
        foreach ($sections as $s) {
            EntitySection::create([
                'entity_id'      => $entity->id,
                'title'          => $s['title'],
                'slug'           => $s['slug'],
                'content'        => $s['content'],
                'sort_order'     => $s['sort_order'],
                'is_collapsible' => $s['is_collapsible'] ?? false,
            ]);
        }
    }

    protected function addAttrs(Entity $entity, int $typeId, array $attrs): void
    {
        foreach ($attrs as $slug => $value) {
            $key = $typeId . '.' . $slug;
            $defId = $this->attrDefs[$key] ?? null;
            if ($defId === null) {
                continue;
            }
            EntityAttribute::create([
                'entity_id'               => $entity->id,
                'attribute_definition_id' => $defId,
                'value'                   => is_array($value) ? json_encode($value) : (string) $value,
            ]);
        }
    }

    protected function addPersonAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['person'], $attrs);
    }

    protected function addOrgAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['organization'], $attrs);
    }

    protected function addLocationAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['location'], $attrs);
    }

    protected function addVirusAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['virus'], $attrs);
    }

    protected function addCreatureAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['creature'], $attrs);
    }

    protected function addFacilityAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['facility'], $attrs);
    }

    protected function addWeaponAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['weapon'], $attrs);
    }

    protected function addTechAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['technology'], $attrs);
    }

    protected function addIncidentAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['incident'], $attrs);
    }

    protected function addEventAttrs(Entity $entity, array $attrs): void
    {
        $this->addAttrs($entity, $this->types['event'], $attrs);
    }

    protected function relate(
        Entity $from,
        Entity $to,
        int $typeId,
        ?string $description = null,
        int $sortOrder = 0,
        ?string $fictionalStart = null,
        ?string $fictionalEnd = null,
        ?string $status = null,
    ): void {
        \App\Models\EntityRelation::create([
            'from_entity_id'   => $from->id,
            'to_entity_id'     => $to->id,
            'relation_type_id' => $typeId,
            'description'      => $description,
            'sort_order'       => $sortOrder,
            'fictional_start'  => $fictionalStart,
            'fictional_end'    => $fictionalEnd,
            'status'           => $status,
        ]);
    }
}
