<?php

namespace App\Services;

use App\Models\Entity;
use App\Models\EntityAlias;
use App\Models\EntityAttribute;
use App\Models\EntityCrossReference;
use App\Models\EntityDeathRecord;
use App\Models\EntityInfectionRecord;
use App\Models\EntityMutationStage;
use App\Models\EntityPowerProfile;
use App\Models\EntityQuote;
use App\Models\EntityRelation;
use App\Models\EntitySection;
use App\Models\MetaEntityRelationType;
use App\Models\TimelineEvent;
use App\Models\Universe;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AdvancedSearchService
{
    private SearchQueryParser $parser;

    public function __construct()
    {
        $this->parser = new SearchQueryParser();
    }

    /**
     * Execute an advanced search across a universe.
     *
     * Returns scored entities, context excerpts, and a connection graph.
     */
    public function search(Universe $universe, string $rawQuery, int $limit = 20): array
    {
        // Preload universe entity names for dynamic compound phrase detection.
        // This makes any entity name (e.g. "Jack Baker", "Mother Miranda") a
        // protected multi-word phrase in the parser without hardcoding.
        $knownPhrases = $this->loadEntityNames($universe);
        // Merge in universe-specific compound names
        if (is_array($universe->compound_names) && count($universe->compound_names)) {
            $knownPhrases = array_merge($knownPhrases, $universe->compound_names);
        }
        $parsed = $this->parser->parse($rawQuery, $knownPhrases);

        // Resolve additional relation type slugs from DB MetaEntityRelationType
        // records. Supplements the static ACTION_WORDS map so newly added
        // relation types are matched automatically.
        $dynamicRelationSlugs = $this->resolveRelationSlugsFromTokens($parsed);

        if (!$parsed->hasKeywords() && !$parsed->hasActions()) {
            return $this->emptyResult($rawQuery, $parsed);
        }

        //  Phase 1: Multi-signal entity scoring 
        $scores = [];       // entity_id => float
        $excerpts = [];     // entity_id => [{ source, text, relevance }]
        $matchedRelations = collect();
        $matchedRecords = collect();

        // Core text searches
        $this->scoreEntityNames($universe, $parsed, $scores, $excerpts);
        $this->scoreAliases($universe, $parsed, $scores, $excerpts);
        $this->scoreDescriptions($universe, $parsed, $scores, $excerpts);
        $this->scoreSections($universe, $parsed, $scores, $excerpts);
        $this->scoreQuotes($universe, $parsed, $scores, $excerpts);

        // Structural searches (always run  relations/cross-refs/powers are valuable)
        $this->scoreRelations($universe, $parsed, $scores, $excerpts, $matchedRelations, $dynamicRelationSlugs);
        $this->scoreCrossReferences($universe, $parsed, $scores, $excerpts);
        $this->scorePowerProfiles($universe, $parsed, $scores, $excerpts);
        $this->scoreAttributes($universe, $parsed, $scores, $excerpts);

        // Action-aware record searches
        if ($parsed->hasActions()) {
            $this->scoreRecords($universe, $parsed, $scores, $excerpts, $matchedRecords);
        }

        // Multi-keyword conjunction boost
        if (count($parsed->keywords) >= 2) {
            $this->applyConjunctionBoost($universe, $parsed, $scores);
        }

        // Intent boost
        if ($parsed->getPreferredEntityType()) {
            $this->applyIntentBoost($universe, $parsed, $scores);
        }

        // Featured entity boost
        $this->applyFeaturedBoost($universe, $scores);

        if (empty($scores)) {
            return $this->emptyResult($rawQuery, $parsed);
        }

        // Sort by score descending, take top N
        arsort($scores);
        $topIds = array_slice(array_keys($scores), 0, $limit, true);

        //  Phase 2: Load full entities for top results 
        $entities = Entity::whereIn('id', $topIds)
            ->where('universe_id', $universe->id)
            ->with(['entityType', 'entityStatus', 'images', 'aliases', 'tags'])
            ->get()
            ->keyBy('id');

        // Sort entities by score
        $ranked = collect($topIds)->map(fn ($id) => $entities->get($id))->filter();

        //  Phase 3: Build connection graph between top results 
        $connections = $this->buildConnectionGraph($topIds, $matchedRelations);

        //  Phase 4: Build structured briefing 
        $briefing = $this->buildBriefing($parsed, $ranked, $excerpts, $scores, $matchedRelations, $matchedRecords);

        //  Phase 5: Deduplicate and rank excerpts per entity 
        foreach ($excerpts as $entityId => &$entityExcerpts) {
            $seen = [];
            $entityExcerpts = array_values(array_filter($entityExcerpts, function ($e) use (&$seen) {
                $key = $e['source'] . ':' . mb_substr($e['text'], 0, 80);
                if (isset($seen[$key])) return false;
                $seen[$key] = true;
                return true;
            }));
            usort($entityExcerpts, fn ($a, $b) =>
                ($this->excerptWeight($b['relevance']) <=> $this->excerptWeight($a['relevance']))
            );
            $entityExcerpts = array_slice($entityExcerpts, 0, 5);
        }
        unset($entityExcerpts);

        return [
            'query' => [
                'raw' => $rawQuery,
                'keywords' => $parsed->keywords,
                'intent' => $parsed->intent,
                'actions' => $parsed->allTokens,
                'has_action_context' => $parsed->hasActions(),
            ],
            'briefing' => $briefing,
            'results' => $ranked->map(fn ($entity) => [
                'id' => $entity->id,
                'name' => $entity->name,
                'slug' => $entity->slug,
                'short_description' => $entity->short_description,
                'is_featured' => $entity->is_featured,
                'score' => round($scores[$entity->id] ?? 0, 1),
                'entity_type' => $entity->entityType ? [
                    'id' => $entity->entityType->id,
                    'name' => $entity->entityType->name,
                    'slug' => $entity->entityType->slug,
                    'icon' => $entity->entityType->icon,
                    'color' => $entity->entityType->color,
                ] : null,
                'entity_status' => $entity->entityStatus ? [
                    'id' => $entity->entityStatus->id,
                    'name' => $entity->entityStatus->name,
                    'slug' => $entity->entityStatus->slug,
                    'color' => $entity->entityStatus->color,
                ] : null,
                'images' => $entity->images->map(fn ($img) => [
                    'id' => $img->id,
                    'type' => $img->type,
                    'url' => $img->url,
                    'thumbnail_url' => $img->thumbnail_url,
                    'alt_text' => $img->alt_text,
                ])->values()->all(),
                'aliases' => $entity->aliases->pluck('alias')->all(),
                'excerpts' => $excerpts[$entity->id] ?? [],
            ])->values()->all(),
            'connections' => $connections,
            'total' => count($scores),
        ];
    }

    //  Scoring Methods 

    private function scoreEntityNames(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        foreach ($parsed->keywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            foreach ($patterns as $pattern) {
                // Exact name match
                $exact = Entity::where('universe_id', $universe->id)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($pattern)])
                    ->pluck('name', 'id');

                foreach ($exact as $id => $name) {
                    $scores[$id] = ($scores[$id] ?? 0) + 120;
                    $excerpts[$id][] = ['source' => 'name', 'text' => $name, 'relevance' => 'exact_match'];
                }

                // Name starts with
                $startsWith = Entity::where('universe_id', $universe->id)
                    ->where('name', 'like', $pattern . '%')
                    ->whereNotIn('id', $exact->keys()->all())
                    ->pluck('name', 'id');

                foreach ($startsWith as $id => $name) {
                    $scores[$id] = ($scores[$id] ?? 0) + 75;
                    $excerpts[$id][] = ['source' => 'name', 'text' => $name, 'relevance' => 'starts_with'];
                }

                // Name contains
                $contains = Entity::where('universe_id', $universe->id)
                    ->where('name', 'like', '%' . $pattern . '%')
                    ->whereNotIn('id', array_merge($exact->keys()->all(), $startsWith->keys()->all()))
                    ->pluck('name', 'id');

                foreach ($contains as $id => $name) {
                    $scores[$id] = ($scores[$id] ?? 0) + 40;
                    $excerpts[$id][] = ['source' => 'name', 'text' => $name, 'relevance' => 'contains'];
                }
            }
        }
    }

    private function scoreAliases(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        foreach ($parsed->keywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            foreach ($patterns as $pattern) {
                $aliases = Entity::where('universe_id', $universe->id)
                    ->whereHas('aliases', fn ($q) => $q->where('alias', 'like', '%' . $pattern . '%'))
                    ->with(['aliases' => fn ($q) => $q->where('alias', 'like', '%' . $pattern . '%')])
                    ->get();

                foreach ($aliases as $entity) {
                    foreach ($entity->aliases as $alias) {
                        $isExact = mb_strtolower($alias->alias) === mb_strtolower($pattern);
                        $scores[$entity->id] = ($scores[$entity->id] ?? 0) + ($isExact ? 90 : 35);
                        $excerpts[$entity->id][] = [
                            'source' => 'alias',
                            'text' => $alias->alias . ($alias->context ? " ({$alias->context})" : ''),
                            'relevance' => $isExact ? 'exact_alias' : 'partial_alias',
                        ];
                    }
                }
            }
        }
    }

    private function scoreDescriptions(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $allKeywords = array_merge($parsed->keywords, $this->getActionTokens($parsed));

        foreach ($allKeywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $entities = Entity::where('universe_id', $universe->id)
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('short_description', 'like', '%' . $p . '%')
                          ->orWhere('content', 'like', '%' . $p . '%');
                    }
                })
                ->select('id', 'short_description', 'content')
                ->get();

            foreach ($entities as $entity) {
                $matchedDesc = false;
                $matchedContent = false;
                foreach ($patterns as $p) {
                    if (stripos($entity->short_description ?? '', $p) !== false) $matchedDesc = true;
                    if (stripos($entity->content ?? '', $p) !== false) $matchedContent = true;
                }

                if ($matchedDesc) {
                    $scores[$entity->id] = ($scores[$entity->id] ?? 0) + 30;
                    $excerpts[$entity->id][] = [
                        'source' => 'description',
                        'text' => $this->extractExcerpt($entity->short_description, $keyword),
                        'relevance' => 'description_match',
                    ];
                }

                if ($matchedContent) {
                    $scores[$entity->id] = ($scores[$entity->id] ?? 0) + 18;
                    $excerpts[$entity->id][] = [
                        'source' => 'content',
                        'text' => $this->extractExcerpt($entity->content, $keyword),
                        'relevance' => 'content_match',
                    ];
                }
            }
        }
    }

    private function scoreSections(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $allKeywords = array_merge($parsed->keywords, $this->getActionTokens($parsed));

        foreach ($allKeywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $sections = EntitySection::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('title', 'like', '%' . $p . '%')
                          ->orWhere('content', 'like', '%' . $p . '%');
                    }
                })
                ->select('id', 'entity_id', 'title', 'content')
                ->limit(100)
                ->get();

            foreach ($sections as $section) {
                $titleMatch = false;
                $contentMatch = false;
                foreach ($patterns as $p) {
                    if (stripos($section->title ?? '', $p) !== false) $titleMatch = true;
                    if (stripos($section->content ?? '', $p) !== false) $contentMatch = true;
                }

                if ($titleMatch) {
                    $scores[$section->entity_id] = ($scores[$section->entity_id] ?? 0) + 25;
                    $excerpts[$section->entity_id][] = [
                        'source' => 'section',
                        'text' => "Section: {$section->title}",
                        'relevance' => 'section_title_match',
                    ];
                }

                if ($contentMatch) {
                    $scores[$section->entity_id] = ($scores[$section->entity_id] ?? 0) + 15;
                    $excerpts[$section->entity_id][] = [
                        'source' => 'section',
                        'text' => $this->extractExcerpt($section->content, $keyword),
                        'relevance' => 'section_content_match',
                    ];
                }
            }
        }
    }

    private function scoreQuotes(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $allKeywords = array_merge($parsed->keywords, $this->getActionTokens($parsed));

        foreach ($allKeywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $quotes = EntityQuote::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('quote', 'like', '%' . $p . '%')
                          ->orWhere('context', 'like', '%' . $p . '%');
                    }
                })
                ->select('id', 'entity_id', 'quote', 'context')
                ->limit(50)
                ->get();

            foreach ($quotes as $quote) {
                $scores[$quote->entity_id] = ($scores[$quote->entity_id] ?? 0) + 18;
                $excerpts[$quote->entity_id][] = [
                    'source' => 'quote',
                    'text' => '"' . mb_substr($quote->quote, 0, 150) . '"' . ($quote->context ? "  {$quote->context}" : ''),
                    'relevance' => 'quote_match',
                ];
            }
        }
    }

    private function scoreRelations(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts, Collection &$matchedRelations, array $extraSlugs = []): void
    {
        $relationSlugs = array_unique(array_merge($parsed->getRelationSlugs(), $extraSlugs));

        if (empty($relationSlugs) && empty($parsed->keywords)) {
            return;
        }

        $query = EntityRelation::query()
            ->whereHas('fromEntity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['fromEntity:id,name,slug', 'toEntity:id,name,slug', 'relationType:id,name,slug,inverse_name']);

        $keywords = $parsed->keywords;
        $query->where(function ($q) use ($relationSlugs, $keywords, $parsed) {
            // Match by relation type slugs
            if (!empty($relationSlugs)) {
                $q->whereHas('relationType', fn ($rq) => $rq->whereIn('slug', $relationSlugs));
            }

            // Match keywords in relation descriptions/context
            foreach ($keywords as $keyword) {
                $patterns = $parsed->getSearchPatterns($keyword);
                foreach ($patterns as $p) {
                    $q->orWhere('description', 'like', '%' . $p . '%')
                      ->orWhere('context', 'like', '%' . $p . '%');
                }
            }

            // Match if related entity names contain keywords
            foreach ($keywords as $keyword) {
                $patterns = $parsed->getSearchPatterns($keyword);
                foreach ($patterns as $p) {
                    $q->orWhereHas('fromEntity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    $q->orWhereHas('toEntity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                }
            }
        });

        $relations = $query->limit(100)->get();
        $matchedRelations = $relations;

        foreach ($relations as $relation) {
            $fromId = $relation->from_entity_id;
            $toId = $relation->to_entity_id;
            $typeName = $relation->relationType?->name ?? 'related to';

            // Higher score if the relation type matches action context
            $isActionMatch = !empty($relationSlugs) &&
                in_array($relation->relationType?->slug, $relationSlugs, true);
            $relationScore = $isActionMatch ? 60 : 35;

            $scores[$fromId] = ($scores[$fromId] ?? 0) + $relationScore;
            $scores[$toId] = ($scores[$toId] ?? 0) + $relationScore;

            $text = "{$relation->fromEntity?->name} → {$typeName} → {$relation->toEntity?->name}";
            if ($relation->description) {
                $text .= ": " . mb_substr($relation->description, 0, 120);
            }

            $relevance = $isActionMatch ? 'action_relation_match' : 'relation_match';
            $excerpts[$fromId][] = ['source' => 'relation', 'text' => $text, 'relevance' => $relevance];
            $excerpts[$toId][] = ['source' => 'relation', 'text' => $text, 'relevance' => $relevance];
        }
    }

    private function scoreCrossReferences(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        if (empty($parsed->keywords)) return;

        foreach ($parsed->keywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $crossRefs = EntityCrossReference::query()
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('context', 'like', '%' . $p . '%');
                    }
                })
                ->whereHas('sourceEntity', fn ($q) => $q->where('universe_id', $universe->id))
                ->with(['sourceEntity:id,name,slug', 'targetEntity:id,name,slug'])
                ->limit(50)
                ->get();

            foreach ($crossRefs as $ref) {
                $scores[$ref->source_entity_id] = ($scores[$ref->source_entity_id] ?? 0) + 20;
                $scores[$ref->target_entity_id] = ($scores[$ref->target_entity_id] ?? 0) + 15;
                $text = "Cross-ref: {$ref->sourceEntity?->name} → {$ref->targetEntity?->name}";
                if ($ref->context) {
                    $text .= " ({$ref->context})";
                }
                $excerpts[$ref->source_entity_id][] = [
                    'source' => 'cross_reference',
                    'text' => $text,
                    'relevance' => 'cross_reference_match',
                ];
            }
        }
    }

    private function scorePowerProfiles(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        if (empty($parsed->keywords)) return;

        foreach ($parsed->keywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $profiles = EntityPowerProfile::query()
                ->whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('name', 'like', '%' . $p . '%')
                          ->orWhere('description', 'like', '%' . $p . '%')
                          ->orWhere('source', 'like', '%' . $p . '%')
                          ->orWhere('category', 'like', '%' . $p . '%');
                    }
                })
                ->with(['entity:id,name,slug'])
                ->limit(50)
                ->get();

            foreach ($profiles as $profile) {
                $scores[$profile->entity_id] = ($scores[$profile->entity_id] ?? 0) + 22;
                $text = ($profile->entity?->name ?? 'Entity') . "  Power: {$profile->name}";
                if ($profile->category) {
                    $text .= " [{$profile->category}]";
                }
                if ($profile->power_level) {
                    $text .= " (Level: {$profile->power_level})";
                }
                $excerpts[$profile->entity_id][] = [
                    'source' => 'power_profile',
                    'text' => $text,
                    'relevance' => 'power_profile_match',
                ];
            }
        }
    }

    private function scoreRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts, Collection &$matchedRecords): void
    {
        $recordTypes = $parsed->getRecordTypes();

        foreach ($recordTypes as $type) {
            match ($type) {
                'death' => $this->scoreDeathRecords($universe, $parsed, $scores, $excerpts, $matchedRecords),
                'infection' => $this->scoreInfectionRecords($universe, $parsed, $scores, $excerpts, $matchedRecords),
                'mutation' => $this->scoreMutationRecords($universe, $parsed, $scores, $excerpts, $matchedRecords),
                'consciousness' => $this->scoreConsciousnessRecords($universe, $parsed, $scores, $excerpts),
                'affiliation' => $this->scoreAffiliationRecords($universe, $parsed, $scores, $excerpts),
                'timeline' => $this->scoreTimelineEvents($universe, $parsed, $scores, $excerpts),
                default => null,
            };
        }
    }

    private function scoreDeathRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts, Collection &$matchedRecords): void
    {
        $query = EntityDeathRecord::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug', 'killer:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('cause_of_death', 'like', '%' . $p . '%')
                          ->orWhere('circumstances', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'))
                          ->orWhereHas('killer', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        $records = $query->limit(50)->get();
        $matchedRecords = $matchedRecords->merge($records->map(fn ($r) => ['type' => 'death', 'record' => $r]));

        foreach ($records as $record) {
            $entityId = $record->entity_id;
            $scores[$entityId] = ($scores[$entityId] ?? 0) + 45;

            $text = $record->entity?->name . '  ' . ($record->death_type ?? 'death');
            if ($record->cause_of_death) {
                $text .= ": {$record->cause_of_death}";
            }
            if ($record->killer) {
                $text .= " (by {$record->killer->name})";
                $scores[$record->killer_entity_id] = ($scores[$record->killer_entity_id] ?? 0) + 40;
            }

            $excerpts[$entityId][] = [
                'source' => 'death_record',
                'text' => $text,
                'relevance' => 'death_record_match',
            ];
        }
    }

    private function scoreInfectionRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts, Collection &$matchedRecords): void
    {
        $query = EntityInfectionRecord::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug', 'pathogen:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('pathogen_name', 'like', '%' . $p . '%')
                          ->orWhere('infection_method', 'like', '%' . $p . '%')
                          ->orWhere('notes', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'))
                          ->orWhereHas('pathogen', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        $records = $query->limit(50)->get();
        $matchedRecords = $matchedRecords->merge($records->map(fn ($r) => ['type' => 'infection', 'record' => $r]));

        foreach ($records as $record) {
            $entityId = $record->entity_id;
            $scores[$entityId] = ($scores[$entityId] ?? 0) + 40;

            $text = ($record->entity?->name ?? 'Entity') . '  infected';
            if ($record->pathogen_name || $record->pathogen?->name) {
                $text .= ' by ' . ($record->pathogen?->name ?? $record->pathogen_name);
            }
            if ($record->infection_method) {
                $text .= " via {$record->infection_method}";
            }
            $text .= " (status: {$record->status})";

            $excerpts[$entityId][] = [
                'source' => 'infection_record',
                'text' => $text,
                'relevance' => 'infection_record_match',
            ];

            if ($record->pathogen_entity_id) {
                $scores[$record->pathogen_entity_id] = ($scores[$record->pathogen_entity_id] ?? 0) + 35;
            }
        }
    }

    private function scoreMutationRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts, Collection &$matchedRecords): void
    {
        $query = EntityMutationStage::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('name', 'like', '%' . $p . '%')
                          ->orWhere('trigger', 'like', '%' . $p . '%')
                          ->orWhere('description', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        $records = $query->limit(50)->get();
        $matchedRecords = $matchedRecords->merge($records->map(fn ($r) => ['type' => 'mutation', 'record' => $r]));

        foreach ($records as $record) {
            $entityId = $record->entity_id;
            $scores[$entityId] = ($scores[$entityId] ?? 0) + 38;
            $excerpts[$entityId][] = [
                'source' => 'mutation_record',
                'text' => ($record->entity?->name ?? 'Entity') . "  Stage {$record->stage_number}: {$record->name}" . ($record->trigger ? " (trigger: {$record->trigger})" : ''),
                'relevance' => 'mutation_record_match',
            ];
        }
    }

    private function scoreConsciousnessRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $query = \App\Models\EntityConsciousnessRecord::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('transfer_method', 'like', '%' . $p . '%')
                          ->orWhere('notes', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        foreach ($query->limit(30)->get() as $record) {
            $scores[$record->entity_id] = ($scores[$record->entity_id] ?? 0) + 35;
            $excerpts[$record->entity_id][] = [
                'source' => 'consciousness_record',
                'text' => ($record->entity?->name ?? 'Entity') . "  consciousness: {$record->transfer_method}",
                'relevance' => 'consciousness_match',
            ];
        }
    }

    private function scoreAffiliationRecords(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $query = \App\Models\EntityAffiliationHistory::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug', 'organization:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('role', 'like', '%' . $p . '%')
                          ->orWhere('rank', 'like', '%' . $p . '%')
                          ->orWhere('notes', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'))
                          ->orWhereHas('organization', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        foreach ($query->limit(50)->get() as $record) {
            $scores[$record->entity_id] = ($scores[$record->entity_id] ?? 0) + 28;
            $text = ($record->entity?->name ?? 'Entity') . '  ' . ($record->role ?? 'member');
            if ($record->organization) {
                $text .= " of {$record->organization->name}";
                $scores[$record->organization_entity_id] = ($scores[$record->organization_entity_id] ?? 0) + 22;
            }
            if ($record->rank) {
                $text .= " (rank: {$record->rank})";
            }
            if ($record->status) {
                $text .= " [{$record->status}]";
            }
            $excerpts[$record->entity_id][] = [
                'source' => 'affiliation',
                'text' => $text,
                'relevance' => 'affiliation_match',
            ];
        }
    }

    private function scoreTimelineEvents(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $query = TimelineEvent::whereHas('timeline', fn ($q) => $q->where('universe_id', $universe->id))
            ->with(['entity:id,name,slug', 'participants.entity:id,name,slug']);

        $keywords = $parsed->keywords;
        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords, $parsed) {
                foreach ($keywords as $kw) {
                    $patterns = $parsed->getSearchPatterns($kw);
                    foreach ($patterns as $p) {
                        $q->orWhere('title', 'like', '%' . $p . '%')
                          ->orWhere('description', 'like', '%' . $p . '%')
                          ->orWhereHas('entity', fn ($eq) => $eq->where('name', 'like', '%' . $p . '%'));
                    }
                }
            });
        }

        foreach ($query->limit(50)->get() as $event) {
            if ($event->entity_id) {
                $scores[$event->entity_id] = ($scores[$event->entity_id] ?? 0) + 32;
                $excerpts[$event->entity_id][] = [
                    'source' => 'timeline_event',
                    'text' => "Event: {$event->title}" . ($event->fictional_date ? " ({$event->fictional_date})" : ''),
                    'relevance' => 'event_match',
                ];
            }

            foreach ($event->participants ?? [] as $participant) {
                if ($participant->entity_id) {
                    $scores[$participant->entity_id] = ($scores[$participant->entity_id] ?? 0) + 22;
                    $excerpts[$participant->entity_id][] = [
                        'source' => 'timeline_event',
                        'text' => "Participant in: {$event->title}" . ($participant->role ? " (role: {$participant->role})" : ''),
                        'relevance' => 'event_participant',
                    ];
                }
            }
        }
    }

    //  Boost Methods 

    /**
     * Boost entities that match multiple keywords (conjunction signal).
     */
    private function applyConjunctionBoost(Universe $universe, ParsedQuery $parsed, array &$scores): void
    {
        $entityIds = array_keys($scores);
        if (empty($entityIds)) return;

        $entities = Entity::where('universe_id', $universe->id)
            ->whereIn('id', $entityIds)
            ->select('id', 'name', 'short_description', 'content')
            ->get();

        foreach ($entities as $entity) {
            $haystack = mb_strtolower(
                ($entity->name ?? '') . ' ' .
                ($entity->short_description ?? '') . ' ' .
                ($entity->content ?? '')
            );

            $matchCount = 0;
            foreach ($parsed->keywords as $keyword) {
                $patterns = $parsed->getSearchPatterns($keyword);
                foreach ($patterns as $p) {
                    if (mb_strpos($haystack, mb_strtolower($p)) !== false) {
                        $matchCount++;
                        break;
                    }
                }
            }

            if ($matchCount >= 2) {
                $bonus = ($matchCount / count($parsed->keywords)) * 50;
                $scores[$entity->id] = ($scores[$entity->id] ?? 0) + $bonus;
            }
        }
    }

    private function applyIntentBoost(Universe $universe, ParsedQuery $parsed, array &$scores): void
    {
        $typeSlug = $parsed->getPreferredEntityType();
        if (!$typeSlug) return;

        $entityIds = Entity::where('universe_id', $universe->id)
            ->whereHas('entityType', fn ($q) => $q->where('slug', $typeSlug))
            ->whereIn('id', array_keys($scores))
            ->pluck('id');

        foreach ($entityIds as $id) {
            $scores[$id] = ($scores[$id] ?? 0) + 35;
        }
    }

    private function applyFeaturedBoost(Universe $universe, array &$scores): void
    {
        if (empty($scores)) return;

        $featuredIds = Entity::where('universe_id', $universe->id)
            ->whereIn('id', array_keys($scores))
            ->where('is_featured', true)
            ->pluck('id');

        foreach ($featuredIds as $id) {
            $scores[$id] = ($scores[$id] ?? 0) + 15;
        }
    }

    //  Connection Graph 

    private function buildConnectionGraph(array $entityIds, Collection $matchedRelations): array
    {
        if (count($entityIds) < 2) {
            return ['nodes' => [], 'edges' => []];
        }

        // Get all relations between our top result entities
        $directRelations = EntityRelation::whereIn('from_entity_id', $entityIds)
            ->whereIn('to_entity_id', $entityIds)
            ->with(['fromEntity:id,name,slug', 'toEntity:id,name,slug', 'relationType:id,name,slug,inverse_name'])
            ->get();

        // Merge with matched relations (which may include connections to entities outside top results)
        $allRelations = $directRelations->merge(
            $matchedRelations->filter(fn ($r) =>
                in_array($r->from_entity_id, $entityIds) || in_array($r->to_entity_id, $entityIds)
            )
        )->unique('id');

        // Build nodes from all entities involved in these relations
        $nodeIds = collect();
        foreach ($allRelations as $rel) {
            $nodeIds->push($rel->from_entity_id);
            $nodeIds->push($rel->to_entity_id);
        }
        $nodeIds = $nodeIds->unique()->values();

        $nodes = Entity::whereIn('id', $nodeIds)
            ->with(['entityType:id,name,slug,color,icon', 'images'])
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->name,
                'slug' => $e->slug,
                'entity_type' => $e->entityType ? [
                    'slug' => $e->entityType->slug,
                    'color' => $e->entityType->color,
                    'icon' => $e->entityType->icon,
                    'name' => $e->entityType->name,
                ] : null,
                'profile_image_url' => $e->images->firstWhere('type', 'profile')?->thumbnail_url
                    ?? $e->images->firstWhere('type', 'profile')?->url,
                'is_primary' => in_array($e->id, $entityIds),
            ])
            ->values()
            ->all();

        $edges = $allRelations->map(fn ($rel) => [
            'id' => $rel->id,
            'from' => $rel->from_entity_id,
            'to' => $rel->to_entity_id,
            'label' => $rel->relationType?->name ?? 'related',
            'inverse_label' => $rel->relationType?->inverse_name,
            'status' => $rel->status,
            'description' => $rel->description,
        ])->values()->all();

        return ['nodes' => $nodes, 'edges' => $edges];
    }

    //  Briefing Builder 

    private function buildBriefing(ParsedQuery $parsed, Collection $ranked, array $excerpts, array $scores, Collection $matchedRelations, Collection $matchedRecords): array
    {
        $count = $ranked->count();
        $kws = implode(', ', $parsed->keywords);
        $topScore = $ranked->first() ? ($scores[$ranked->first()->id] ?? 0) : 0;

        $classification = $topScore > 200 ? 'HIGH CONFIDENCE' : ($topScore > 100 ? 'MODERATE CONFIDENCE' : 'LOW CONFIDENCE');

        // Header
        $header = $this->buildBriefingHeader($parsed, $count, $kws, $classification);

        // Subject profiles
        $subjectProfiles = [];
        foreach ($ranked->take(5) as $i => $entity) {
            $profile = [
                'rank' => $i + 1,
                'name' => $entity->name,
                'type' => $entity->entityType?->name ?? 'Unknown',
                'status' => $entity->entityStatus?->name ?? 'Unknown',
                'score' => round($scores[$entity->id] ?? 0, 1),
                'description' => $entity->short_description,
                'key_evidence' => [],
            ];

            $entityExcerpts = $excerpts[$entity->id] ?? [];
            foreach (array_slice($entityExcerpts, 0, 3) as $exc) {
                $profile['key_evidence'][] = [
                    'source' => $exc['source'],
                    'text' => $exc['text'],
                ];
            }

            $subjectProfiles[] = $profile;
        }

        // Key connections
        $keyConnections = [];
        foreach ($matchedRelations->take(8) as $rel) {
            $keyConnections[] = [
                'from' => $rel->fromEntity?->name ?? '?',
                'type' => $rel->relationType?->name ?? 'connected to',
                'to' => $rel->toEntity?->name ?? '?',
                'description' => $rel->description ? mb_substr($rel->description, 0, 200) : null,
                'context' => $rel->context ? mb_substr($rel->context, 0, 150) : null,
            ];
        }

        // Key records
        $keyRecords = [];
        foreach ($matchedRecords->take(8) as $item) {
            $keyRecords[] = [
                'type' => strtoupper($item['type']),
                'entity' => $item['record']->entity?->name ?? 'Unknown',
                'summary' => $this->getRecordSummary($item),
            ];
        }

        // Narrative summary
        $narrative = $this->buildNarrative($parsed, $ranked, $matchedRelations, $matchedRecords, $scores);

        return [
            'classification' => $classification,
            'header' => $header,
            'narrative' => $narrative,
            'subject_profiles' => $subjectProfiles,
            'key_connections' => $keyConnections,
            'key_records' => $keyRecords,
            'query_metrics' => [
                'total_matches' => count($scores),
                'top_score' => round($topScore, 1),
                'signals_searched' => $this->countSignals($parsed),
                'keywords_detected' => count($parsed->keywords),
                'action_context' => $parsed->hasActions(),
                'intent' => $parsed->intent,
            ],
        ];
    }

    private function buildBriefingHeader(ParsedQuery $parsed, int $count, string $kws, string $classification): string
    {
        $ts = strtoupper(date('d M Y / H:i'));
        $line = "INTELLIGENCE BRIEFING  {$ts}\n";
        $line .= "CLASSIFICATION: {$classification}\n";
        $line .= str_repeat('', 60) . "\n\n";

        $line .= match ($parsed->intent) {
            'person' => "PERSONNEL SEARCH: Identified {$count} subject(s) matching parameters [{$kws}].",
            'location' => "LOCATION SEARCH: Identified {$count} site(s) matching parameters [{$kws}].",
            'temporal' => "TEMPORAL ANALYSIS: Identified {$count} record(s) with temporal relevance to [{$kws}].",
            'process' => "PROCESS ANALYSIS: Identified {$count} record(s) detailing processes related to [{$kws}].",
            'reason' => "CAUSAL ANALYSIS: Identified {$count} record(s) with potential causal data for [{$kws}].",
            default => "GENERAL QUERY: {$count} record(s) found matching parameters [{$kws}].",
        };

        if ($parsed->hasActions()) {
            $actionTokens = $this->getActionTokens($parsed);
            $line .= "\nACTION CONTEXT: Search expanded via contextual signals [" . implode(', ', $actionTokens) . "].";
        }

        return $line;
    }

    private function buildNarrative(ParsedQuery $parsed, Collection $ranked, Collection $matchedRelations, Collection $matchedRecords, array $scores): string
    {
        if ($ranked->isEmpty()) {
            return 'No subjects identified for this query.';
        }

        $lines = [];
        $top = $ranked->first();
        $topScore = round($scores[$top->id] ?? 0, 1);
        $otherCount = $ranked->count() - 1;

        $lines[] = "Primary subject identified: {$top->name} (confidence: {$topScore}).";

        if ($top->short_description) {
            $lines[] = mb_substr($top->short_description, 0, 250);
        }

        if ($otherCount > 0) {
            $otherNames = $ranked->skip(1)->take(4)->pluck('name')->all();
            $lines[] = '';
            $lines[] = "Additional subjects of interest: " . implode(', ', $otherNames) .
                ($otherCount > 4 ? " and " . ($otherCount - 4) . " more." : ".");
        }

        if ($matchedRelations->isNotEmpty()) {
            $lines[] = '';
            $lines[] = "CONNECTIONS ANALYSIS:";
            foreach ($matchedRelations->take(6) as $rel) {
                $typeName = $rel->relationType?->name ?? 'connected to';
                $line = "• {$rel->fromEntity?->name} {$typeName} {$rel->toEntity?->name}";
                if ($rel->description) {
                    $line .= "  " . mb_substr($rel->description, 0, 150);
                }
                $lines[] = $line;
            }
        }

        if ($matchedRecords->isNotEmpty()) {
            $lines[] = '';
            $lines[] = "ASSOCIATED RECORDS:";
            foreach ($matchedRecords->take(6) as $item) {
                $type = strtoupper($item['type']);
                $entityName = $item['record']->entity?->name ?? 'Unknown';
                $lines[] = "• [{$type}] {$entityName}: " . $this->getRecordSummary($item);
            }
        }

        return implode("\n", $lines);
    }

    private function countSignals(ParsedQuery $parsed): int
    {
        $count = 8; // names, aliases, descriptions, sections, quotes, cross-refs, power profiles, attributes
        if ($parsed->hasActions()) {
            $count += count($parsed->getRecordTypes());
        }
        return $count;
    }

    private function getRecordSummary(array $item): string
    {
        $record = $item['record'];

        return match ($item['type']) {
            'death' => ($record->death_type ?? 'Death') .
                ($record->cause_of_death ? "  {$record->cause_of_death}" : '') .
                ($record->killer?->name ? " (by {$record->killer->name})" : ''),
            'infection' => ($record->pathogen_name ?? $record->pathogen?->name ?? 'Unknown pathogen') .
                ($record->infection_method ? " via {$record->infection_method}" : '') .
                " (Status: {$record->status})",
            'mutation' => "Stage {$record->stage_number}: {$record->name}" .
                ($record->trigger ? " triggered by {$record->trigger}" : ''),
            default => 'Record found',
        };
    }

    //  Helpers 

    /**
     * Score entities by matching keywords against EntityAttribute values.
     *
     * Allows queries like "blonde female" to surface entities with matching
     * attribute values (e.g. hair_color=blonde, gender=female) even when the
     * entity name and description do not contain those words.
     */
    private function scoreAttributes(Universe $universe, ParsedQuery $parsed, array &$scores, array &$excerpts): void
    {
        $allKeywords = array_unique(array_merge($parsed->keywords, $this->getActionTokens($parsed)));
        if (empty($allKeywords)) return;

        foreach ($allKeywords as $keyword) {
            $patterns = $parsed->getSearchPatterns($keyword);

            $attributes = EntityAttribute::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
                ->where(function ($q) use ($patterns) {
                    foreach ($patterns as $p) {
                        $q->orWhere('value', 'like', '%' . $p . '%');
                    }
                })
                ->with(['entity:id,name,slug', 'definition:id,name,slug'])
                ->limit(100)
                ->get();

            foreach ($attributes as $attr) {
                $scores[$attr->entity_id] = ($scores[$attr->entity_id] ?? 0) + 18;
                $defName = $attr->definition?->name ?? 'attribute';
                $excerpts[$attr->entity_id][] = [
                    'source'    => 'attribute',
                    'text'      => "{$defName}: {$attr->value}",
                    'relevance' => 'attribute_match',
                ];
            }
        }
    }

    /**
     * Compute extra relation slugs by checking all parsed tokens against the
     * dynamically-loaded MetaEntityRelationType token map.
     *
     * Supplements the static ACTION_WORDS slugs so newly added DB relation types
     * are recognised without any code change.
     */
    private function resolveRelationSlugsFromTokens(ParsedQuery $parsed): array
    {
        $tokenMap = $this->loadRelationTypeTokenMap();
        $slugs = [];

        foreach ($parsed->allTokens as $token) {
            if (isset($tokenMap[$token])) {
                $slugs = array_merge($slugs, $tokenMap[$token]);
            }
        }

        return array_unique($slugs);
    }

    /**
     * Build a token → slug[] reverse map from all MetaEntityRelationType records.
     *
     * Tokenises the type's name, inverse_name, and slug, filters stop words and
     * tokens shorter than 4 chars, and builds a lookup table.
     *
     * Result shape: ['killed' => ['killed-by'], 'betrayed' => ['betrayed-by'], ...]
     *
     * Cached for 1 hour since relation types change infrequently.
     */
    private function loadRelationTypeTokenMap(): array
    {
        return Cache::remember('meta:relation-type-token-map', 3600, function () {
            $stopWords = ['by', 'of', 'to', 'at', 'in', 'on', 'with', 'from', 'for', 'and', 'the', 'a', 'an'];
            $map = [];

            MetaEntityRelationType::select(['slug', 'name', 'inverse_name'])->get()->each(function ($type) use (&$map, $stopWords) {
                // Tokenise name and inverse_name
                foreach (array_filter([$type->name, $type->inverse_name]) as $text) {
                    $words = preg_split('/[\s\-_]+/', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY);
                    foreach ($words as $word) {
                        $word = preg_replace('/[^a-z0-9]/', '', $word);
                        if (mb_strlen($word) >= 4 && !in_array($word, $stopWords, true)) {
                            $map[$word] ??= [];
                            if (!in_array($type->slug, $map[$word], true)) {
                                $map[$word][] = $type->slug;
                            }
                        }
                    }
                }
                // Also tokenise the slug itself: "killed-by" → ["killed"]
                foreach (explode('-', $type->slug) as $word) {
                    if (mb_strlen($word) >= 4 && !in_array($word, $stopWords, true)) {
                        $map[$word] ??= [];
                        if (!in_array($type->slug, $map[$word], true)) {
                            $map[$word][] = $type->slug;
                        }
                    }
                }
            });

            return $map;
        });
    }

    /**
     * Preload multi-word entity names and aliases for a universe.
     *
     * Returns lowercased multi-word names only (single-word names are already
     * handled well by normal keyword tokenisation). Passed to the parser so any
     * entity name however recently added is recognised as a compound phrase.
     *
     * Cached for 30 minutes, matching the entity show cache TTL.
     */
    private function loadEntityNames(Universe $universe): array
    {
        return Cache::remember("universe:{$universe->id}:search-entity-names", 1800, function () use ($universe) {
            $names = Entity::where('universe_id', $universe->id)
                ->whereNull('deleted_at')
                ->pluck('name')
                ->map(fn ($n) => mb_strtolower($n))
                ->filter(fn ($n) => mb_strlen($n) >= 4 && mb_strpos($n, ' ') !== false)
                ->values()
                ->all();

            $aliases = EntityAlias::whereHas('entity', fn ($q) => $q->where('universe_id', $universe->id))
                ->pluck('alias')
                ->map(fn ($a) => mb_strtolower($a))
                ->filter(fn ($a) => mb_strlen($a) >= 4 && mb_strpos($a, ' ') !== false)
                ->values()
                ->all();

            return array_unique(array_merge($names, $aliases));
        });
    }

    private function extractExcerpt(?string $text, string $keyword, int $contextLength = 100): string
    {
        if (!$text) return '';

        $pos = mb_stripos($text, $keyword);
        if ($pos === false) {
            return mb_substr($text, 0, $contextLength * 2) . (mb_strlen($text) > $contextLength * 2 ? '...' : '');
        }

        $start = max(0, $pos - $contextLength);
        $length = mb_strlen($keyword) + ($contextLength * 2);
        $excerpt = mb_substr($text, $start, $length);

        $prefix = $start > 0 ? '...' : '';
        $suffix = ($start + $length) < mb_strlen($text) ? '...' : '';

        return $prefix . $excerpt . $suffix;
    }

    private function excerptWeight(string $relevance): int
    {
        return match ($relevance) {
            'exact_match' => 100,
            'exact_alias' => 90,
            'action_relation_match' => 85,
            'death_record_match' => 80,
            'infection_record_match' => 75,
            'mutation_record_match' => 75,
            'consciousness_match' => 70,
            'relation_match' => 65,
            'starts_with' => 60,
            'description_match' => 55,
            'section_title_match' => 50,
            'attribute_match' => 42,
            'power_profile_match' => 45,
            'affiliation_match' => 45,
            'event_match' => 40,
            'quote_match' => 40,
            'contains' => 35,
            'partial_alias' => 35,
            'section_content_match' => 30,
            'content_match' => 25,
            'cross_reference_match' => 20,
            'event_participant' => 15,
            default => 10,
        };
    }

    private function getActionTokens(ParsedQuery $parsed): array
    {
        $actionWords = SearchQueryParser::getActionWords();
        $actionTokens = [];
        foreach ($parsed->allTokens as $token) {
            if (array_key_exists($token, $actionWords)) {
                $actionTokens[] = $token;
            }
        }
        return $actionTokens;
    }

    private function emptyResult(string $rawQuery, ParsedQuery $parsed): array
    {
        return [
            'query' => [
                'raw' => $rawQuery,
                'keywords' => $parsed->keywords,
                'intent' => $parsed->intent,
                'actions' => $parsed->allTokens,
                'has_action_context' => $parsed->hasActions(),
            ],
            'briefing' => [
                'classification' => 'NO DATA',
                'header' => 'NO RECORDS FOUND: Query did not match any database entries.',
                'narrative' => 'The search query did not produce any results. Try different keywords, broader search terms, or check spelling.',
                'subject_profiles' => [],
                'key_connections' => [],
                'key_records' => [],
                'query_metrics' => [
                    'total_matches' => 0,
                    'top_score' => 0,
                    'signals_searched' => 0,
                    'keywords_detected' => count($parsed->keywords),
                    'action_context' => $parsed->hasActions(),
                    'intent' => $parsed->intent,
                ],
            ],
            'results' => [],
            'connections' => ['nodes' => [], 'edges' => []],
            'total' => 0,
        ];
    }
}
