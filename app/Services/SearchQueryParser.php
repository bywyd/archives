<?php

namespace App\Services;

/**
 * Parses raw human search queries into structured search tokens.
 *
 * Handles input like:
 *   "who betrayed wesker"
 *   "how stars dissolved"
 *   "what happened raccoon city"
 *
 * Supports dynamic compound phrase detection via $knownPhrases (e.g., entity
 * names pre-loaded from the database at the service layer) in addition to the
 * built-in COMPOUND_NAMES fallback list.
 */
class SearchQueryParser
{
    /**
     * Common English stop words to filter out.
     */
    private const STOP_WORDS = [
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
        'should', 'may', 'might', 'must', 'can', 'could',
        'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
        'she', 'her', 'it', 'its', 'they', 'them', 'their',
        'this', 'that', 'these', 'those',
        'am', 'if', 'or', 'but', 'nor', 'not', 'no', 'so', 'too', 'very',
        'just', 'about', 'above', 'after', 'again', 'all', 'also', 'any',
        'because', 'before', 'below', 'between', 'both', 'by', 'each',
        'few', 'for', 'from', 'further', 'get', 'got', 'here', 'in',
        'into', 'more', 'most', 'of', 'off', 'on', 'once', 'only', 'other',
        'out', 'over', 'own', 'same', 'some', 'such', 'than', 'then',
        'there', 'through', 'to', 'under', 'until', 'up', 'with',
    ];

    /**
     * Intent keywords map question words to search intent.
     */
    private const INTENT_WORDS = [
        'who'   => 'person',
        'whom'  => 'person',
        'whose' => 'person',
        'where' => 'location',
        'when'  => 'temporal',
        'what'  => 'general',
        'which' => 'general',
        'how'   => 'process',
        'why'   => 'reason',
        'tell'  => 'general',
        'show'  => 'general',
        'find'  => 'general',
        'list'  => 'general',
    ];

    /**
     * Lemmatization map  normalizes verb forms to a root form.
     */
    private const LEMMA_MAP = [
        'kills'      => 'kill',
        'killing'    => 'kill',
        'murders'    => 'murder',
        'murdering'  => 'murder',
        'dies'       => 'died',
        'dying'      => 'died',
        'deaths'     => 'death',
        'betrays'    => 'betray',
        'betraying'  => 'betray',
        'betrayals'  => 'betrayal',
        'deceives'   => 'deceive',
        'deceiving'  => 'deceive',
        'infects'    => 'infect',
        'infecting'  => 'infect',
        'infections' => 'infection',
        'mutates'    => 'mutate',
        'mutating'   => 'mutate',
        'mutations'  => 'mutation',
        'transforms' => 'transform',
        'transforming' => 'transform',
        'creates'    => 'create',
        'creating'   => 'create',
        'founds'     => 'found',
        'founding'   => 'found',
        'develops'   => 'develop',
        'developing' => 'develop',
        'joins'      => 'join',
        'joining'    => 'join',
        'members'    => 'member',
        'works'      => 'work',
        'working'    => 'work',
        'destroys'   => 'destroy',
        'destroying' => 'destroy',
        'dissolves'  => 'dissolve',
        'dissolving' => 'dissolve',
        'happens'    => 'happen',
        'happening'  => 'happen',
        'events'     => 'event',
        'incidents'  => 'incident',
        'outbreaks'  => 'outbreak',
        'leads'      => 'lead',
        'leading'    => 'lead',
        'commands'   => 'command',
        'commanding' => 'command',
        'fights'     => 'fight',
        'fighting'   => 'fight',
        'battles'    => 'battle',
        'rivals'     => 'rival',
        'cures'      => 'cure',
        'curing'     => 'cure',
        'heals'      => 'heal',
        'healing'    => 'heal',
        'researches' => 'research',
        'researching' => 'research',
        'experiments' => 'experiment',
        'experimenting' => 'experiment',
        'transfers'  => 'transfer',
        'transferring' => 'transfer',
        'possesses'  => 'possess',
        'possessing' => 'possess',
        'saves'      => 'save',
        'saving'     => 'save',
        'saved'      => 'save',
        'hosts'      => 'host',
        'hosting'    => 'host',
        'hosted'     => 'host',
        'uses'       => 'use',
        'using'      => 'use',
        'used'       => 'use',
        'deploys'    => 'deploy',
        'deploying'  => 'deploy',
        'deployed'   => 'deploy',
        'mentors'    => 'mentor',
        'mentoring'  => 'mentor',
        'mentored'   => 'mentor',
        'allies'     => 'ally',
        'employed'   => 'employ',
        'employs'    => 'employ',
    ];

    /**
     * Action words map verbs/nouns to relation type slugs and record types.
     * Slugs must match actual MetaEntityRelationType slugs in the database.
     */
    private const ACTION_WORDS = [
        // Betrayal / deception
        'betray'     => ['relations' => ['betrayed-by'], 'records' => []],
        'betrayed'   => ['relations' => ['betrayed-by'], 'records' => []],
        'betrayal'   => ['relations' => ['betrayed-by'], 'records' => []],
        'deceive'    => ['relations' => ['betrayed-by'], 'records' => []],
        'deceived'   => ['relations' => ['betrayed-by'], 'records' => []],

        // Kill / death
        'kill'       => ['relations' => ['killed-by'], 'records' => ['death']],
        'killed'     => ['relations' => ['killed-by'], 'records' => ['death']],
        'murder'     => ['relations' => ['killed-by'], 'records' => ['death']],
        'murdered'   => ['relations' => ['killed-by'], 'records' => ['death']],
        'died'       => ['relations' => ['killed-by'], 'records' => ['death']],
        'death'      => ['relations' => ['killed-by'], 'records' => ['death']],
        'dead'       => ['relations' => ['killed-by'], 'records' => ['death']],

        // Infection / virus
        'infect'     => ['relations' => ['infected-by'], 'records' => ['infection']],
        'infected'   => ['relations' => ['infected-by'], 'records' => ['infection']],
        'infection'  => ['relations' => ['infected-by'], 'records' => ['infection']],
        'virus'      => ['relations' => ['infected-by', 'derived-from', 'mutation-of'], 'records' => ['infection']],
        'pathogen'   => ['relations' => ['infected-by', 'derived-from'], 'records' => ['infection']],
        'mutate'     => ['relations' => ['mutation-of'], 'records' => ['mutation']],
        'mutated'    => ['relations' => ['mutation-of'], 'records' => ['mutation']],
        'mutation'   => ['relations' => ['mutation-of'], 'records' => ['mutation']],
        'transform'  => ['relations' => ['mutation-of'], 'records' => ['mutation']],

        // Creation / founding
        'create'     => ['relations' => ['created-by'], 'records' => []],
        'created'    => ['relations' => ['created-by'], 'records' => []],
        'found'      => ['relations' => ['created-by'], 'records' => []],
        'founded'    => ['relations' => ['created-by'], 'records' => []],
        'develop'    => ['relations' => ['created-by', 'derived-from'], 'records' => []],
        'developed'  => ['relations' => ['created-by', 'derived-from'], 'records' => []],
        'inventor'   => ['relations' => ['created-by'], 'records' => []],

        // Affiliation / membership
        'join'       => ['relations' => ['member-of', 'employed-by'], 'records' => ['affiliation']],
        'joined'     => ['relations' => ['member-of', 'employed-by'], 'records' => ['affiliation']],
        'member'     => ['relations' => ['member-of'], 'records' => ['affiliation']],
        'work'       => ['relations' => ['employed-by', 'member-of'], 'records' => ['affiliation']],
        'worked'     => ['relations' => ['employed-by', 'member-of'], 'records' => ['affiliation']],
        'employ'     => ['relations' => ['employed-by'], 'records' => ['affiliation']],
        'ally'       => ['relations' => ['allied-with'], 'records' => ['affiliation']],
        'allied'     => ['relations' => ['allied-with'], 'records' => ['affiliation']],

        // Destruction / dissolution
        'destroy'    => ['relations' => ['killed-by'], 'records' => ['death']],
        'destroyed'  => ['relations' => ['killed-by'], 'records' => ['death']],
        'dissolve'   => ['relations' => ['killed-by'], 'records' => ['death', 'affiliation']],
        'dissolved'  => ['relations' => ['killed-by'], 'records' => ['death', 'affiliation']],

        // Events / timeline
        'happen'     => ['relations' => ['participated-in', 'located-at'], 'records' => ['timeline']],
        'happened'   => ['relations' => ['participated-in', 'located-at'], 'records' => ['timeline']],
        'event'      => ['relations' => ['participated-in'], 'records' => ['timeline']],
        'incident'   => ['relations' => ['participated-in', 'located-at'], 'records' => ['timeline']],
        'outbreak'   => ['relations' => ['infected-by', 'located-at', 'deployed-at'], 'records' => ['timeline', 'infection']],

        // Command / leadership
        'lead'       => ['relations' => ['leader-of', 'subordinate-of'], 'records' => ['affiliation']],
        'led'        => ['relations' => ['leader-of', 'subordinate-of'], 'records' => ['affiliation']],
        'command'    => ['relations' => ['leader-of', 'subordinate-of'], 'records' => ['affiliation']],
        'commanded'  => ['relations' => ['leader-of', 'subordinate-of'], 'records' => ['affiliation']],

        // Combat / fight
        'fight'      => ['relations' => ['rival-of', 'enemy-of'], 'records' => []],
        'fought'     => ['relations' => ['rival-of', 'enemy-of'], 'records' => []],
        'battle'     => ['relations' => ['rival-of', 'enemy-of'], 'records' => ['timeline']],
        'rival'      => ['relations' => ['rival-of', 'enemy-of'], 'records' => []],
        'enemy'      => ['relations' => ['enemy-of'], 'records' => []],

        // Rescue / saving
        'save'       => ['relations' => ['saved-by'], 'records' => []],
        'rescue'     => ['relations' => ['saved-by'], 'records' => []],
        'rescued'    => ['relations' => ['saved-by'], 'records' => []],

        // Cure / healing
        'cure'       => ['relations' => ['cured-by'], 'records' => ['infection']],
        'cured'      => ['relations' => ['cured-by'], 'records' => ['infection']],
        'heal'       => ['relations' => ['cured-by'], 'records' => ['infection']],

        // Research / experiment
        'research'   => ['relations' => ['researched', 'experimented-on'], 'records' => []],
        'researched' => ['relations' => ['researched', 'experimented-on'], 'records' => []],
        'experiment' => ['relations' => ['experimented-on'], 'records' => ['infection', 'mutation']],
        'study'      => ['relations' => ['researched'], 'records' => []],
        'studied'    => ['relations' => ['researched'], 'records' => []],

        // Consciousness / transfer / hosting
        'transfer'   => ['relations' => ['hosts'], 'records' => ['consciousness']],
        'possess'    => ['relations' => ['hosts'], 'records' => ['consciousness']],
        'possessed'  => ['relations' => ['hosts'], 'records' => ['consciousness']],
        'host'       => ['relations' => ['hosts'], 'records' => ['consciousness']],
        'vessel'     => ['relations' => ['hosts'], 'records' => ['consciousness']],

        // Location / containing
        'locate'     => ['relations' => ['located-at', 'contains', 'deployed-at'], 'records' => []],
        'located'    => ['relations' => ['located-at', 'contains', 'deployed-at'], 'records' => []],
        'contain'    => ['relations' => ['contains'], 'records' => []],
        'contained'  => ['relations' => ['contains'], 'records' => []],
        'deploy'     => ['relations' => ['deployed-at'], 'records' => []],

        // Mentorship / training
        'mentor'     => ['relations' => ['mentor-of'], 'records' => []],
        'train'      => ['relations' => ['mentor-of'], 'records' => []],
        'trained'    => ['relations' => ['mentor-of'], 'records' => []],

        // Lineage / derivation
        'derive'     => ['relations' => ['derived-from', 'prototype-of'], 'records' => []],
        'derived'    => ['relations' => ['derived-from', 'prototype-of'], 'records' => []],
        'evolve'     => ['relations' => ['derived-from', 'mutation-of'], 'records' => ['mutation']],
        'evolved'    => ['relations' => ['derived-from', 'mutation-of'], 'records' => ['mutation']],
        'prototype'  => ['relations' => ['prototype-of'], 'records' => []],
        'predecessor' => ['relations' => ['predecessor-of'], 'records' => []],
        'successor'  => ['relations' => ['predecessor-of'], 'records' => []],

        // Family
        'parent'     => ['relations' => ['parent-of', 'child-of'], 'records' => []],
        'child'      => ['relations' => ['child-of', 'parent-of'], 'records' => []],
        'family'     => ['relations' => ['parent-of', 'child-of', 'sibling-of', 'spouse-of'], 'records' => []],
        'sibling'    => ['relations' => ['sibling-of'], 'records' => []],
        'spouse'     => ['relations' => ['spouse-of'], 'records' => []],
        'married'    => ['relations' => ['spouse-of'], 'records' => []],

        // Usage
        'use'        => ['relations' => ['used-by'], 'records' => []],
        'weapon'     => ['relations' => ['used-by'], 'records' => []],
    ];


    /**
     * Public accessor for the action words dictionary.
     */
public static function getActionWords(): array
    {
        return self::ACTION_WORDS;
    }

    /**
     * Parse a raw query string into a structured ParsedQuery.
     *
     * @param  string   $rawQuery     The user's raw text input.
     * @param  string[] $knownPhrases Multi-word phrases to protect from tokenisation
     *                                splitting (e.g. entity names loaded from the DB).
     *                                Merged with the built-in COMPOUND_NAMES fallback.
     */
    public function parse(string $rawQuery, array $knownPhrases = []): ParsedQuery
    {
        $rawQuery = trim($rawQuery);

        if ($rawQuery === '') {
            return new ParsedQuery($rawQuery, [], null, [], []);
        }

        $lower = mb_strtolower($rawQuery);

        // Phase 1: Extract compound names/phrases from the query.
        // Only use caller-supplied phrases (from DB/universe).
        $allPhrases = array_unique($knownPhrases);
        usort($allPhrases, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        $compounds = [];
        $remaining = $lower;
        foreach ($allPhrases as $phrase) {
            if (mb_strlen($phrase) < 3) continue;
            if (mb_strpos($remaining, $phrase) !== false) {
                $compounds[] = $phrase;
                $remaining = str_replace($phrase, str_repeat('_', mb_strlen($phrase)), $remaining);
            }
        }

        // Phase 2: Tokenize remaining text
        $tokens = preg_split('/[\s,;.!?\'"()\[\]{}]+/', $remaining, -1, PREG_SPLIT_NO_EMPTY);
        $tokens = array_values(array_filter($tokens, fn ($t) => mb_strlen($t) > 0 && $t !== str_repeat('_', mb_strlen($t))));

        // Phase 2.5: N-gram generation.
        // Build 2-word and 3-word phrase candidates from adjacent query words that
        // were NOT already captured as compound names. These are attached as extra
        // LIKE search variants to improve multi-word entity matching for phrases
        // not registered in the DB entity names list.
        $ngrams = $this->generateNgrams($lower, $compounds);

        // Phase 3: Lemmatize tokens
        $lemmatized = [];
        foreach ($tokens as $token) {
            $lemmatized[] = self::LEMMA_MAP[$token] ?? $token;
        }

        // Merge compounds back as tokens
        $allTokens = array_merge($lemmatized, $compounds);

        // Phase 4: Detect intent
        $intent = null;
        foreach ($allTokens as $token) {
            if (isset(self::INTENT_WORDS[$token])) {
                $intent = self::INTENT_WORDS[$token];
                break;
            }
        }

        // Phase 5: Detect action words and collect signals
        $actions = [];
        $actionTokens = [];
        foreach ($allTokens as $token) {
            if (isset(self::ACTION_WORDS[$token])) {
                $actions[] = self::ACTION_WORDS[$token];
                $actionTokens[] = $token;
            }
        }

        // Phase 6: Extract subject keywords (remove stop/intent/action words)
        $stopAndMeta = array_merge(
            self::STOP_WORDS,
            array_keys(self::INTENT_WORDS),
            $actionTokens,
        );

        $keywords = array_values(array_filter(
            $allTokens,
            fn ($t) => !in_array($t, $stopAndMeta, true) && mb_strlen($t) >= 2,
        ));

        // Phase 7: Build search variants for each keyword.
        // Each keyword gets: its own form, any pre-lemmatisation original form,
        // n-gram phrases that start with the keyword, and a suffix-stem variant
        // for words not already covered by LEMMA_MAP.
        $searchVariants = [];
        $originalTokens = preg_split('/[\s,;.!?\'"|()\[\]{}]+/', $lower, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($keywords as $kw) {
            $variants = [$kw];

            // Original form before lemmatisation
            foreach ($originalTokens as $orig) {
                if ((self::LEMMA_MAP[$orig] ?? $orig) === $kw && $orig !== $kw) {
                    $variants[] = $orig;
                }
            }

            // N-gram phrases that begin with this keyword
            foreach ($ngrams as $ng) {
                if (str_starts_with($ng, $kw . ' ') || $ng === $kw) {
                    $variants[] = $ng;
                }
            }

            // Stem variant for words not covered by LEMMA_MAP
            $stemmed = $this->stem($kw);
            if ($stemmed !== $kw) {
                $variants[] = $stemmed;
            }

            $searchVariants[$kw] = array_unique($variants);
        }

        return new ParsedQuery(
            raw: $rawQuery,
            keywords: $keywords,
            intent: $intent,
            actions: $actions,
            allTokens: $allTokens,
            searchVariants: $searchVariants,
            ngrams: $ngrams,
        );
    }

    /**
     * Generate 2-gram and 3-gram phrase candidates from adjacent words in the
     * original query, excluding phrases already detected as compound names.
     *
     * @param  string   $lower     Lowercased original query string.
     * @param  string[] $compounds Already-matched compound phrases.
     * @return string[]
     */
    private function generateNgrams(string $lower, array $compounds): array
    {
        $words = preg_split('/[\s,;.!?\'"|()\[\]{}]+/', $lower, -1, PREG_SPLIT_NO_EMPTY);
        $words = array_values(array_filter($words, fn ($w) => mb_strlen($w) >= 2));

        $ngrams = [];

        for ($i = 0; $i < count($words) - 1; $i++) {
            $bigram = $words[$i] . ' ' . $words[$i + 1];

            if (!in_array($bigram, $compounds, true)) {
                $ngrams[] = $bigram;
            }

            if ($i + 2 < count($words)) {
                $trigram = $bigram . ' ' . $words[$i + 2];
                // Only add trigram if its leading bigram was not already a compound
                if (!in_array($trigram, $compounds, true) && !in_array($bigram, $compounds, true)) {
                    $ngrams[] = $trigram;
                }
            }
        }

        return array_unique($ngrams);
    }

    /**
     * Apply simple English suffix stemming to a token.
     *
     * Used to derive an additional search variant for inflected words not
     * covered by LEMMA_MAP. The stem is additive it never replaces the
     * original token so false positives do not degrade recall.
     */
    private function stem(string $token): string
    {
        $len = mb_strlen($token);

        // -ings: "killings" → "kill"
        if ($len > 7 && str_ends_with($token, 'ings')) {
            return mb_substr($token, 0, $len - 4);
        }
        // -ers: "killers" → "kill"
        if ($len > 6 && str_ends_with($token, 'ers')) {
            return mb_substr($token, 0, $len - 3);
        }
        // -ing: "attacking" → "attack"
        if ($len > 6 && str_ends_with($token, 'ing')) {
            return mb_substr($token, 0, $len - 3);
        }
        // -tion: "infiltration" → "infiltrat"
        if ($len > 7 && str_ends_with($token, 'tion')) {
            return mb_substr($token, 0, $len - 4);
        }
        // -ed: "infected" → "infect"
        if ($len > 5 && str_ends_with($token, 'ed')) {
            return mb_substr($token, 0, $len - 2);
        }
        // -es: "infects" → "infect"
        if ($len > 4 && str_ends_with($token, 'es') && !str_ends_with($token, 'ies')) {
            return mb_substr($token, 0, $len - 2);
        }
        // -s: simple plural "outbreaks" → "outbreak"
        if ($len > 4 && str_ends_with($token, 's') && !str_ends_with($token, 'ss')) {
            return mb_substr($token, 0, $len - 1);
        }

        return $token;
    }
}

/**
 * Simple value object holding parsed query data.
 */
class ParsedQuery
{
    public function __construct(
        public readonly string $raw,
        /** @var string[] Subject keywords (entity names, nouns) */
        public readonly array $keywords,
        /** @var string|null Intent: person, location, temporal, general, process, reason */
        public readonly ?string $intent,
        /** @var array<array{relations: string[], records: string[]}> Detected action signals */
        public readonly array $actions,
        /** @var string[] All tokens after processing */
        public readonly array $allTokens,
        /** @var array<string, string[]> Keyword => [variant spellings for LIKE matching] */
        public readonly array $searchVariants = [],
        /** @var string[] N-gram phrase candidates derived from adjacent query words */
        public readonly array $ngrams = [],
    ) {}

    /**
     * Get all relation type slugs to search from detected action words.
     */
    public function getRelationSlugs(): array
    {
        $slugs = [];
        foreach ($this->actions as $action) {
            $slugs = array_merge($slugs, $action['relations'] ?? []);
        }
        return array_unique($slugs);
    }

    /**
     * Get all record types to search from detected action words.
     */
    public function getRecordTypes(): array
    {
        $types = [];
        foreach ($this->actions as $action) {
            $types = array_merge($types, $action['records'] ?? []);
        }
        return array_unique($types);
    }

    /**
     * Get entity type preference based on intent.
     */
    public function getPreferredEntityType(): ?string
    {
        return match ($this->intent) {
            'person' => 'person',
            'location' => 'location',
            default => null,
        };
    }

    /**
     * Get all LIKE search patterns for a keyword (includes variants).
     */
    public function getSearchPatterns(string $keyword): array
    {
        return $this->searchVariants[$keyword] ?? [$keyword];
    }

    public function hasKeywords(): bool
    {
        return count($this->keywords) > 0;
    }

    public function hasActions(): bool
    {
        return count($this->actions) > 0;
    }
}
