<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\Universe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Unified CRUD controller for all entity sub-record types.
 * Each record type maps to a model, resource, and validation ruleset.
 */
class EntityRecordController extends Controller
{
    private const RECORD_TYPES = [
        'infection-records' => [
            'model' => \App\Models\EntityInfectionRecord::class,
            'resource' => \App\Http\Resources\EntityInfectionRecordResource::class,
            'relation' => 'infectionRecords',
            'with' => ['pathogen.entityType', 'cure.entityType'],
        ],
        'mutation-stages' => [
            'model' => \App\Models\EntityMutationStage::class,
            'resource' => \App\Http\Resources\EntityMutationStageResource::class,
            'relation' => 'mutationStages',
            'with' => ['triggerEntity.entityType'],
        ],
        'affiliation-history' => [
            'model' => \App\Models\EntityAffiliationHistory::class,
            'resource' => \App\Http\Resources\EntityAffiliationHistoryResource::class,
            'relation' => 'affiliationHistory',
            'with' => ['organization.entityType'],
        ],
        'quotes' => [
            'model' => \App\Models\EntityQuote::class,
            'resource' => \App\Http\Resources\EntityQuoteResource::class,
            'relation' => 'quotes',
            'with' => ['sourceMedia'],
        ],
        'power-profiles' => [
            'model' => \App\Models\EntityPowerProfile::class,
            'resource' => \App\Http\Resources\EntityPowerProfileResource::class,
            'relation' => 'powerProfiles',
            'with' => ['sourceEntity.entityType'],
        ],
        'consciousness-records' => [
            'model' => \App\Models\EntityConsciousnessRecord::class,
            'resource' => \App\Http\Resources\EntityConsciousnessRecordResource::class,
            'relation' => 'consciousnessRecords',
            'with' => ['vessel.entityType'],
        ],
        'intelligence-records' => [
            'model' => \App\Models\EntityIntelligenceRecord::class,
            'resource' => \App\Http\Resources\EntityIntelligenceRecordResource::class,
            'relation' => 'intelligenceRecords',
            'with' => ['observer.entityType', 'subject.entityType'],
        ],
        'death-records' => [
            'model' => \App\Models\EntityDeathRecord::class,
            'resource' => \App\Http\Resources\EntityDeathRecordResource::class,
            'relation' => 'deathRecords',
            'with' => ['killer.entityType', 'incident.entityType', 'location.entityType', 'revivedBy.entityType'],
        ],
        'transmission-participants' => [
            'model' => \App\Models\EntityTransmissionRelation::class,
            'resource' => \App\Http\Resources\EntityTransmissionRelationResource::class,
            'relation' => 'transmissionParticipants',
            'with' => ['participant.entityType'],
            'foreign_key' => 'transmission_entity_id',
        ],
        'transmission-records' => [
            'model' => \App\Models\EntityTransmissionRecord::class,
            'resource' => \App\Http\Resources\EntityTransmissionRecordResource::class,
            'relation' => 'transmissionRecords',
            'with' => ['speaker.entityType'],
            'foreign_key' => 'transmission_entity_id',
        ],
    ];

    public function store(Request $request, Universe $universe, Entity $entity, string $recordType): JsonResponse
    {
        $config = $this->resolveConfig($recordType);
        $rules = $this->validationRules($recordType, 'store');
        $data = $request->validate($rules);

        $foreignKey = $config['foreign_key'] ?? 'entity_id';
        $data[$foreignKey] = $entity->id;

        $record = $config['model']::create($data);
        $record->load($config['with']);

        return response()->json([
            'data' => new $config['resource']($record),
        ], 201);
    }

    public function update(Request $request, Universe $universe, Entity $entity, string $recordType, int $recordId): JsonResponse
    {
        $config = $this->resolveConfig($recordType);
        $rules = $this->validationRules($recordType, 'update');
        $data = $request->validate($rules);

        $foreignKey = $config['foreign_key'] ?? 'entity_id';
        $record = $config['model']::where($foreignKey, $entity->id)->findOrFail($recordId);
        $record->update($data);
        $record->load($config['with']);

        return response()->json([
            'data' => new $config['resource']($record),
        ]);
    }

    public function destroy(Universe $universe, Entity $entity, string $recordType, int $recordId): JsonResponse
    {
        $config = $this->resolveConfig($recordType);
        $foreignKey = $config['foreign_key'] ?? 'entity_id';
        $record = $config['model']::where($foreignKey, $entity->id)->findOrFail($recordId);
        $record->delete();

        return response()->json(null, 204);
    }

    private function resolveConfig(string $recordType): array
    {
        if (! isset(self::RECORD_TYPES[$recordType])) {
            abort(404, "Unknown record type: {$recordType}");
        }

        return self::RECORD_TYPES[$recordType];
    }

    private function validationRules(string $recordType, string $mode): array
    {
        $s = $mode === 'store' ? 'required' : 'sometimes';

        return match ($recordType) {
            'infection-records' => [
                'pathogen_entity_id' => ['nullable', 'exists:entities,id'],
                'cure_entity_id' => ['nullable', 'exists:entities,id'],
                'pathogen_name' => ['nullable', 'string', 'max:255'],
                'infection_method' => ['nullable', 'string', 'max:255'],
                'cure_name' => ['nullable', 'string', 'max:255'],
                'cure_method' => ['nullable', 'string', 'max:255'],
                'fictional_date_infected' => ['nullable', 'string', 'max:255'],
                'fictional_date_cured' => ['nullable', 'string', 'max:255'],
                'status' => [$s, Rule::in(['active', 'cured', 'dormant', 'fatal', 'mutated', 'partial', 'unknown'])],
                'severity' => ['nullable', 'string', 'max:50'],
                'side_effects' => ['nullable', 'array'],
                'side_effects.*' => ['string', 'max:255'],
                'symptoms_exhibited' => ['nullable', 'array'],
                'symptoms_exhibited.*' => ['string', 'max:255'],
                'notes' => ['nullable', 'string'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'mutation-stages' => [
                'trigger_entity_id' => ['nullable', 'exists:entities,id'],
                'stage_number' => [$s, 'integer', 'min:1'],
                'name' => [$s, 'string', 'max:255'],
                'trigger' => ['nullable', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'physical_changes' => ['nullable', 'array'],
                'physical_changes.*' => ['string', 'max:255'],
                'abilities_gained' => ['nullable', 'array'],
                'abilities_gained.*' => ['string', 'max:255'],
                'abilities_lost' => ['nullable', 'array'],
                'abilities_lost.*' => ['string', 'max:255'],
                'threat_level' => ['nullable', 'integer', 'min:1', 'max:10'],
                'is_reversible' => ['nullable', 'boolean'],
                'fictional_date' => ['nullable', 'string', 'max:255'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'affiliation-history' => [
                'organization_entity_id' => ['nullable', 'exists:entities,id'],
                'organization_name' => ['nullable', 'string', 'max:255'],
                'role' => ['nullable', 'string', 'max:255'],
                'rank' => ['nullable', 'string', 'max:255'],
                'fictional_start' => ['nullable', 'string', 'max:255'],
                'fictional_end' => ['nullable', 'string', 'max:255'],
                'status' => [$s, Rule::in(['active', 'former', 'defected', 'expelled', 'deceased', 'undercover', 'honorary'])],
                'notes' => ['nullable', 'string'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'quotes' => [
                'quote' => [$s, 'string'],
                'context' => ['nullable', 'string', 'max:255'],
                'source_media_id' => ['nullable', 'exists:media_sources,id'],
                'fictional_date' => ['nullable', 'string', 'max:255'],
                'is_featured' => ['nullable', 'boolean'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'power-profiles' => [
                'source_entity_id' => ['nullable', 'exists:entities,id'],
                'name' => [$s, 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'source' => ['nullable', 'string', 'max:255'],
                'category' => [$s, Rule::in(['physical', 'mental', 'viral', 'technological', 'combat', 'supernatural', 'medical', 'other'])],
                'power_level' => ['nullable', 'integer', 'min:0', 'max:100'],
                'status' => [$s, Rule::in(['active', 'lost', 'dormant', 'evolving', 'artificial', 'temporary'])],
                'fictional_date_acquired' => ['nullable', 'string', 'max:255'],
                'fictional_date_lost' => ['nullable', 'string', 'max:255'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'consciousness-records' => [
                'vessel_entity_id' => ['nullable', 'exists:entities,id'],
                'status' => [$s, Rule::in(['active', 'transferred', 'dormant', 'fragmented', 'merged', 'destroyed', 'digital', 'shared'])],
                'transfer_method' => ['nullable', 'string', 'max:255'],
                'vessel_status' => ['nullable', Rule::in(['original', 'new', 'cloned', 'synthetic', 'decaying', 'deceased', 'overwritten'])],
                'fictional_date_start' => ['nullable', 'string', 'max:255'],
                'fictional_date_end' => ['nullable', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'notes' => ['nullable', 'string'],
                'side_effects' => ['nullable', 'array'],
                'side_effects.*' => ['string', 'max:255'],
                'metadata' => ['nullable', 'array'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'intelligence-records' => [
                'observer_entity_id' => [$s, 'exists:entities,id'],
                'subject_entity_id' => ['nullable', 'exists:entities,id'],
                'classification' => [$s, Rule::in(['known', 'unknown', 'classified', 'redacted', 'partial', 'rumored', 'discovered'])],
                'discovered_during' => ['nullable', 'string', 'max:255'],
                'fictional_date_learned' => ['nullable', 'string', 'max:255'],
                'fictional_date_declassified' => ['nullable', 'string', 'max:255'],
                'intelligence_summary' => ['nullable', 'string'],
                'redacted_details' => ['nullable', 'string'],
                'source' => ['nullable', 'string', 'max:255'],
                'reliability' => ['nullable', Rule::in(['confirmed', 'suspected', 'unverified', 'disinformation'])],
                'metadata' => ['nullable', 'array'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'death-records' => [
                'killer_entity_id' => ['nullable', 'exists:entities,id'],
                'incident_entity_id' => ['nullable', 'exists:entities,id'],
                'location_entity_id' => ['nullable', 'exists:entities,id'],
                'death_type' => [$s, Rule::in(['killed', 'sacrificed', 'executed', 'suicide', 'accidental', 'presumed', 'mutation-death', 'disintegrated'])],
                'fictional_date' => ['nullable', 'string', 'max:255'],
                'cause_of_death' => ['nullable', 'string', 'max:255'],
                'circumstances' => ['nullable', 'string'],
                'is_confirmed' => ['nullable', 'boolean'],
                'is_revived' => ['nullable', 'boolean'],
                'revival_method' => ['nullable', 'string', 'max:255'],
                'fictional_date_revived' => ['nullable', 'string', 'max:255'],
                'revival_circumstances' => ['nullable', 'string'],
                'revived_by_entity_id' => ['nullable', 'exists:entities,id'],
                'body_modifications' => ['nullable', 'array'],
                'body_modifications.*' => ['string', 'max:255'],
                'metadata' => ['nullable', 'array'],
                'sort_order' => ['nullable', 'integer'],
            ],

            'transmission-participants' => [
                'participant_entity_id' => [$s, 'exists:entities,id'],
                'role' => [$s, Rule::in(['speaker', 'listener', 'interceptor', 'location', 'mentioned', 'moderator'])],
                'callsign' => ['nullable', 'string', 'max:255'],
                'channel' => ['nullable', 'string', 'max:255'],
                'is_present' => ['nullable', 'boolean'],
                'sort_order' => ['nullable', 'integer'],
                'metadata' => ['nullable', 'array'],
            ],

            'transmission-records' => [
                'speaker_entity_id' => ['nullable', 'exists:entities,id'],
                'speaker_label' => ['nullable', 'string', 'max:255'],
                'content' => [$s, 'string'],
                'content_type' => [$s, Rule::in(['dialogue', 'narration', 'action', 'static', 'system', 'redacted'])],
                'tone' => ['nullable', 'string', 'max:100'],
                'fictional_timestamp' => ['nullable', 'string', 'max:255'],
                'is_redacted' => ['nullable', 'boolean'],
                'redacted_reason' => ['nullable', 'string', 'max:255'],
                'notes' => ['nullable', 'string'],
                'sort_order' => ['nullable', 'integer'],
                'metadata' => ['nullable', 'array'],
            ],
        };
    }
}
