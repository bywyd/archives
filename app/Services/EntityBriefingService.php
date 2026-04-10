<?php

namespace App\Services;

use App\Models\Entity;

class EntityBriefingService
{
    /**
     * Compile a structured dossier briefing from a fully loaded Entity model.
     * All relation data must be pre-loaded via loadMissing() before calling this.
     *
     * @return array<string, mixed>
     */
    public function generate(Entity $entity): array
    {
        return [
            'subject'           => $this->buildSubject($entity),
            'threat_assessment' => $this->buildThreatAssessment($entity),
            'network'           => $this->buildNetwork($entity),
            'history'           => $this->buildHistory($entity),
            'classification'    => $this->buildClassification($entity),
            'notable_quotes'    => $this->buildNotableQuotes($entity),
            'generated_at'      => now()->toIso8601String(),
        ];
    }

    /** Core identifying data for the subject entity. */
    private function buildSubject(Entity $entity): array
    {
        $aliases = $entity->aliases
            ->take(3)
            ->map(fn ($a) => [
                'alias'   => $a->alias,
                'context' => $a->context,
            ])
            ->values()
            ->all();

        return [
            'name'        => $entity->name,
            'slug'        => $entity->slug,
            'aliases'     => $aliases,
            'type'        => $entity->entityType ? [
                'name'  => $entity->entityType->name,
                'color' => $entity->entityType->color,
                'icon'  => $entity->entityType->icon,
            ] : null,
            'status'      => $entity->entityStatus ? [
                'name'  => $entity->entityStatus->name,
                'color' => $entity->entityStatus->color,
            ] : null,
            'description' => $entity->short_description,
            'is_featured' => (bool) $entity->is_featured,
            'is_locked'   => (bool) $entity->is_locked,
        ];
    }

    /** Threat-relevant data: powers, infections, mutations. */
    private function buildThreatAssessment(Entity $entity): array
    {
        // Top power profile sorted by numeric mapping of the string enum
        $levelOrder = ['low' => 1, 'moderate' => 2, 'high' => 3, 'extreme' => 4, 'immeasurable' => 5];
        $topPower = $entity->powerProfiles
            ->sortByDesc(fn ($p) => $levelOrder[strtolower($p->power_level ?? '')] ?? 0)
            ->first();

        // Active infection (status != 'cured'/'inactive'/'recovered', or first if all are)
        $activeInfection = $entity->infectionRecords
            ->first(fn ($r) => ! in_array(strtolower($r->status ?? ''), ['cured', 'inactive', 'recovered'], true))
            ?? $entity->infectionRecords->first();

        // Mutations: count + peak threat + up to 3 detailed stages
        $threatOrder   = ['none', 'low', 'moderate', 'medium', 'high', 'extreme', 'critical'];
        $peakThreat    = null;
        $mutationsData = [];

        if ($entity->mutationStages->isNotEmpty()) {
            $sorted = $entity->mutationStages->sortBy('stage_number');

            $peakThreat = $sorted
                ->sortBy(fn ($s) => array_search(strtolower($s->threat_level ?? 'none'), $threatOrder))
                ->last()
                ?->threat_level;

            $mutationsData = $sorted
                ->take(3)
                ->map(fn ($s) => [
                    'stage_number'     => (int) $s->stage_number,
                    'name'             => $s->name,
                    'threat_level'     => $s->threat_level,
                    'abilities_gained' => (array) ($s->abilities_gained ?? []),
                    'abilities_lost'   => (array) ($s->abilities_lost ?? []),
                    'physical_changes' => (array) ($s->physical_changes ?? []),
                ])
                ->values()
                ->all();
        }

        return [
            'top_power' => $topPower ? [
                'name'                    => $topPower->name,
                'level'                   => $this->mapPowerLevel($topPower->power_level),
                'max_level'               => 10,
                'status'                  => $topPower->status,
                'category'                => $topPower->category,
                'source'                  => $topPower->source,
                'description'             => $topPower->description,
                'fictional_date_acquired' => $topPower->fictional_date_acquired,
            ] : null,
            'active_infection' => $activeInfection ? [
                'pathogen'           => $activeInfection->pathogen?->name ?? $activeInfection->pathogen_name,
                'status'             => $activeInfection->status,
                'severity'           => $activeInfection->severity,
                'infection_method'   => $activeInfection->infection_method,
                'symptoms_exhibited' => array_slice((array) ($activeInfection->symptoms_exhibited ?? []), 0, 3),
            ] : null,
            'mutations'            => $mutationsData,
            'mutation_stage_count' => $entity->mutationStages->count(),
            'peak_threat_level'    => $peakThreat,
        ];
    }

    /** Network data: relations, affiliations, timelines. */
    private function buildNetwork(Entity $entity): array
    {
        // Active affiliations, where fictional_end is null or status isn't departed/former
        $activeAffiliations = $entity->affiliationHistory
            ->filter(fn ($a) => is_null($a->fictional_end)
                || ! in_array(strtolower($a->status ?? ''), ['former', 'departed', 'expelled', 'deceased'], true))
            ->values()
            ->take(5)
            ->map(fn ($a) => [
                'organization'    => $a->organization?->name ?? $a->organization_name,
                'role'            => $a->role,
                'rank'            => $a->rank,
                'status'          => $a->status,
                'fictional_start' => $a->fictional_start,
                'fictional_end'   => $a->fictional_end,
            ])
            ->all();

        $timelines = $entity->timelines
            ->pluck('name')
            ->all();

        return [
            'outgoing_relations'  => $entity->outgoingRelations->count(),
            'incoming_relations'  => $entity->incomingRelations->count(),
            'active_affiliations' => $activeAffiliations,
            'timelines'           => $timelines,
        ];
    }

    /** Historical records: deaths, consciousness, intelligence. */
    private function buildHistory(Entity $entity): array
    {
        $deaths = $entity->deathRecords
            ->map(fn ($d) => [
                'cause'                 => $d->cause_of_death,
                'death_type'            => $d->death_type,
                'fictional_date'        => $d->fictional_date,
                'confirmed'             => (bool) $d->is_confirmed,
                'circumstances'         => $d->circumstances,
                'revived'               => (bool) $d->is_revived,
                'revival_method'        => $d->revival_method,
                'revival_circumstances' => $d->revival_circumstances,
            ])
            ->all();

        // Latest consciousness record by sort_order
        $latestRecord = $entity->consciousnessRecords
            ->sortByDesc('sort_order')
            ->first();

        $latestConsciousness = $latestRecord ? [
            'status'          => $latestRecord->status,
            'transfer_method' => $latestRecord->transfer_method,
            'vessel'          => $latestRecord->vessel?->name ?? null,
            'description'     => $latestRecord->description,
        ] : null;

        return [
            'deaths'                    => $deaths,
            'latest_consciousness'      => $latestConsciousness,
            'intelligence_record_count' => $entity->intelligenceRecords->count(),
        ];
    }

    /** Taxonomy: tags, categories, media source count. */
    private function buildClassification(Entity $entity): array
    {
        return [
            'tags'               => $entity->tags->pluck('name')->all(),
            'categories'         => $entity->categories->pluck('name')->all(),
            'media_source_count' => $entity->mediaSources->count(),
        ];
    }

    /** Up to 3 quotes, featured first. Uses quote field (not content). */
    private function buildNotableQuotes(Entity $entity): array
    {
        return $entity->quotes
            ->sortByDesc('is_featured')
            ->take(3)
            ->map(fn ($q) => [
                'content'     => $q->quote,
                'context'     => $q->context,
                'is_featured' => (bool) $q->is_featured,
            ])
            ->values()
            ->all();
    }

    /**
     * Map the string power_level enum to a 0–10 numeric value for the PowerBar.
     * DB stores: low / moderate / high / extreme / immeasurable.
     */
    private function mapPowerLevel(?string $level): int
    {
        return match (strtolower($level ?? '')) {
            'low'          => 2,
            'moderate'     => 4,
            'high'         => 6,
            'extreme'      => 8,
            'immeasurable' => 10,
            default        => 0,
        };
    }
}
