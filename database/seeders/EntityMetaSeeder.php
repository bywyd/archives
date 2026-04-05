<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class EntityMetaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $entityTypes = [
            ['name' => 'Person', 'slug' => 'person', 'description' => 'An individual human being.', 'icon' => 'user', 'color' => '#3B82F6'],
            ['name' => 'Organization', 'slug' => 'organization', 'description' => 'A group of people organized for a specific purpose.', 'icon' => 'building', 'color' => '#8B5CF6'],
            ['name' => 'Event', 'slug' => 'event', 'description' => 'A significant occurrence or happening.', 'icon' => 'calendar', 'color' => '#F59E0B'],
            ['name' => 'Location', 'slug' => 'location', 'description' => 'A specific location or area.', 'icon' => 'map-pin', 'color' => '#10B981'],
            ['name' => 'Place', 'slug' => 'place', 'description' => 'A specific place or site.', 'icon' => 'landmark', 'color' => '#06B6D4'],
            ['name' => 'Artifact', 'slug' => 'artifact', 'description' => 'An object made by humans, typically of historical or cultural interest.', 'icon' => 'gem', 'color' => '#F97316'],
            ['name' => 'Concept', 'slug' => 'concept', 'description' => 'An abstract idea or notion.', 'icon' => 'lightbulb', 'color' => '#A855F7'],
            ['name' => 'Weapon', 'slug' => 'weapon', 'description' => 'An object used to inflict harm or damage.', 'icon' => 'swords', 'color' => '#EF4444'],
            ['name' => 'Vehicle', 'slug' => 'vehicle', 'description' => 'A means of transportation.', 'icon' => 'car', 'color' => '#64748B'],
            ['name' => 'Building', 'slug' => 'building', 'description' => 'A structure with a roof and walls.', 'icon' => 'building-2', 'color' => '#78716C'],
            ['name' => 'Document', 'slug' => 'document', 'description' => 'A written or printed work.', 'icon' => 'file-text', 'color' => '#D4A574'],
            ['name' => 'Natural Phenomenon', 'slug' => 'natural-phenomenon', 'description' => 'A naturally occurring event or process.', 'icon' => 'zap', 'color' => '#FBBF24'],
            ['name' => 'Virus', 'slug' => 'virus', 'description' => 'A microscopic infectious agent that replicates inside the living cells of an organism.', 'icon' => 'bug', 'color' => '#DC2626'],
            ['name' => 'Disease', 'slug' => 'disease', 'description' => 'A disorder of structure or function in a human, animal, or plant.', 'icon' => 'heart-pulse', 'color' => '#B91C1C'],
            ['name' => 'Medication', 'slug' => 'medication', 'description' => 'A substance used for medical treatment, especially a medicine or drug.', 'icon' => 'pill', 'color' => '#22D3EE'],
            ['name' => 'Anti-Virus', 'slug' => 'anti-virus', 'description' => 'A substance designed to counteract or neutralize a virus.', 'icon' => 'shield-check', 'color' => '#4ADE80'],
            ['name' => 'Creature', 'slug' => 'creature', 'description' => 'A living being, especially an animal or mutated organism.', 'icon' => 'skull', 'color' => '#7C3AED'],
            ['name' => 'Technology', 'slug' => 'technology', 'description' => 'A technological system, device, or piece of equipment.', 'icon' => 'cpu', 'color' => '#0EA5E9'],
            ['name' => 'Species', 'slug' => 'species', 'description' => 'A group of living organisms with shared characteristics.', 'icon' => 'dna', 'color' => '#14B8A6'],
            ['name' => 'Faction', 'slug' => 'faction', 'description' => 'A subgroup within a larger group, often with distinct goals.', 'icon' => 'flag', 'color' => '#E11D48'],
            ['name' => 'Parasite', 'slug' => 'parasite', 'description' => 'A biological organism that lives on or in a host organism, often controlling or modifying host behavior.', 'icon' => 'bug', 'color' => '#9333EA'],
            ['name' => 'Compound', 'slug' => 'compound', 'description' => 'A chemical substance, cure, vaccine, or pharmaceutical compound.', 'icon' => 'flask-conical', 'color' => '#06D6A0'],
            ['name' => 'Research Project', 'slug' => 'research-project', 'description' => 'A classified or public research program or scientific project.', 'icon' => 'microscope', 'color' => '#FF6B6B'],
            ['name' => 'Incident', 'slug' => 'incident', 'description' => 'A specific documented incident, outbreak, or crisis event.', 'icon' => 'alert-triangle', 'color' => '#FF4444'],
            ['name' => 'Facility', 'slug' => 'facility', 'description' => 'A research lab, military installation, or specialized building complex.', 'icon' => 'factory', 'color' => '#475569'],
            ['name' => 'Transmission', 'slug' => 'transmission', 'description' => 'A recorded communication, radio transmission, or conversation between entities.', 'icon' => 'radio', 'color' => '#38BDF8'],
            ['name' => 'Map', 'slug' => 'map', 'description' => 'A floor-plan or geographical map belonging to a location, building, or facility.', 'icon' => 'map', 'color' => '#22C55E'],
        ];

        foreach ($entityTypes as $type) {
            \App\Models\MetaEntityType::create($type);
        }

        $entityRelationTypes = [
            ['name' => 'Parent Of', 'slug' => 'parent-of', 'description' => 'A hierarchical relationship where one entity is the parent of another.', 'inverse_name' => 'Child Of', 'is_directional' => true],
            ['name' => 'Child Of', 'slug' => 'child-of', 'description' => 'A hierarchical relationship where one entity is the child of another.', 'inverse_name' => 'Parent Of', 'is_directional' => true],
            ['name' => 'Spouse Of', 'slug' => 'spouse-of', 'description' => 'A relationship where two entities are married to each other.', 'inverse_name' => 'Spouse Of', 'is_directional' => false],
            ['name' => 'Sibling Of', 'slug' => 'sibling-of', 'description' => 'A relationship where two entities share parents.', 'inverse_name' => 'Sibling Of', 'is_directional' => false],
            ['name' => 'Associated With', 'slug' => 'associated-with', 'description' => 'A general association between two entities.', 'inverse_name' => 'Associated With', 'is_directional' => false],
            ['name' => 'Member Of', 'slug' => 'member-of', 'description' => 'A relationship where one entity is a member of an organization/group.', 'inverse_name' => 'Has Member', 'is_directional' => true],
            ['name' => 'Leader Of', 'slug' => 'leader-of', 'description' => 'A relationship where one entity leads another.', 'inverse_name' => 'Led By', 'is_directional' => true],
            ['name' => 'Participated In', 'slug' => 'participated-in', 'description' => 'A relationship where one entity participates in an event or activity.', 'inverse_name' => 'Had Participant', 'is_directional' => true],
            ['name' => 'Located At', 'slug' => 'located-at', 'description' => 'A relationship where one entity is located at a specific place.', 'inverse_name' => 'Location Of', 'is_directional' => true],
            ['name' => 'Created By', 'slug' => 'created-by', 'description' => 'A relationship where one entity was created or developed by another.', 'inverse_name' => 'Creator Of', 'is_directional' => true],
            ['name' => 'Infected By', 'slug' => 'infected-by', 'description' => 'A relationship where one entity was infected by a virus or pathogen.', 'inverse_name' => 'Infected', 'is_directional' => true],
            ['name' => 'Enemy Of', 'slug' => 'enemy-of', 'description' => 'A hostile relationship between two entities.', 'inverse_name' => 'Enemy Of', 'is_directional' => false],
            ['name' => 'Allied With', 'slug' => 'allied-with', 'description' => 'A cooperative relationship between two entities.', 'inverse_name' => 'Allied With', 'is_directional' => false],
            ['name' => 'Employed By', 'slug' => 'employed-by', 'description' => 'An employment relationship.', 'inverse_name' => 'Employer Of', 'is_directional' => true],
            ['name' => 'Mutation Of', 'slug' => 'mutation-of', 'description' => 'A relationship where one entity is a mutation or derivative of another.', 'inverse_name' => 'Mutated Into', 'is_directional' => true],
            ['name' => 'Derived From', 'slug' => 'derived-from', 'description' => 'A relationship where one entity is derived or evolved from another.', 'inverse_name' => 'Gave Rise To', 'is_directional' => true],
            ['name' => 'Contains', 'slug' => 'contains', 'description' => 'A relationship where one entity contains another.', 'inverse_name' => 'Contained In', 'is_directional' => true],
            ['name' => 'Killed By', 'slug' => 'killed-by', 'description' => 'A relationship indicating one entity was killed by another.', 'inverse_name' => 'Killed', 'is_directional' => true],
            ['name' => 'Mentor Of', 'slug' => 'mentor-of', 'description' => 'A mentoring relationship.', 'inverse_name' => 'Mentored By', 'is_directional' => true],
            ['name' => 'Predecessor Of', 'slug' => 'predecessor-of', 'description' => 'A succession relationship.', 'inverse_name' => 'Successor Of', 'is_directional' => true],
            ['name' => 'Cured By', 'slug' => 'cured-by', 'description' => 'A relationship where one entity was cured or treated by another.', 'inverse_name' => 'Cured', 'is_directional' => true],
            ['name' => 'Researched', 'slug' => 'researched', 'description' => 'A relationship where one entity researched or studied another.', 'inverse_name' => 'Researched By', 'is_directional' => true],
            ['name' => 'Prototype Of', 'slug' => 'prototype-of', 'description' => 'A relationship where one entity is an earlier version or prototype of another.', 'inverse_name' => 'Derived From Prototype', 'is_directional' => true],
            ['name' => 'Rival Of', 'slug' => 'rival-of', 'description' => 'A competitive or antagonistic rivalry.', 'inverse_name' => 'Rival Of', 'is_directional' => false],
            ['name' => 'Subordinate Of', 'slug' => 'subordinate-of', 'description' => 'An entity operating under the authority of another.', 'inverse_name' => 'Commands', 'is_directional' => true],
            ['name' => 'Deployed At', 'slug' => 'deployed-at', 'description' => 'A B.O.W. or operative deployed at a specific location.', 'inverse_name' => 'Deployment Site Of', 'is_directional' => true],
            ['name' => 'Experimented On', 'slug' => 'experimented-on', 'description' => 'One entity used as a test subject by another.', 'inverse_name' => 'Experimented On By', 'is_directional' => true],
            ['name' => 'Saved By', 'slug' => 'saved-by', 'description' => 'One entity rescued or saved by another.', 'inverse_name' => 'Saved', 'is_directional' => true],
            ['name' => 'Betrayed By', 'slug' => 'betrayed-by', 'description' => 'One entity was betrayed by another.', 'inverse_name' => 'Betrayed', 'is_directional' => true],
            ['name' => 'Hosts', 'slug' => 'hosts', 'description' => 'An entity serves as host organism for a parasite or virus.', 'inverse_name' => 'Hosted By', 'is_directional' => true],
            ['name' => 'Used By', 'slug' => 'used-by', 'description' => 'A weapon, tool, or piece of equipment used by a character.', 'inverse_name' => 'Uses', 'is_directional' => true],
            ['name' => 'Has Map', 'slug' => 'has-map', 'description' => 'A relationship where one entity owns or contains a map.', 'inverse_name' => 'Is Map Of', 'is_directional' => true],
            ['name' => 'Part Of', 'slug' => 'part-of', 'description' => 'A relationship where one entity is a sub-part or sub-event of another.', 'inverse_name' => 'Has Part', 'is_directional' => true],
        ];

        foreach ($entityRelationTypes as $type) {
            \App\Models\MetaEntityRelationType::create($type);
        }

        $entityStatuses = [
            ['name' => 'Alive', 'slug' => 'alive', 'description' => 'The entity is currently alive and active.', 'color' => '#22C55E'],
            ['name' => 'Deceased', 'slug' => 'deceased', 'description' => 'The entity is dead.', 'color' => '#EF4444'],
            ['name' => 'Unknown', 'slug' => 'unknown', 'description' => 'The status of the entity is unknown.', 'color' => '#6B7280'],
            ['name' => 'Missing', 'slug' => 'missing', 'description' => 'The entity is missing or unaccounted for.', 'color' => '#F59E0B'],
            ['name' => 'Active', 'slug' => 'active', 'description' => 'The entity is currently active or operational.', 'color' => '#3B82F6'],
            ['name' => 'Inactive', 'slug' => 'inactive', 'description' => 'The entity is no longer active.', 'color' => '#9CA3AF'],
            ['name' => 'Destroyed', 'slug' => 'destroyed', 'description' => 'The entity has been destroyed.', 'color' => '#DC2626'],
            ['name' => 'Infected', 'slug' => 'infected', 'description' => 'The entity has been infected by a pathogen.', 'color' => '#A855F7'],
            ['name' => 'Mutated', 'slug' => 'mutated', 'description' => 'The entity has undergone mutation.', 'color' => '#7C3AED'],
            ['name' => 'Classified', 'slug' => 'classified', 'description' => 'The status is classified or restricted.', 'color' => '#1E293B'],
            ['name' => 'Cured', 'slug' => 'cured', 'description' => 'The entity was infected but has been cured or treated.', 'color' => '#34D399'],
            ['name' => 'Dormant', 'slug' => 'dormant', 'description' => 'The entity is in a dormant or suspended state.', 'color' => '#6366F1'],
            ['name' => 'Transformed', 'slug' => 'transformed', 'description' => 'The entity has undergone a significant transformation.', 'color' => '#C084FC'],
            ['name' => 'Disbanded', 'slug' => 'disbanded', 'description' => 'The organization or group has been disbanded.', 'color' => '#94A3B8'],
            ['name' => 'Compromised', 'slug' => 'compromised', 'description' => 'The entity has been compromised or corrupted.', 'color' => '#FB923C'],
            ['name' => 'Contained', 'slug' => 'contained', 'description' => 'The entity is contained or under control.', 'color' => '#38BDF8'],
            ['name' => 'Eradicated', 'slug' => 'eradicated', 'description' => 'The entity has been completely eradicated or eliminated.', 'color' => '#F43F5E'],
            ['name' => 'Under Protection', 'slug' => 'under-protection', 'description' => 'The entity is under government or organizational protection.', 'color' => '#2DD4BF'],
        ];

        foreach ($entityStatuses as $status) {
            \App\Models\MetaEntityStatus::create($status);
        }
    }
}
