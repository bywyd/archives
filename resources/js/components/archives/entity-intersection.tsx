import {
    AlertCircle,
    ChevronDown,
    GitMerge,
    Link2,
    Loader2,
    Search,
    Tag,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiEntity,
    ApiEntityAffiliationHistory,
    ApiEntityInfectionRecord,
    ApiEntityPowerProfile,
    ApiEntityRelation,
    ApiEntitySummary,
    ApiMediaSourcePivot,
    ApiTimelinePivot,
} from '@/types/api';

type Props = {
    universeId: number;
    sourceEntitySlug: string;
};

type SharedRelation = {
    entityId: number;
    summary: ApiEntitySummary;
};

type DirectLink = {
    relation: ApiEntityRelation;
    direction: 'outgoing' | 'incoming';
};

type Intersection = {
    directLinks: DirectLink[];
    sharedConnections: SharedRelation[];
    sharedTags: { id: number; name: string; color: string | null }[];
    sharedCategories: { id: number; name: string }[];
    sharedTimelines: ApiTimelinePivot[];
    sharedMediaSources: ApiMediaSourcePivot[];
    sharedAffiliations: { record: ApiEntityAffiliationHistory; org: ApiEntitySummary }[];
    sharedPathogens: { record: ApiEntityInfectionRecord; pathogen: ApiEntitySummary }[];
    sharedPowerSources: { record: ApiEntityPowerProfile; source: ApiEntitySummary }[];
};


function computeIntersection(source: ApiEntity, target: ApiEntity): Intersection {
    // Direct links — relations between source and target
    const directLinks: DirectLink[] = [
        ...source.outgoing_relations
            .filter((r) => r.to_entity_id === target.id)
            .map((r) => ({ relation: r, direction: 'outgoing' as const })),
        ...source.incoming_relations
            .filter((r) => r.from_entity_id === target.id)
            .map((r) => ({ relation: r, direction: 'incoming' as const })),
    ];

    // Shared mutual connections — entity IDs that appear in BOTH relation sets
    const sourceRelatedIds = new Map<number, ApiEntitySummary>();
    for (const r of source.outgoing_relations) {
        if (r.to_entity_id !== target.id)
            sourceRelatedIds.set(r.to_entity_id, r.to_entity);
    }
    for (const r of source.incoming_relations) {
        if (r.from_entity_id !== target.id)
            sourceRelatedIds.set(r.from_entity_id, r.from_entity);
    }

    const targetRelatedIds = new Set<number>();
    const targetRelatedMap = new Map<number, ApiEntitySummary>();
    for (const r of target.outgoing_relations) {
        if (r.to_entity_id !== source.id) {
            targetRelatedIds.add(r.to_entity_id);
            targetRelatedMap.set(r.to_entity_id, r.to_entity);
        }
    }
    for (const r of target.incoming_relations) {
        if (r.from_entity_id !== source.id) {
            targetRelatedIds.add(r.from_entity_id);
            targetRelatedMap.set(r.from_entity_id, r.from_entity);
        }
    }

    const sharedConnections: SharedRelation[] = [];
    for (const [id, summary] of sourceRelatedIds) {
        if (targetRelatedIds.has(id)) {
            sharedConnections.push({ entityId: id, summary });
        }
    }

    // Shared tags
    const targetTagIds = new Set(target.tags?.map((t) => t.id) ?? []);
    const sharedTags = (source.tags ?? [])
        .filter((t) => targetTagIds.has(t.id))
        .map((t) => ({ id: t.id, name: t.name, color: t.color ?? null }));

    // Shared categories
    const targetCategoryIds = new Set(target.categories?.map((c) => c.id) ?? []);
    const sharedCategories = (source.categories ?? [])
        .filter((c) => targetCategoryIds.has(c.id))
        .map((c) => ({ id: c.id, name: c.name }));

    // Shared timelines
    const targetTimelineIds = new Set(target.timelines?.map((t) => t.id) ?? []);
    const sharedTimelines = (source.timelines ?? []).filter((t) => targetTimelineIds.has(t.id));

    // Shared media sources
    const targetMediaIds = new Set(target.media_sources?.map((m) => m.id) ?? []);
    const sharedMediaSources = (source.media_sources ?? []).filter((m) => targetMediaIds.has(m.id));

    // Shared affiliated organizations (by organization_entity_id)
    const targetAffOrgIds = new Map<number, ApiEntityAffiliationHistory>();
    for (const a of target.affiliation_history ?? []) {
        if (a.organization_entity_id != null)
            targetAffOrgIds.set(a.organization_entity_id, a);
    }
    const sharedAffiliations: { record: ApiEntityAffiliationHistory; org: ApiEntitySummary }[] = [];
    for (const a of source.affiliation_history ?? []) {
        if (a.organization_entity_id != null && targetAffOrgIds.has(a.organization_entity_id) && a.organization) {
            sharedAffiliations.push({ record: a, org: a.organization });
        }
    }

    // Shared pathogens (infection records with same pathogen_entity_id)
    const targetPathogenIds = new Set(
        (target.infection_records ?? [])
            .map((r) => r.pathogen_entity_id)
            .filter((id): id is number => id != null),
    );
    const sharedPathogens: { record: ApiEntityInfectionRecord; pathogen: ApiEntitySummary }[] = [];
    for (const r of source.infection_records ?? []) {
        if (r.pathogen_entity_id != null && targetPathogenIds.has(r.pathogen_entity_id) && r.pathogen) {
            sharedPathogens.push({ record: r, pathogen: r.pathogen });
        }
    }

    // Shared power sources (power_profiles with same source_entity_id)
    const targetSourceIds = new Set(
        (target.power_profiles ?? [])
            .map((p) => p.source_entity_id)
            .filter((id): id is number => id != null),
    );
    const sharedPowerSources: { record: ApiEntityPowerProfile; source: ApiEntitySummary }[] = [];
    for (const p of source.power_profiles ?? []) {
        if (p.source_entity_id != null && targetSourceIds.has(p.source_entity_id) && p.source_entity) {
            sharedPowerSources.push({ record: p, source: p.source_entity });
        }
    }

    return {
        directLinks,
        sharedConnections,
        sharedTags,
        sharedCategories,
        sharedTimelines,
        sharedMediaSources,
        sharedAffiliations,
        sharedPathogens,
        sharedPowerSources,
    };
}

function totalCount(ix: Intersection): number {
    return (
        ix.directLinks.length +
        ix.sharedConnections.length +
        ix.sharedTags.length +
        ix.sharedCategories.length +
        ix.sharedTimelines.length +
        ix.sharedMediaSources.length +
        ix.sharedAffiliations.length +
        ix.sharedPathogens.length +
        ix.sharedPowerSources.length
    );
}

function EntityChip({
    entity,
    onClick,
}: {
    entity: ApiEntitySummary;
    onClick?: () => void;
}) {
    const profileImage = entity.images?.find((img) => img.type === 'profile');
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex min-w-0 items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1 text-left transition-colors',
                onClick && 'cursor-pointer hover:border-[var(--arc-accent)]/50 hover:bg-[var(--arc-surface-hover)]',
                !onClick && 'cursor-default',
            )}
        >
            <div className="size-5 shrink-0 overflow-hidden rounded bg-[var(--arc-surface-alt)]">
                {profileImage ? (
                    <img src={profileImage.thumbnail_url ?? profileImage.url} alt="" className="size-full object-cover" />
                ) : (
                    <TypeIcon entityType={entity.entity_type} size="sm" />
                )}
            </div>
            <span className="min-w-0 truncate text-[11px] text-[var(--arc-text)]">{entity.name}</span>
            {entity.entity_status && <StatusBadge status={entity.entity_status} size="xs" />}
        </button>
    );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="mb-2 flex items-center gap-2 border-b border-[var(--arc-border)] pb-1.5">
            <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">{label}</span>
            <span className="arc-mono rounded bg-[var(--arc-accent)]/10 px-1 text-[9px] font-bold text-[var(--arc-accent)]">
                {count}
            </span>
        </div>
    );
}

function EntitySearchBox({
    universeId,
    excludeId,
    onSelect,
}: {
    universeId: number;
    excludeId: number | null;
    onSelect: (entity: ApiEntitySummary) => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ApiEntitySummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (query.trim().length < 1) {
            setResults([]);
            setOpen(false);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.universeSearch(universeId, query.trim());
                const filtered = (res.data ?? []).filter(
                    (e: ApiEntitySummary) => excludeId == null || e.id !== excludeId,
                );
                setResults(filtered);
                setOpen(filtered.length > 0);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, universeId, excludeId]);

    const handleSelect = (entity: ApiEntitySummary) => {
        setQuery('');
        setResults([]);
        setOpen(false);
        onSelect(entity);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-bg)] px-2 py-1.5 focus-within:border-[var(--arc-accent)]/60">
                {searching ? (
                    <Loader2 className="size-3 shrink-0 animate-spin text-[var(--arc-accent)]" />
                ) : (
                    <Search className="size-3 shrink-0 text-[var(--arc-text-muted)]" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for an entity..."
                    className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--arc-text)] placeholder:text-[var(--arc-text-muted)] focus:outline-none"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
                        className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                    >
                        <X className="size-3" />
                    </button>
                )}
            </div>
            {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] shadow-lg">
                    {results.map((entity) => {
                        const img = entity.images?.find((i) => i.type === 'profile');
                        return (
                            <button
                                key={entity.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[var(--arc-surface-hover)]"
                                onClick={() => handleSelect(entity)}
                            >
                                <div className="size-5 shrink-0 overflow-hidden rounded bg-[var(--arc-surface-alt)]">
                                    {img ? (
                                        <img src={img.thumbnail_url ?? img.url} alt="" className="size-full object-cover" />
                                    ) : (
                                        <TypeIcon entityType={entity.entity_type} size="sm" />
                                    )}
                                </div>
                                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--arc-text)]">{entity.name}</span>
                                {entity.entity_type && (
                                    <span className="arc-mono shrink-0 text-[9px] text-[var(--arc-text-muted)]">
                                        {entity.entity_type.name}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function EntityIntersection({ universeId, sourceEntitySlug }: Props) {
    const { openWindow } = useWindowStore();

    const [source, setSource] = useState<ApiEntity | null>(null);
    const [sourceLoading, setSourceLoading] = useState(true);
    const [sourceError, setSourceError] = useState<string | null>(null);

    const [target, setTarget] = useState<ApiEntity | null>(null);
    const [targetSummary, setTargetSummary] = useState<ApiEntitySummary | null>(null);
    const [targetLoading, setTargetLoading] = useState(false);
    const [targetError, setTargetError] = useState<string | null>(null);

    const [intersection, setIntersection] = useState<Intersection | null>(null);

    // Load source entity
    useEffect(() => {
        let cancelled = false;
        setSourceLoading(true);
        setSourceError(null);
        api.fetchEntity(universeId, sourceEntitySlug)
            .then((res) => { if (!cancelled) setSource(res.data); })
            .catch((err) => { if (!cancelled) setSourceError(err.message ?? 'Failed to load entity'); })
            .finally(() => { if (!cancelled) setSourceLoading(false); });
        return () => { cancelled = true; };
    }, [universeId, sourceEntitySlug]);

    // Load target and compute when summary is chosen
    const handleTargetSelect = useCallback(
        async (summary: ApiEntitySummary) => {
            setTargetSummary(summary);
            setTarget(null);
            setIntersection(null);
            setTargetLoading(true);
            setTargetError(null);
            try {
                const res = await api.fetchEntity(universeId, summary.slug);
                setTarget(res.data);
            } catch (err: unknown) {
                setTargetError((err as Error).message ?? 'Failed to load entity');
            } finally {
                setTargetLoading(false);
            }
        },
        [universeId],
    );

    // Recompute intersection whenever both entities are loaded
    useEffect(() => {
        if (source && target) {
            setIntersection(computeIntersection(source, target));
        } else {
            setIntersection(null);
        }
    }, [source, target]);

    const clearTarget = () => {
        setTargetSummary(null);
        setTarget(null);
        setIntersection(null);
        setTargetError(null);
    };

    const openDossier = (slug: string) =>
        openWindow({
            type: 'entity-dossier',
            title: slug.toUpperCase(),
            icon: 'DOS',
            props: { key: `dossier-${universeId}-${slug}`, universeId, entitySlug: slug },
        });

    if (sourceLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--arc-bg)]">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-[9px] tracking-[0.3em] text-[var(--arc-accent)]">LOADING SUBJECT</span>
            </div>
        );
    }

    if (sourceError || !source) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-6 text-[var(--arc-danger)]" />
                <p className="text-xs text-[var(--arc-danger)]">{sourceError ?? 'Entity not found'}</p>
            </div>
        );
    }

    const sourceProfileImage = source.images?.find((img) => img.type === 'profile');
    const targetProfileImage = targetSummary?.images?.find((img) => img.type === 'profile');
    const hasIntersection = intersection && totalCount(intersection) > 0;

    return (
        <div className="flex h-full flex-col bg-[var(--arc-bg)]">
            {/* Header */}
            <div className="shrink-0 border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded bg-[var(--arc-accent)]/10">
                        <GitMerge className="size-3 text-[var(--arc-accent)]" />
                    </div>
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        INTERSECTION ANALYSIS
                    </span>
                    {intersection && (
                        <span className="arc-mono ml-auto rounded bg-[var(--arc-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--arc-accent)]">
                            {totalCount(intersection)} COMMON
                        </span>
                    )}
                </div>
            </div>

            {/* Entity selector row */}
            <div className="shrink-0 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-3">
                <div className="flex items-center gap-2">
                    {/* Source entity pill (fixed) */}
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded border border-[var(--arc-border-strong)] bg-[var(--arc-surface)] px-2 py-1.5">
                        <div className="size-6 shrink-0 overflow-hidden rounded bg-[var(--arc-surface-alt)]">
                            {sourceProfileImage ? (
                                <img src={sourceProfileImage.thumbnail_url ?? sourceProfileImage.url} alt="" className="size-full object-cover" />
                            ) : (
                                <TypeIcon entityType={source.entity_type} size="sm" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-[var(--arc-text)]">{source.name}</p>
                            {source.entity_type && (
                                <p className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{source.entity_type.name}</p>
                            )}
                        </div>
                        <div className="arc-mono shrink-0 rounded border border-[var(--arc-accent)]/30 px-1 text-[8px] text-[var(--arc-accent)]">
                            SOURCE
                        </div>
                    </div>

                    {/* Merge icon */}
                    <GitMerge className="size-4 shrink-0 text-[var(--arc-text-muted)]" />

                    {/* Target entity — search or selected pill */}
                    <div className="min-w-0 flex-1">
                        {targetSummary ? (
                            <div className="flex items-center gap-1.5 rounded border border-[var(--arc-border-strong)] bg-[var(--arc-surface)] px-2 py-1.5">
                                <div className="size-6 shrink-0 overflow-hidden rounded bg-[var(--arc-surface-alt)]">
                                    {targetProfileImage ? (
                                        <img src={targetProfileImage.thumbnail_url ?? targetProfileImage.url} alt="" className="size-full object-cover" />
                                    ) : (
                                        <TypeIcon entityType={targetSummary.entity_type} size="sm" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-semibold text-[var(--arc-text)]">{targetSummary.name}</p>
                                    {targetSummary.entity_type && (
                                        <p className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{targetSummary.entity_type.name}</p>
                                    )}
                                </div>
                                {targetLoading && <Loader2 className="size-3 shrink-0 animate-spin text-[var(--arc-accent)]" />}
                                <div className="arc-mono shrink-0 rounded border border-[var(--arc-warning)]/30 px-1 text-[8px] text-[var(--arc-warning)]">
                                    TARGET
                                </div>
                                <button
                                    type="button"
                                    onClick={clearTarget}
                                    className="shrink-0 text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                                    title="Clear target"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ) : (
                            <EntitySearchBox
                                universeId={universeId}
                                excludeId={source.id}
                                onSelect={handleTargetSelect}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* No target yet */}
                {!targetSummary && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="rounded-full border border-[var(--arc-border)] bg-[var(--arc-surface)] p-4">
                            <Search className="size-6 text-[var(--arc-text-muted)]" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[var(--arc-text)]">Search for an entity above</p>
                            <p className="mt-1 text-xs text-[var(--arc-text-muted)]">
                                Select a second entity to find everything it shares in common with{' '}
                                <span className="font-medium text-[var(--arc-text)]">{source.name}</span>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Target selected, loading */}
                {targetSummary && targetLoading && (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                        <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[9px] tracking-[0.3em] text-[var(--arc-accent)]">COMPUTING INTERSECTION</span>
                    </div>
                )}

                {/* Target error */}
                {targetError && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                        <AlertCircle className="size-5 text-[var(--arc-danger)]" />
                        <p className="text-xs text-[var(--arc-danger)]">{targetError}</p>
                    </div>
                )}

                {/* Intersection results */}
                {intersection && !targetLoading && (
                    <div className="arc-animate-slide-up space-y-4 p-4">
                        {/* Direct link */}
                        {intersection.directLinks.length > 0 && (
                            <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <Link2 className="size-3 text-[var(--arc-accent)]" />
                                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                                        DIRECT LINK
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {intersection.directLinks.map(({ relation, direction }) => {
                                        const label =
                                            direction === 'outgoing'
                                                ? relation.relation_type?.name
                                                : (relation.relation_type?.inverse_name ?? relation.relation_type?.name);
                                        return (
                                            <div key={relation.id} className="flex items-center gap-2 text-xs text-[var(--arc-text)]">
                                                <span className="font-semibold text-[var(--arc-text)]">{source.name}</span>
                                                <span className="arc-mono rounded bg-[var(--arc-surface)] px-1.5 py-0.5 text-[9px] text-[var(--arc-accent)]">
                                                    {label ?? (direction === 'outgoing' ? '→' : '←')}
                                                </span>
                                                <span className="font-semibold text-[var(--arc-text)]">{target?.name}</span>
                                                {relation.status && (
                                                    <span
                                                        className="arc-mono ml-auto text-[9px]"
                                                        style={{
                                                            color:
                                                                relation.status === 'active'
                                                                    ? 'var(--arc-success)'
                                                                    : relation.status === 'former'
                                                                      ? 'var(--arc-text-muted)'
                                                                      : 'var(--arc-warning)',
                                                        }}
                                                    >
                                                        {relation.status.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* No common ground */}
                        {!hasIntersection && (
                            <div className="flex flex-col items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] py-10 text-center">
                                <GitMerge className="size-7 text-[var(--arc-text-muted)]" />
                                <div>
                                    <p className="text-sm font-medium text-[var(--arc-text)]">No common ground found</p>
                                    <p className="mt-1 text-xs text-[var(--arc-text-muted)]">
                                        {source.name} and {target?.name} share no detected connections, tags, affiliations, or records.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Shared mutual connections */}
                        {intersection.sharedConnections.length > 0 && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader label="SHARED CONNECTIONS" count={intersection.sharedConnections.length} />
                                <div className="flex flex-wrap gap-1.5">
                                    {intersection.sharedConnections.map(({ entityId, summary }) => (
                                        <EntityChip
                                            key={entityId}
                                            entity={summary}
                                            onClick={() => openDossier(summary.slug)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tags & Categories */}
                        {(intersection.sharedTags.length > 0 || intersection.sharedCategories.length > 0) && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader
                                    label="TAGS & CATEGORIES"
                                    count={intersection.sharedTags.length + intersection.sharedCategories.length}
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    {intersection.sharedTags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                            style={{
                                                color: tag.color ?? 'var(--arc-text-muted)',
                                                backgroundColor: `${tag.color ?? '#6B7280'}18`,
                                                border: `1px solid ${tag.color ?? '#6B7280'}40`,
                                            }}
                                        >
                                            <Tag className="size-2.5" />
                                            {tag.name}
                                        </span>
                                    ))}
                                    {intersection.sharedCategories.map((cat) => (
                                        <span
                                            key={cat.id}
                                            className="rounded-full border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-2 py-0.5 text-[10px] text-[var(--arc-text-muted)]"
                                        >
                                            {cat.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timelines & Media */}
                        {(intersection.sharedTimelines.length > 0 || intersection.sharedMediaSources.length > 0) && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader
                                    label="TIMELINES & MEDIA"
                                    count={intersection.sharedTimelines.length + intersection.sharedMediaSources.length}
                                />
                                <div className="space-y-1">
                                    {intersection.sharedTimelines.map((tl) => (
                                        <div key={tl.id} className="flex items-center gap-2 text-xs">
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">TIMELINE</span>
                                            <span className="text-[var(--arc-text)]">{tl.name}</span>
                                        </div>
                                    ))}
                                    {intersection.sharedMediaSources.map((ms) => (
                                        <div key={ms.id} className="flex items-center gap-2 text-xs">
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">MEDIA</span>
                                            <span className="text-[var(--arc-text)]">{ms.name}</span>
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{ms.media_type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shared affiliations */}
                        {intersection.sharedAffiliations.length > 0 && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader label="SHARED AFFILIATIONS" count={intersection.sharedAffiliations.length} />
                                <div className="flex flex-wrap gap-1.5">
                                    {intersection.sharedAffiliations.map(({ record, org }) => (
                                        <EntityChip
                                            key={record.id}
                                            entity={org}
                                            onClick={() => openDossier(org.slug)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shared pathogens */}
                        {intersection.sharedPathogens.length > 0 && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader label="SHARED PATHOGENS" count={intersection.sharedPathogens.length} />
                                <div className="flex flex-wrap gap-1.5">
                                    {intersection.sharedPathogens.map(({ record, pathogen }) => (
                                        <EntityChip
                                            key={record.id}
                                            entity={pathogen}
                                            onClick={() => openDossier(pathogen.slug)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shared power sources */}
                        {intersection.sharedPowerSources.length > 0 && (
                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <SectionHeader label="SHARED POWER SOURCES" count={intersection.sharedPowerSources.length} />
                                <div className="flex flex-wrap gap-1.5">
                                    {intersection.sharedPowerSources.map(({ record, source: src }) => (
                                        <EntityChip
                                            key={record.id}
                                            entity={src}
                                            onClick={() => openDossier(src.slug)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
