// ============================================================
// Archives - API Entity Types
// Maps 1:1 with Laravel API Resource responses
// ============================================================

// --- Base ---

export type Timestamps = {
    created_at: string;
    updated_at: string;
};

export type SoftDeletable = {
    deleted_at: string | null;
};

export type PaginatedResponse<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta?: {
        current_page: number;
        from: number | null;
        last_page: number;
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
    current_page?: number;
    from?: number | null;
    last_page?: number;
    path?: string;
    per_page?: number;
    to?: number | null;
    total?: number;
};

// --- Images ---

export type ApiImage = {
    id: number;
    type: 'profile' | 'gallery' | 'banner' | 'icon';
    url: string;
    thumbnail_url: string | null;
    alt_text: string | null;
    caption: string | null;
    credit: string | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
};

// --- Meta / Lookup ---

export type ApiMetaEntityType = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    schema: Record<string, unknown> | null;
} & Timestamps;

export type ApiMetaEntityStatus = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
} & Timestamps;

export type ApiMetaRelationType = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    inverse_name: string | null;
    is_directional: boolean;
} & Timestamps;

export type ApiAttributeDefinition = {
    id: number;
    meta_entity_type_id: number | null;
    name: string;
    slug: string;
    data_type: string;
    group_name: string | null;
    is_filterable: boolean;
    is_required: boolean;
    default_value: string | null;
    sort_order: number;
    entity_type?: ApiMetaEntityType;
} & Timestamps;

// --- Universe ---

export type ApiUniverse = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    settings: Record<string, unknown> | null;
    is_locked: boolean;
    images: ApiImage[];
    entities_count?: number;
    timelines_count?: number;
    compound_names: string[] | null;
} & Timestamps & SoftDeletable;

// --- Entity Location (compact, for map pins) ---

export type ApiEntityLocation = {
    id: number;
    universe_id: number;
    name: string;
    slug: string;
    short_description: string | null;
    entity_type: string | null;
    entity_type_slug: string | null;
    entity_status: string | null;
    entity_status_slug: string | null;
    latitude: number;
    longitude: number;
};

// --- Map data (single bundled endpoint for the operations map) ---

export type ApiMapRecentEvent = {
    id: number;
    timeline_id: number;
    timeline_name: string;
    title: string;
    event_type: 'incident' | 'discovery' | 'founding' | 'death' | 'battle' | 'outbreak' | 'political' | 'research' | 'deployment' | 'other' | null;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'extinction-level' | null;
    fictional_date: string | null;
    sort_order: number;
};

export type ApiMapData = {
    pins: ApiEntityLocation[];
    recent_entities: ApiEntitySummary[];
    recent_events: ApiMapRecentEvent[];
};

// --- Entity ---

export type ApiEntityPreview = {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    entity_type: { id: number; name: string; slug: string } | null;
    entity_status: { id: number; name: string; color: string | null } | null;
    profile_image: string | null;
};

export type ApiEntitySummary = {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    entity_type: ApiMetaEntityType | null;
    entity_status: ApiMetaEntityStatus | null;
    is_featured: boolean;
    is_locked: boolean;
    images: ApiImage[];
    updatexd_at: string;
    pivot?: {
        role: string | null;
        description: string | null;
        sort_order: number;
    };
};

export type ApiEntity = {
    id: number;
    universe_id: number;
    name: string;
    slug: string;
    short_description: string | null;
    content: string | null;
    entity_type: ApiMetaEntityType | null;
    entity_status: ApiMetaEntityStatus | null;
    metadata: Record<string, unknown> | null;
    is_featured: boolean;
    is_locked: boolean;
    images: ApiImage[];
    aliases: ApiEntityAlias[];
    sections: ApiEntitySection[];
    attributes: ApiEntityAttribute[];
    outgoing_relations: ApiEntityRelation[];
    incoming_relations: ApiEntityRelation[];
    timelines: ApiTimelinePivot[];
    media_sources: ApiMediaSourcePivot[];
    tags: ApiTag[];
    categories: ApiCategory[];
    infection_records: ApiEntityInfectionRecord[];
    mutation_stages: ApiEntityMutationStage[];
    affiliation_history: ApiEntityAffiliationHistory[];
    quotes: ApiEntityQuote[];
    power_profiles: ApiEntityPowerProfile[];
    consciousness_records: ApiEntityConsciousnessRecord[];
    intelligence_records: ApiEntityIntelligenceRecord[];
    death_records: ApiEntityDeathRecord[];
    transmission_participants: ApiEntityTransmissionRelation[];
    transmission_records: ApiEntityTransmissionRecord[];
    maps: ApiEntityMap[];
    universe?: ApiUniverse;
} & Timestamps & SoftDeletable;

export type ApiEntityAlias = {
    id: number;
    entity_id: number;
    alias: string;
    context: string | null;
};

// --- Entity Sections ---

export type ApiEntitySection = {
    id: number;
    entity_id: number;
    title: string;
    slug: string;
    content: string | null;
    section_type: 'narrative' | 'data' | 'classified' | 'gallery' | 'quote' | 'reference';
    sort_order: number;
    is_collapsible: boolean;
    parent_id: number | null;
    children: ApiEntitySection[];
    images: ApiImage[];
} & Timestamps;

// --- Entity Attributes ---

export type ApiEntityAttribute = {
    id: number;
    entity_id: number;
    attribute_definition_id: number;
    value: string | null;
    definition: ApiAttributeDefinition;
} & Timestamps;

// --- Entity Relations ---

export type ApiEntityRelation = {
    id: number;
    from_entity_id: number;
    to_entity_id: number;
    from_entity: ApiEntitySummary;
    to_entity: ApiEntitySummary;
    relation_type: ApiMetaRelationType;
    description: string | null;
    context: string | null;
    metadata: Record<string, unknown> | null;
    fictional_start: string | null;
    fictional_end: string | null;
    status: 'active' | 'former' | 'unknown' | null;
    sort_order: number;
} & Timestamps;

// --- Entity Graph (optimized for connections graph view) ---

type ApiGraphEntityType = {
    slug: string | null;
    color: string | null;
    icon: string | null;
    name: string | null;
};

type ApiGraphRelationType = {
    name: string;
    inverse_name: string | null;
    is_directional: boolean;
};

type ApiGraphRelatedEntity = {
    id: number;
    slug: string;
    name: string;
    entity_type: ApiGraphEntityType | null;
    profile_image_url: string | null;
};

export type ApiGraphOutgoingRelation = {
    id: number;
    to_entity: ApiGraphRelatedEntity;
    relation_type: ApiGraphRelationType | null;
    status: 'active' | 'former' | 'unknown' | null;
    description: string | null;
};

export type ApiGraphIncomingRelation = {
    id: number;
    from_entity: ApiGraphRelatedEntity;
    relation_type: ApiGraphRelationType | null;
    status: 'active' | 'former' | 'unknown' | null;
    description: string | null;
};

export type ApiEntityGraph = {
    id: number;
    slug: string;
    name: string;
    entity_type: ApiGraphEntityType | null;
    profile_image_url: string | null;
    outgoing_relations: ApiGraphOutgoingRelation[];
    incoming_relations: ApiGraphIncomingRelation[];
};

// --- Timelines ---

export type ApiTimeline = {
    id: number;
    universe_id: number;
    name: string;
    slug: string;
    description: string | null;
    sort_order: number;
    images: ApiImage[];
    events?: ApiTimelineEvent[];
    entities_count?: number;
} & Timestamps & SoftDeletable;

export type ApiTimelinePivot = {
    id: number;
    name: string;
    slug: string;
    pivot: {
        role: string | null;
        notes: string | null;
        fictional_start: string | null;
        fictional_end: string | null;
    };
};

export type ApiTimelineEvent = {
    id: number;
    timeline_id: number;
    entity_id: number | null;
    title: string;
    description: string | null;
    narrative: string | null;
    fictional_date: string | null;
    event_type: 'incident' | 'discovery' | 'founding' | 'death' | 'battle' | 'outbreak' | 'political' | 'research' | 'deployment' | 'other' | null;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'extinction-level' | null;
    phase: string | null;
    duration: string | null;
    sort_order: number;
    metadata: Record<string, unknown> | null;
    entity?: ApiEntitySummary;
    location?: ApiEntitySummary;
    participants?: ApiTimelineEventParticipant[];
    intelligence_records?: ApiEntityIntelligenceRecord[];
} & Timestamps;

// --- Timeline Event Participants ---

export type ApiTimelineEventParticipant = {
    id: number;
    timeline_event_id: number;
    entity_id: number;
    entity?: ApiEntitySummary;
    role: string | null;
    outcome: string | null;
    notes: string | null;
    sort_order: number;
} & Timestamps;

// --- Event Reconstruction ---

export type ApiReconstructionResponse = {
    incident: ApiEntity;
    phases: Array<{ name: string; events: ApiEntity[] }>;
    entities: ApiEntitySummary[];
};

// --- Media Sources ---

export type ApiMediaSource = {
    id: number;
    universe_id: number;
    name: string;
    slug: string;
    media_type: string;
    release_date: string | null;
    description: string | null;
    sort_order: number;
    metadata: Record<string, unknown> | null;
    images: ApiImage[];
    entities?: ApiEntitySummary[];
    entities_count?: number;
    tags: ApiTag[];
} & Timestamps;

export type ApiMediaSourcePivot = {
    id: number;
    name: string;
    slug: string;
    media_type: string;
    pivot: {
        role: string | null;
        description: string | null;
        sort_order: number;
    };
};

// --- Infection Records ---

export type ApiEntityInfectionRecord = {
    id: number;
    entity_id: number;
    pathogen_entity_id: number | null;
    cure_entity_id: number | null;
    pathogen?: ApiEntitySummary;
    cure?: ApiEntitySummary;
    pathogen_name: string | null;
    infection_method: string | null;
    cure_name: string | null;
    cure_method: string | null;
    fictional_date_infected: string | null;
    fictional_date_cured: string | null;
    status: 'active' | 'cured' | 'dormant' | 'fatal' | 'mutated' | 'partial' | 'unknown';
    severity: string | null;
    side_effects: string[] | null;
    symptoms_exhibited: string[] | null;
    notes: string | null;
    sort_order: number;
} & Timestamps;

// --- Mutation Stages ---

export type ApiEntityMutationStage = {
    id: number;
    entity_id: number;
    trigger_entity_id: number | null;
    trigger_entity?: ApiEntitySummary;
    stage_number: number;
    name: string;
    trigger: string | null;
    description: string | null;
    physical_changes: string[] | null;
    abilities_gained: string[] | null;
    abilities_lost: string[] | null;
    threat_level: number | null;
    is_reversible: boolean;
    fictional_date: string | null;
    sort_order: number;
} & Timestamps;

// --- Affiliation History ---

export type ApiEntityAffiliationHistory = {
    id: number;
    entity_id: number;
    organization_entity_id: number | null;
    organization?: ApiEntitySummary;
    organization_name: string | null;
    role: string | null;
    rank: string | null;
    fictional_start: string | null;
    fictional_end: string | null;
    status: 'active' | 'former' | 'defected' | 'expelled' | 'deceased' | 'undercover' | 'honorary';
    notes: string | null;
    sort_order: number;
} & Timestamps;

// --- Quotes ---

export type ApiEntityQuote = {
    id: number;
    entity_id: number;
    quote: string;
    context: string | null;
    source_media?: ApiMediaSource;
    fictional_date: string | null;
    is_featured: boolean;
    sort_order: number;
} & Timestamps;

// --- Power Profiles ---

export type ApiEntityPowerProfile = {
    id: number;
    entity_id: number;
    source_entity_id: number | null;
    source_entity?: ApiEntitySummary;
    name: string;
    description: string | null;
    source: string | null;
    category: 'physical' | 'mental' | 'viral' | 'technological' | 'combat' | 'supernatural' | 'medical' | 'other';
    power_level: number | null;
    status: 'active' | 'lost' | 'dormant' | 'evolving' | 'artificial' | 'temporary';
    fictional_date_acquired: string | null;
    fictional_date_lost: string | null;
    sort_order: number;
} & Timestamps;

// --- Consciousness Records ---

export type ApiEntityConsciousnessRecord = {
    id: number;
    entity_id: number;
    vessel_entity_id: number | null;
    vessel?: ApiEntitySummary;
    status: 'active' | 'transferred' | 'dormant' | 'fragmented' | 'merged' | 'destroyed' | 'digital' | 'shared';
    transfer_method: string | null;
    vessel_status: 'original' | 'new' | 'cloned' | 'synthetic' | 'decaying' | 'deceased' | 'overwritten' | null;
    fictional_date_start: string | null;
    fictional_date_end: string | null;
    description: string | null;
    notes: string | null;
    side_effects: string[] | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
} & Timestamps;

// --- Intelligence Records ---

export type ApiEntityIntelligenceRecord = {
    id: number;
    entity_id: number;
    observer_entity_id: number;
    subject_entity_id: number | null;
    timeline_event_id: number | null;
    observer?: ApiEntitySummary;
    subject?: ApiEntitySummary;
    classification: 'known' | 'unknown' | 'classified' | 'redacted' | 'partial' | 'rumored' | 'discovered';
    discovered_during: string | null;
    fictional_date_learned: string | null;
    fictional_date_declassified: string | null;
    intelligence_summary: string | null;
    redacted_details: string | null;
    source: string | null;
    reliability: 'confirmed' | 'suspected' | 'unverified' | 'disinformation' | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
} & Timestamps;

// --- Death & Revival Records ---

export type ApiEntityDeathRecord = {
    id: number;
    entity_id: number;
    killer_entity_id: number | null;
    incident_entity_id: number | null;
    location_entity_id: number | null;
    killer?: ApiEntitySummary;
    incident?: ApiEntitySummary;
    location?: ApiEntitySummary;
    revived_by?: ApiEntitySummary;
    death_type: 'killed' | 'sacrificed' | 'executed' | 'suicide' | 'accidental' | 'presumed' | 'mutation-death' | 'disintegrated';
    fictional_date: string | null;
    cause_of_death: string | null;
    circumstances: string | null;
    is_confirmed: boolean;
    is_revived: boolean;
    revival_method: string | null;
    fictional_date_revived: string | null;
    revival_circumstances: string | null;
    revived_by_entity_id: number | null;
    body_modifications: string[] | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
} & Timestamps;

// --- Transmission Records ---

export type ApiEntityTransmissionRelation = {
    id: number;
    transmission_entity_id: number;
    participant_entity_id: number;
    participant?: ApiEntitySummary;
    role: 'speaker' | 'listener' | 'interceptor' | 'location' | 'mentioned' | 'moderator';
    callsign: string | null;
    channel: string | null;
    is_present: boolean;
    sort_order: number;
    metadata: Record<string, unknown> | null;
} & Timestamps;

export type ApiEntityTransmissionRecord = {
    id: number;
    transmission_entity_id: number;
    speaker_entity_id: number | null;
    speaker?: ApiEntitySummary;
    speaker_label: string | null;
    content: string;
    content_type: 'dialogue' | 'narration' | 'action' | 'static' | 'system' | 'redacted';
    tone: string | null;
    fictional_timestamp: string | null;
    is_redacted: boolean;
    redacted_reason: string | null;
    notes: string | null;
    sort_order: number;
    metadata: Record<string, unknown> | null;
} & Timestamps;

// --- Tags ---

export type ApiTag = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
} & Timestamps;

// Minimal entity used in related-by-tag panel (name + slug + type + profile image)
export type ApiEntityTiny = {
    id: number;
    name: string;
    slug: string;
    entity_type?: { name: string; slug: string; icon?: string | null; color?: string | null } | null;
    profile_image?: { url: string; thumbnail_url?: string | null; alt_text?: string | null } | null;
};

// --- Categories ---

export type ApiCategory = {
    id: number;
    universe_id: number;
    name: string;
    slug: string;
    description: string | null;
    parent_id: number | null;
    sort_order: number;
    entities_count?: number;
    children: ApiCategory[];
} & Timestamps;

// --- Search ---

export type ApiSearchResult = {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    type: string;
    entity_type: ApiMetaEntityType | null;
    entity_status: ApiMetaEntityStatus | null;
    universe: {
        id: number;
        name: string;
        slug: string;
    } | null;
    images: ApiImage[];
};

// --- Revisions ---

export type ApiRevision = {
    id: number;
    action: string;
    model_type: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    created_at: string;
    user: {
        id: number;
        name: string;
    } | null;
};

// --- Sidebar Tree ---

export type ApiSidebarCategoryNode = {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    children: Omit<ApiSidebarCategoryNode, 'children'>[];
};

export type ApiSidebarTree = {
    entity_types: (ApiMetaEntityType & { entities_count: number })[];
    timelines: Array<{
        id: number;
        name: string;
        slug: string;
        entities_count: number;
    }>;
    categories: ApiSidebarCategoryNode[];
    media_sources: Array<{
        id: number;
        name: string;
        slug: string;
        media_type: string;
        entities_count: number;
    }>;
    maps: Array<{
        id: number;
        name: string;
        slug: string;
        entity_id: number;
        entity_name: string;
        entity_slug: string;
    }>;
    total_entities: number;
};

// --- RBAC ---

export type ApiPermission = {
    id: number;
    name: string;
    slug: string;
    group: string | null;
    description: string | null;
} & Timestamps;

export type ApiRole = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_super_admin: boolean;
    permissions: ApiPermission[];
} & Timestamps;

export type ApiAdminUser = {
    id: number;
    name: string;
    email: string;
    agent_codename: string | null;
    clearance_level: string | null;
    department: string | null;
    created_at: string;
    updated_at: string;
    roles: ApiRole[];
};

// --- Advanced Search ---

export type ApiAdvancedSearchExcerpt = {
    source: 'name' | 'alias' | 'description' | 'content' | 'section' | 'quote' | 'relation' | 'death_record' | 'infection_record' | 'mutation_record' | 'consciousness_record' | 'affiliation' | 'timeline_event' | 'cross_reference' | 'power_profile';
    text: string;
    relevance: string;
};

export type ApiAdvancedSearchSubjectProfile = {
    rank: number;
    name: string;
    type: string;
    status: string;
    score: number;
    description: string | null;
    key_evidence: { source: string; text: string }[];
};

export type ApiAdvancedSearchConnection = {
    from: string;
    type: string;
    to: string;
    description: string | null;
    context: string | null;
};

export type ApiAdvancedSearchRecord = {
    type: string;
    entity: string;
    summary: string;
};

export type ApiAdvancedSearchBriefing = {
    classification: string;
    header: string;
    narrative: string;
    subject_profiles: ApiAdvancedSearchSubjectProfile[];
    key_connections: ApiAdvancedSearchConnection[];
    key_records: ApiAdvancedSearchRecord[];
    query_metrics: {
        total_matches: number;
        top_score: number;
        signals_searched: number;
        keywords_detected: number;
        action_context: boolean;
        intent: string | null;
    };
};

export type ApiAdvancedSearchResult = {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    is_featured: boolean;
    score: number;
    entity_type: {
        id: number;
        name: string;
        slug: string;
        icon: string | null;
        color: string | null;
    } | null;
    entity_status: {
        id: number;
        name: string;
        slug: string;
        color: string | null;
    } | null;
    images: ApiImage[];
    aliases: string[];
    excerpts: ApiAdvancedSearchExcerpt[];
};

export type ApiAdvancedSearchConnectionNode = {
    id: number;
    name: string;
    slug: string;
    entity_type: {
        slug: string | null;
        color: string | null;
        icon: string | null;
        name: string | null;
    } | null;
    profile_image_url: string | null;
    is_primary: boolean;
};

export type ApiAdvancedSearchConnectionEdge = {
    id: number;
    from: number;
    to: number;
    label: string;
    inverse_label: string | null;
    status: string | null;
    description: string | null;
};

export type ApiAdvancedSearchResponse = {
    query: {
        raw: string;
        keywords: string[];
        intent: string | null;
        actions: string[];
        has_action_context: boolean;
    };
    briefing: ApiAdvancedSearchBriefing;
    results: ApiAdvancedSearchResult[];
    connections: {
        nodes: ApiAdvancedSearchConnectionNode[];
        edges: ApiAdvancedSearchConnectionEdge[];
    };
    total: number;
};

// --- Entity Maps ---

export type ApiEntityMap = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    is_featured: boolean;
    sort_order: number;
    floors?: ApiEntityMapFloor[];
    floors_count?: number;
} & Timestamps;

export type ApiEntityMapFloor = {
    id: number;
    entity_id: number;
    name: string;
    slug: string;
    floor_number: number;
    image_width: number | null;
    image_height: number | null;
    sort_order: number;
    images?: ApiImage[];
    markers?: ApiEntityMapMarker[];
    regions?: ApiEntityMapRegion[];
} & Timestamps;

export type ApiEntityMapMarker = {
    id: number;
    entity_map_floor_id: number;
    entity_id: number | null;
    entity?: ApiEntitySummary;
    name: string;
    description: string | null;
    x_percent: number;
    y_percent: number;
    marker_type: 'poi' | 'item' | 'character' | 'event' | 'entrance' | 'exit' | 'save-point' | 'boss' | 'note' | 'threat' | 'objective' | 'secret' | 'safe-room' | 'custom';
    icon: string | null;
    color: string | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
} & Timestamps;

export type ApiEntityMapRegion = {
    id: number;
    entity_map_floor_id: number;
    entity_id: number | null;
    entity?: ApiEntitySummary;
    name: string;
    description: string | null;
    boundary_points: { x: number; y: number }[];
    region_type: 'room' | 'zone' | 'corridor' | 'outdoor' | 'restricted' | 'safe' | 'boss-arena' | 'containment' | 'lab' | 'storage' | 'utility' | 'exterior' | 'safe-room' | 'custom';
    color: string | null;
    fill_opacity: number;
    metadata: Record<string, unknown> | null;
    sort_order: number;
} & Timestamps;
