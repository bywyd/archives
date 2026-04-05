<?php

namespace Database\Seeders;

use App\Models\AttributeDefinition;
use App\Models\MetaEntityType;
use Illuminate\Database\Seeder;

class AttributeDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        $personType = MetaEntityType::where('slug', 'person')->first();
        $virusType = MetaEntityType::where('slug', 'virus')->first();
        $creatureType = MetaEntityType::where('slug', 'creature')->first();
        $locationType = MetaEntityType::where('slug', 'location')->first();
        $orgType = MetaEntityType::where('slug', 'organization')->first();
        $weaponType = MetaEntityType::where('slug', 'weapon')->first();

        // Person attributes
        $personAttrs = [
            ['name' => 'Date of Birth', 'slug' => 'date-of-birth', 'data_type' => 'string', 'group_name' => 'Biography', 'is_filterable' => true, 'sort_order' => 1],
            ['name' => 'Date of Death', 'slug' => 'date-of-death', 'data_type' => 'string', 'group_name' => 'Biography', 'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Gender', 'slug' => 'gender', 'data_type' => 'string', 'group_name' => 'Biography', 'is_filterable' => true, 'sort_order' => 3],
            ['name' => 'Nationality', 'slug' => 'nationality', 'data_type' => 'string', 'group_name' => 'Biography', 'is_filterable' => true, 'sort_order' => 4],
            ['name' => 'Ethnicity', 'slug' => 'ethnicity', 'data_type' => 'string', 'group_name' => 'Biography', 'sort_order' => 5],
            ['name' => 'Height', 'slug' => 'height', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 10],
            ['name' => 'Weight', 'slug' => 'weight', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 11],
            ['name' => 'Blood Type', 'slug' => 'blood-type', 'data_type' => 'string', 'group_name' => 'Physical', 'is_filterable' => true, 'sort_order' => 12],
            ['name' => 'Eye Color', 'slug' => 'eye-color', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 13],
            ['name' => 'Hair Color', 'slug' => 'hair-color', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 14],
            ['name' => 'Occupation', 'slug' => 'occupation', 'data_type' => 'string', 'group_name' => 'Background', 'is_filterable' => true, 'sort_order' => 20],
            ['name' => 'Affiliation', 'slug' => 'affiliation', 'data_type' => 'string', 'group_name' => 'Background', 'is_filterable' => true, 'sort_order' => 21],
            ['name' => 'Rank', 'slug' => 'rank', 'data_type' => 'string', 'group_name' => 'Background', 'sort_order' => 22],
            ['name' => 'Infection Status', 'slug' => 'infection-status', 'data_type' => 'string', 'group_name' => 'Medical', 'is_filterable' => true, 'sort_order' => 30],
            ['name' => 'Abilities', 'slug' => 'abilities', 'data_type' => 'json', 'group_name' => 'Combat', 'sort_order' => 40],
            ['name' => 'Weaknesses', 'slug' => 'weaknesses', 'data_type' => 'json', 'group_name' => 'Combat', 'sort_order' => 41],
        ];

        foreach ($personAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $personType?->id]));
        }

        // Virus attributes
        $virusAttrs = [
            ['name' => 'Discovery Date', 'slug' => 'discovery-date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 1],
            ['name' => 'Classification', 'slug' => 'classification', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Transmission Method', 'slug' => 'transmission-method', 'data_type' => 'string', 'group_name' => 'Characteristics', 'sort_order' => 10],
            ['name' => 'Mortality Rate', 'slug' => 'mortality-rate', 'data_type' => 'string', 'group_name' => 'Characteristics', 'sort_order' => 11],
            ['name' => 'Incubation Period', 'slug' => 'incubation-period', 'data_type' => 'string', 'group_name' => 'Characteristics', 'sort_order' => 12],
            ['name' => 'Symptoms', 'slug' => 'symptoms', 'data_type' => 'json', 'group_name' => 'Effects', 'sort_order' => 20],
            ['name' => 'Mutations', 'slug' => 'mutations', 'data_type' => 'json', 'group_name' => 'Effects', 'sort_order' => 21],
            ['name' => 'Known Cure', 'slug' => 'known-cure', 'data_type' => 'string', 'group_name' => 'Treatment', 'sort_order' => 30],
        ];

        foreach ($virusAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $virusType?->id]));
        }

        // Creature attributes
        $creatureAttrs = [
            ['name' => 'Species Origin', 'slug' => 'species-origin', 'data_type' => 'string', 'group_name' => 'Biology', 'sort_order' => 1],
            ['name' => 'Threat Level', 'slug' => 'threat-level', 'data_type' => 'string', 'group_name' => 'Assessment', 'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Height', 'slug' => 'height', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 10],
            ['name' => 'Weight', 'slug' => 'weight', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 11],
            ['name' => 'Attacks', 'slug' => 'attacks', 'data_type' => 'json', 'group_name' => 'Combat', 'sort_order' => 20],
            ['name' => 'Weaknesses', 'slug' => 'weaknesses', 'data_type' => 'json', 'group_name' => 'Combat', 'sort_order' => 21],
        ];

        foreach ($creatureAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $creatureType?->id]));
        }

        // Location attributes
        $locationAttrs = [
            ['name' => 'Region', 'slug' => 'region', 'data_type' => 'string', 'group_name' => 'Geography', 'is_filterable' => true, 'sort_order' => 1],
            ['name' => 'Country', 'slug' => 'country', 'data_type' => 'string', 'group_name' => 'Geography', 'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Coordinates', 'slug' => 'coordinates', 'data_type' => 'string', 'group_name' => 'Geography', 'sort_order' => 3],
            ['name' => 'Longitude', 'slug' => 'longitude', 'data_type' => 'string', 'group_name' => 'Geography', 'sort_order' => 4],
            ['name' => 'Latitude', 'slug' => 'latitude', 'data_type' => 'string', 'group_name' => 'Geography', 'sort_order' => 5],
            ['name' => 'Population', 'slug' => 'population', 'data_type' => 'string', 'group_name' => 'Demographics', 'sort_order' => 10],
            ['name' => 'Security Level', 'slug' => 'security-level', 'data_type' => 'string', 'group_name' => 'Status', 'is_filterable' => true, 'sort_order' => 20],
        ];

        foreach ($locationAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $locationType?->id]));
        }

        // Organization attributes
        $orgAttrs = [
            ['name' => 'Founded', 'slug' => 'founded', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 1],
            ['name' => 'Dissolved', 'slug' => 'dissolved', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 2],
            ['name' => 'Headquarters', 'slug' => 'headquarters', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
            ['name' => 'Type', 'slug' => 'org-type', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 4],
            ['name' => 'Motto', 'slug' => 'motto', 'data_type' => 'string', 'group_name' => 'Identity', 'sort_order' => 10],
        ];

        foreach ($orgAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $orgType?->id]));
        }

        // Weapon attributes
        $weaponAttrs = [
            ['name' => 'Weapon Type', 'slug' => 'weapon-type', 'data_type' => 'string', 'group_name' => 'Specifications', 'is_filterable' => true, 'sort_order' => 1],
            ['name' => 'Manufacturer', 'slug' => 'manufacturer', 'data_type' => 'string', 'group_name' => 'Specifications', 'sort_order' => 2],
            ['name' => 'Caliber', 'slug' => 'caliber', 'data_type' => 'string', 'group_name' => 'Specifications', 'sort_order' => 3],
            ['name' => 'Damage Rating', 'slug' => 'damage-rating', 'data_type' => 'string', 'group_name' => 'Performance', 'sort_order' => 10],
            ['name' => 'Effective Range', 'slug' => 'effective-range', 'data_type' => 'string', 'group_name' => 'Performance', 'sort_order' => 11],
        ];

        foreach ($weaponAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $weaponType?->id]));
        }

        // Extended Person attributes
        $personExtended = [
            ['name' => 'Voice Actor', 'slug' => 'voice-actor', 'data_type' => 'string', 'group_name' => 'Meta', 'sort_order' => 50],
            ['name' => 'First Appearance', 'slug' => 'first-appearance', 'data_type' => 'string', 'group_name' => 'Meta', 'sort_order' => 51],
            ['name' => 'Last Known Location', 'slug' => 'last-known-location', 'data_type' => 'string', 'group_name' => 'Background', 'sort_order' => 23],
            ['name' => 'Combat Style', 'slug' => 'combat-style', 'data_type' => 'string', 'group_name' => 'Combat', 'sort_order' => 42],
            ['name' => 'Known Languages', 'slug' => 'known-languages', 'data_type' => 'json', 'group_name' => 'Background', 'sort_order' => 24],
            ['name' => 'Distinguishing Features', 'slug' => 'distinguishing-features', 'data_type' => 'json', 'group_name' => 'Physical', 'sort_order' => 15],
            ['name' => 'Clearance Level', 'slug' => 'clearance-level', 'data_type' => 'string', 'group_name' => 'Background', 'is_filterable' => true, 'sort_order' => 25],
        ];

        foreach ($personExtended as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $personType?->id]));
        }

        // Extended Virus attributes
        $virusExtended = [
            ['name' => 'Variant Strains', 'slug' => 'variant-strains', 'data_type' => 'json', 'group_name' => 'Characteristics', 'sort_order' => 13],
            ['name' => 'Host Compatibility', 'slug' => 'host-compatibility', 'data_type' => 'string', 'group_name' => 'Characteristics', 'sort_order' => 14],
            ['name' => 'Weaponization Status', 'slug' => 'weaponization-status', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 3],
            ['name' => 'Containment Level', 'slug' => 'containment-level', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 4],
        ];

        foreach ($virusExtended as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $virusType?->id]));
        }

        // Extended Creature attributes
        $creatureExtended = [
            ['name' => 'Mutation Stage Count', 'slug' => 'mutation-stage-count', 'data_type' => 'integer', 'group_name' => 'Biology', 'sort_order' => 2],
            ['name' => 'Creator', 'slug' => 'creator', 'data_type' => 'string', 'group_name' => 'Biology', 'sort_order' => 3],
            ['name' => 'Deployment History', 'slug' => 'deployment-history', 'data_type' => 'json', 'group_name' => 'Assessment', 'sort_order' => 3],
            ['name' => 'Locomotion', 'slug' => 'locomotion', 'data_type' => 'string', 'group_name' => 'Physical', 'sort_order' => 12],
            ['name' => 'Intelligence Level', 'slug' => 'intelligence-level', 'data_type' => 'string', 'group_name' => 'Assessment', 'sort_order' => 4],
        ];

        foreach ($creatureExtended as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $creatureType?->id]));
        }

        // Compound / Anti-Virus attributes
        $compoundType = MetaEntityType::where('slug', 'compound')->first();
        $compoundAttrs = [
            ['name' => 'Developer', 'slug' => 'developer', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 1],
            ['name' => 'Compound Type', 'slug' => 'compound-type', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Effectiveness', 'slug' => 'effectiveness', 'data_type' => 'string', 'group_name' => 'Properties', 'sort_order' => 10],
            ['name' => 'Side Effects', 'slug' => 'side-effects', 'data_type' => 'json', 'group_name' => 'Properties', 'sort_order' => 11],
            ['name' => 'Administration Method', 'slug' => 'administration-method', 'data_type' => 'string', 'group_name' => 'Properties', 'sort_order' => 12],
            ['name' => 'Target Pathogen', 'slug' => 'target-pathogen', 'data_type' => 'string', 'group_name' => 'Properties', 'sort_order' => 13],
            ['name' => 'Development Date', 'slug' => 'development-date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
            ['name' => 'Availability', 'slug' => 'availability', 'data_type' => 'string', 'group_name' => 'Status', 'is_filterable' => true, 'sort_order' => 20],
        ];

        foreach ($compoundAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $compoundType?->id]));
        }

        // Parasite attributes
        $parasiteType = MetaEntityType::where('slug', 'parasite')->first();
        $parasiteAttrs = [
            ['name' => 'Host Species', 'slug' => 'host-species', 'data_type' => 'string', 'group_name' => 'Biology', 'sort_order' => 1],
            ['name' => 'Control Method', 'slug' => 'control-method', 'data_type' => 'string', 'group_name' => 'Biology', 'sort_order' => 2],
            ['name' => 'Removal Method', 'slug' => 'removal-method', 'data_type' => 'string', 'group_name' => 'Treatment', 'sort_order' => 10],
            ['name' => 'Symptoms', 'slug' => 'symptoms', 'data_type' => 'json', 'group_name' => 'Effects', 'sort_order' => 20],
            ['name' => 'Stages', 'slug' => 'stages', 'data_type' => 'json', 'group_name' => 'Effects', 'sort_order' => 21],
            ['name' => 'Threat Level', 'slug' => 'threat-level', 'data_type' => 'string', 'group_name' => 'Assessment', 'is_filterable' => true, 'sort_order' => 30],
            ['name' => 'Origin', 'slug' => 'origin', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
        ];

        foreach ($parasiteAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $parasiteType?->id]));
        }

        // Event attributes
        $eventType = MetaEntityType::where('slug', 'event')->first();
        $eventAttrs = [
            ['name' => 'Event Type',   'slug' => 'event-type',   'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => -3],
            ['name' => 'Year',         'slug' => 'year',         'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => -2],
            ['name' => 'Time',         'slug' => 'time',         'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => -1],
            ['name' => 'Phase', 'slug' => 'phase', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 0],
            ['name' => 'Date', 'slug' => 'date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 1],
            ['name' => 'Duration', 'slug' => 'duration', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 2],
            ['name' => 'Location', 'slug' => 'location', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
            ['name' => 'Threat Level', 'slug' => 'threat-level', 'data_type' => 'string', 'group_name' => 'Result', 'is_filterable' => true, 'sort_order' => 9],
            ['name' => 'Outcome', 'slug' => 'outcome', 'data_type' => 'string', 'group_name' => 'Result', 'sort_order' => 10],
            ['name' => 'Casualties', 'slug' => 'casualties', 'data_type' => 'string', 'group_name' => 'Result', 'sort_order' => 11],
            ['name' => 'Significance', 'slug' => 'significance', 'data_type' => 'string', 'group_name' => 'Result', 'is_filterable' => true, 'sort_order' => 12],
        ];

        foreach ($eventAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $eventType?->id]));
        }

        // Incident attributes
        $incidentType = MetaEntityType::where('slug', 'incident')->first();
        $incidentAttrs = [
            ['name' => 'Date', 'slug' => 'date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 1],
            ['name' => 'Duration', 'slug' => 'duration', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 2],
            ['name' => 'Location', 'slug' => 'location', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
            ['name' => 'Threat Level', 'slug' => 'threat-level', 'data_type' => 'string', 'group_name' => 'Assessment', 'is_filterable' => true, 'sort_order' => 4],
            ['name' => 'Pathogen Involved', 'slug' => 'pathogen-involved', 'data_type' => 'string', 'group_name' => 'Assessment', 'sort_order' => 5],
            ['name' => 'Casualties', 'slug' => 'casualties', 'data_type' => 'string', 'group_name' => 'Result', 'sort_order' => 10],
            ['name' => 'Outcome', 'slug' => 'outcome', 'data_type' => 'string', 'group_name' => 'Result', 'sort_order' => 11],
            ['name' => 'Containment Method', 'slug' => 'containment-method', 'data_type' => 'string', 'group_name' => 'Result', 'sort_order' => 12],
            ['name' => 'Game Appearance', 'slug' => 'game-appearance', 'data_type' => 'string', 'group_name' => 'Meta', 'sort_order' => 20],
        ];

        foreach ($incidentAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $incidentType?->id]));
        }

        // Facility attributes
        $facilityType = MetaEntityType::where('slug', 'facility')->first();
        $facilityAttrs = [
            ['name' => 'Facility Type', 'slug' => 'facility-type', 'data_type' => 'string', 'group_name' => 'Overview', 'is_filterable' => true, 'sort_order' => 1],
            ['name' => 'Operator', 'slug' => 'operator', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 2],
            ['name' => 'Construction Date', 'slug' => 'construction-date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 3],
            ['name' => 'Destruction Date', 'slug' => 'destruction-date', 'data_type' => 'string', 'group_name' => 'Overview', 'sort_order' => 4],
            ['name' => 'Security Clearance', 'slug' => 'security-clearance', 'data_type' => 'string', 'group_name' => 'Status', 'is_filterable' => true, 'sort_order' => 10],
            ['name' => 'Research Programs', 'slug' => 'research-programs', 'data_type' => 'json', 'group_name' => 'Details', 'sort_order' => 20],
            ['name' => 'Known Personnel', 'slug' => 'known-personnel', 'data_type' => 'json', 'group_name' => 'Details', 'sort_order' => 21],
        ];

        foreach ($facilityAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $facilityType?->id]));
        }

        // Technology attributes
        $techType = MetaEntityType::where('slug', 'technology')->first();
        $techAttrs = [
            ['name' => 'Developer',           'slug' => 'developer',            'data_type' => 'string', 'group_name' => 'Overview',     'sort_order' => 1],
            ['name' => 'Technology Category', 'slug' => 'tech-category',        'data_type' => 'string', 'group_name' => 'Overview',     'is_filterable' => true, 'sort_order' => 2],
            ['name' => 'Operational Status',  'slug' => 'operational-status',   'data_type' => 'string', 'group_name' => 'Overview',     'is_filterable' => true, 'sort_order' => 3],
            ['name' => 'First Deployment',    'slug' => 'first-deployment',     'data_type' => 'string', 'group_name' => 'Overview',     'sort_order' => 4],
            ['name' => 'Purpose',             'slug' => 'purpose',              'data_type' => 'text',   'group_name' => 'Function',     'sort_order' => 10],
            ['name' => 'Primary Function',    'slug' => 'primary-function',     'data_type' => 'string', 'group_name' => 'Function',     'sort_order' => 11],
            ['name' => 'Specifications',      'slug' => 'specifications',       'data_type' => 'text',   'group_name' => 'Technical',    'sort_order' => 20],
            ['name' => 'Known Users',         'slug' => 'known-users',          'data_type' => 'json',   'group_name' => 'Technical',    'sort_order' => 21],
            ['name' => 'Threat Assessment',   'slug' => 'threat-assessment',    'data_type' => 'string', 'group_name' => 'Assessment',   'is_filterable' => true, 'sort_order' => 30],
            ['name' => 'Current Status',      'slug' => 'current-status',       'data_type' => 'string', 'group_name' => 'Assessment',   'sort_order' => 31],
        ];

        foreach ($techAttrs as $attr) {
            AttributeDefinition::create(array_merge($attr, ['meta_entity_type_id' => $techType?->id]));
        }
    }
}
