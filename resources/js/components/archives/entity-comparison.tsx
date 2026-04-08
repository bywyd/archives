import {
    Activity,
    AlertCircle,
    ChevronDown,
    GitCompare,
    Loader2,
    Lock,
    Plus,
    Scale,
    Search,
    Shield,
    Star,
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
import type { ApiEntity, ApiEntitySummary } from '@/types/api';

// Colour helpers

const POWER_BAR_COLOR = (lvl: number) =>
    lvl >= 8 ? 'var(--arc-danger)' : lvl >= 5 ? 'var(--arc-warning)' : 'var(--arc-success)';

const POWER_STATUS_COLOR: Record<string, string> = {
    active: 'var(--arc-success)',
    lost: 'var(--arc-text-muted)',
    dormant: 'var(--arc-warning)',
    evolving: '#a78bfa',
    artificial: '#60a5fa',
    temporary: '#fb923c',
};

const INFECTION_STATUS_COLOR: Record<string, string> = {
    active: 'var(--arc-danger)',
    cured: 'var(--arc-success)',
    dormant: 'var(--arc-warning)',
    fatal: 'var(--arc-danger)',
    mutated: '#a78bfa',
    partial: '#fb923c',
    unknown: 'var(--arc-text-muted)',
};

const AFFILIATION_STATUS_COLOR: Record<string, string> = {
    active: 'var(--arc-success)',
    former: 'var(--arc-text-muted)',
    defected: 'var(--arc-danger)',
    expelled: 'var(--arc-danger)',
    deceased: 'var(--arc-text-muted)',
    undercover: 'var(--arc-warning)',
    honorary: '#60a5fa',
};

const CONSCIOUSNESS_STATUS_COLOR: Record<string, string> = {
    active: 'var(--arc-success)',
    transferred: '#60a5fa',
    dormant: 'var(--arc-warning)',
    fragmented: 'var(--arc-warning)',
    merged: '#a78bfa',
    destroyed: 'var(--arc-danger)',
    digital: '#22d3ee',
    shared: '#a78bfa',
};

// Section group definitions

type SectionGroupId = 'identity' | 'content' | 'network' | 'records';

const SECTION_GROUPS: { id: SectionGroupId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'identity', label: 'IDENTITY', Icon: Shield },
    { id: 'content', label: 'CONTENT',  Icon: Zap },
    { id: 'network', label: 'NETWORK',  Icon: Users },
    { id: 'records', label: 'RECORDS',  Icon: Activity },
];

// Types

type Props = {
    universeId: number;
    initialEntitySlugs?: string[];
};

type CompareSlot = {
    id: string;
    entity: ApiEntity | null;
    loading: boolean;
    error: string | null;
};

// Main component

export function EntityComparison({ universeId, initialEntitySlugs = [] }: Props) {
    const initialSlugsRef = useRef(initialEntitySlugs);

    const [slots, setSlots] = useState<CompareSlot[]>(() =>
        initialSlugsRef.current.length > 0
            ? initialSlugsRef.current.map((_, i) => ({
                  id: `slot-${i}`,
                  entity: null,
                  loading: true,
                  error: null,
              }))
            : [
                  { id: 'slot-0', entity: null, loading: false, error: null },
                  { id: 'slot-1', entity: null, loading: false, error: null },
              ],
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ApiEntitySummary[] | any>([]);
    const [searching, setSearching] = useState(false);
    const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<SectionGroupId>>(new Set());
    const [highlightDiff, setHighlightDiff] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const { openWindow } = useWindowStore();

    // Load initial entities — runs once on mount using the captured ref
    useEffect(() => {
        if (initialSlugsRef.current.length === 0) return;
        initialSlugsRef.current.forEach((slug, idx) => {
            api.fetchEntity(universeId, slug)
                .then((res) =>
                    setSlots((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, entity: res.data, loading: false } : s)),
                    ),
                )
                .catch((err) =>
                    setSlots((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, error: err.message, loading: false } : s)),
                    ),
                );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [universeId]);

    // Click-outside closes search dropdown
    useEffect(() => {
        if (!activeSlotId) return;
        const handler = (e: MouseEvent) => {
            if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
                setActiveSlotId(null);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activeSlotId]);

    // Debounced entity search
    useEffect(() => {
        if (!searchQuery.trim() || !activeSlotId) {
            setSearchResults([]);
            return;
        }
        const timeout = setTimeout(() => {
            setSearching(true);
            api.globalSearch(searchQuery)
                .then((res) => setSearchResults(res.data.slice(0, 10)))
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(timeout);
    }, [universeId, searchQuery, activeSlotId]);

    const loadEntityIntoSlot = useCallback(
        (slotId: string, entitySlug: string) => {
            setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, loading: true, error: null } : s)));
            setActiveSlotId(null);
            setSearchQuery('');
            setSearchResults([]);
            api.fetchEntity(universeId, entitySlug)
                .then((res) =>
                    setSlots((prev) =>
                        prev.map((s) => (s.id === slotId ? { ...s, entity: res.data, loading: false } : s)),
                    ),
                )
                .catch((err) =>
                    setSlots((prev) =>
                        prev.map((s) => (s.id === slotId ? { ...s, error: err.message, loading: false } : s)),
                    ),
                );
        },
        [universeId],
    );

    const addSlot = () =>
        setSlots((prev) => [...prev, { id: `slot-${Date.now()}`, entity: null, loading: false, error: null }]);
    const removeSlot = (slotId: string) => setSlots((prev) => prev.filter((s) => s.id !== slotId));
    const clearSlot = (slotId: string) =>
        setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, entity: null, error: null } : s)));
    const toggleSection = (id: SectionGroupId) =>
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const entitiesWithData = slots.filter((s) => s.entity !== null);

    // Diff keys — one normalized string per row per slot
    const diffKeys = {
        status:        slots.map((s) => s.entity?.entity_status?.slug ?? ''),
        type:          slots.map((s) => s.entity?.entity_type?.slug ?? ''),
        aliases:       slots.map((s) => String(s.entity?.aliases?.length ?? 0)),
        tags:          slots.map((s) => (s.entity?.tags ?? []).map((t) => t.id).sort().join(',')),
        categories:    slots.map((s) => (s.entity?.categories ?? []).map((c) => c.id).sort().join(',')),
        sections:      slots.map((s) => String(s.entity?.sections?.length ?? 0)),
        attributes:    slots.map((s) => String(s.entity?.attributes?.length ?? 0)),
        affiliations:  slots.map((s) =>
            (s.entity?.affiliation_history ?? [])
                .filter((a) => a.status === 'active')
                .map((a) => a.organization_name ?? a.organization?.name ?? '')
                .join(','),
        ),
        relations:     slots.map((s) =>
            String((s.entity?.outgoing_relations?.length ?? 0) + (s.entity?.incoming_relations?.length ?? 0)),
        ),
        timelines:     slots.map((s) => String(s.entity?.timelines?.length ?? 0)),
        mediaSources:  slots.map((s) => String(s.entity?.media_sources?.length ?? 0)),
        powers:        slots.map((s) => String(s.entity?.power_profiles?.length ?? 0)),
        infections:    slots.map((s) =>
            (s.entity?.infection_records ?? []).map((r) => r.status).sort().join(','),
        ),
        mutations:     slots.map((s) => String(s.entity?.mutation_stages?.length ?? 0)),
        deaths:        slots.map((s) => String(s.entity?.death_records?.length ?? 0)),
        consciousness: slots.map((s) => s.entity?.consciousness_records?.[0]?.status ?? ''),
        quotes:        slots.map((s) => String(s.entity?.quotes?.length ?? 0)),
    };

    // Returns true when highlightDiff is on AND the loaded slots don't all agree
    const isDiff = (keys: string[]) => {
        if (!highlightDiff) return false;
        const loaded = slots.map((s, i) => (s.entity ? keys[i] : null)).filter((k) => k !== null);
        return loaded.length > 1 && new Set(loaded).size > 1;
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Scale className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        ENTITY COMPARISON
                    </span>
                    {entitiesWithData.length > 0 && (
                        <span className="arc-mono rounded border border-[var(--arc-border)] px-1.5 py-0.5 text-[9px] text-[var(--arc-text-muted)]">
                            {entitiesWithData.length} / {slots.length} LOADED
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setHighlightDiff((p) => !p)}
                        title="Highlight differences"
                        className={cn(
                            'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] transition-all',
                            highlightDiff
                                ? 'border-[var(--arc-warning)]/50 bg-[var(--arc-warning)]/10 text-[var(--arc-warning)]'
                                : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-warning)]/30 hover:text-[var(--arc-warning)]',
                        )}
                    >
                        <GitCompare className="size-3" />
                        Diff
                    </button>
                    <button
                        onClick={addSlot}
                        disabled={slots.length >= 5}
                        className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] px-2 py-1 text-[10px] text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:text-[var(--arc-accent)] disabled:opacity-40"
                    >
                        <Plus className="size-3" />
                        Add Subject
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
                <div
                    ref={gridRef}
                    className="grid min-w-max"
                    style={{ gridTemplateColumns: `192px repeat(${slots.length}, minmax(240px, 1fr))` }}
                >
                    {/* Sticky subject selector row */}
                    <div className="sticky top-0 z-10 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                        <span className="arc-mono text-[9px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                            SUBJECTS
                        </span>
                    </div>

                    {slots.map((slot) => (
                        <div
                            key={slot.id}
                            className="sticky top-0 z-10 border-b-2 border-l border-[var(--arc-border)] border-b-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] p-3"
                            style={
                                slot.entity?.entity_type?.color
                                    ? { borderTopColor: slot.entity.entity_type.color, borderTopWidth: 2 }
                                    : undefined
                            }
                        >
                            {slot.loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                                </div>
                            ) : slot.error ? (
                                <div className="flex items-center gap-2 text-[var(--arc-danger)]">
                                    <AlertCircle className="size-4" />
                                    <span className="text-xs">{slot.error}</span>
                                </div>
                            ) : slot.entity ? (
                                <SlotHeader
                                    entity={slot.entity}
                                    onClear={() => clearSlot(slot.id)}
                                    onOpenDossier={() =>
                                        openWindow({
                                            type: 'entity-dossier',
                                            title: `${slot.entity!.name} — DOSSIER`,
                                            icon: slot.entity!.entity_type?.icon ?? 'EN',
                                            props: {
                                                key: `entity-${universeId}-${slot.entity!.slug}`,
                                                universeId,
                                                entitySlug: slot.entity!.slug,
                                            },
                                        })
                                    }
                                />
                            ) : (
                                <SlotSearch
                                    isActive={activeSlotId === slot.id}
                                    canRemove={slots.length > 2}
                                    searchQuery={searchQuery}
                                    searchResults={searchResults}
                                    searching={searching}
                                    onToggle={() => {
                                        if (activeSlotId !== slot.id) setSearchQuery('');
                                        setActiveSlotId(activeSlotId === slot.id ? null : slot.id);
                                    }}
                                    onQueryChange={setSearchQuery}
                                    onSelect={(slug) => loadEntityIntoSlot(slot.id, slug)}
                                    onRemove={() => removeSlot(slot.id)}
                                />
                            )}
                        </div>
                    ))}

                    {/* Data rows */}
                    {entitiesWithData.length > 0 && (
                        <>
                            {/* IDENTITY */}
                            <SectionGroup
                                id="identity"
                                collapsed={collapsedSections.has('identity')}
                                colCount={slots.length}
                                onToggle={() => toggleSection('identity')}
                            />
                            {!collapsedSections.has('identity') && (
                                <>
                                    <CompareRow label="STATUS" diff={isDiff(diffKeys.status)} rowIndex={0}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.status) && !!slot.entity}>
                                                {slot.entity?.entity_status ? (
                                                    <StatusBadge status={slot.entity.entity_status} size="md" />
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="TYPE" diff={isDiff(diffKeys.type)} rowIndex={1}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.type) && !!slot.entity}>
                                                {slot.entity?.entity_type ? (
                                                    <div className="flex items-center gap-2">
                                                        <TypeIcon entityType={slot.entity.entity_type} size="sm" />
                                                        <span className="text-xs text-[var(--arc-text)]">
                                                            {slot.entity.entity_type.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="DESCRIPTION" rowIndex={2}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id}>
                                                {slot.entity?.short_description ? (
                                                    <p className="line-clamp-3 text-xs leading-relaxed text-[var(--arc-text-muted)]">
                                                        {slot.entity.short_description}
                                                    </p>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="ALIASES" diff={isDiff(diffKeys.aliases)} rowIndex={3}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.aliases) && !!slot.entity}>
                                                {slot.entity?.aliases?.length ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {slot.entity.aliases.slice(0, 4).map((alias) => (
                                                            <span
                                                                key={alias.id}
                                                                className="rounded bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--arc-text-muted)]"
                                                            >
                                                                {alias.alias}
                                                            </span>
                                                        ))}
                                                        {slot.entity.aliases.length > 4 && (
                                                            <span className="text-[9px] text-[var(--arc-text-muted)]">
                                                                +{slot.entity.aliases.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="TAGS" diff={isDiff(diffKeys.tags)} rowIndex={4}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.tags) && !!slot.entity}>
                                                {slot.entity?.tags?.length ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {slot.entity.tags.map((tag) => (
                                                            <span
                                                                key={tag.id}
                                                                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                                                style={{
                                                                    color: tag.color ?? 'var(--arc-text-muted)',
                                                                    backgroundColor: `${tag.color ?? '#6B7280'}18`,
                                                                }}
                                                            >
                                                                {tag.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="CATEGORIES" diff={isDiff(diffKeys.categories)} rowIndex={5}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.categories) && !!slot.entity}>
                                                {slot.entity?.categories?.length ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {slot.entity.categories.map((cat) => (
                                                            <span
                                                                key={cat.id}
                                                                className="rounded border border-[var(--arc-border)] px-1.5 py-0.5 text-[9px] text-[var(--arc-text-muted)]"
                                                            >
                                                                {cat.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>
                                </>
                            )}

                            {/* CONTENT */}
                            <SectionGroup
                                id="content"
                                collapsed={collapsedSections.has('content')}
                                colCount={slots.length}
                                onToggle={() => toggleSection('content')}
                            />
                            {!collapsedSections.has('content') && (
                                <>
                                    <CompareRow label="SECTIONS" diff={isDiff(diffKeys.sections)} rowIndex={0}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.sections) && !!slot.entity}>
                                                <StatValue value={slot.entity?.sections?.length ?? 0} />
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="ATTRIBUTES" diff={isDiff(diffKeys.attributes)} rowIndex={1}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.attributes) && !!slot.entity}>
                                                {slot.entity?.attributes?.length ? (
                                                    <div className="space-y-1">
                                                        {slot.entity.attributes.slice(0, 6).map((attr) => (
                                                            <div
                                                                key={attr.id}
                                                                className="flex items-center justify-between gap-2 text-[10px]"
                                                            >
                                                                <span className="truncate text-[var(--arc-text-muted)]">
                                                                    {attr.definition?.name}
                                                                </span>
                                                                <span className="shrink-0 font-medium text-[var(--arc-text)]">
                                                                    {attr.value}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {slot.entity.attributes.length > 6 && (
                                                            <span className="arc-mono block text-[8px] text-[var(--arc-text-muted)]">
                                                                +{slot.entity.attributes.length - 6} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>
                                </>
                            )}

                            {/* NETWORK */}
                            <SectionGroup
                                id="network"
                                collapsed={collapsedSections.has('network')}
                                colCount={slots.length}
                                onToggle={() => toggleSection('network')}
                            />
                            {!collapsedSections.has('network') && (
                                <>
                                    <CompareRow label="AFFILIATIONS" diff={isDiff(diffKeys.affiliations)} rowIndex={0}>
                                        {slots.map((slot) => {
                                            const all = slot.entity?.affiliation_history ?? [];
                                            return (
                                                <CompareCell key={slot.id} diff={isDiff(diffKeys.affiliations) && !!slot.entity}>
                                                    {all.length ? (
                                                        <div className="space-y-1">
                                                            {all.slice(0, 3).map((a) => (
                                                                <div key={a.id} className="flex items-center gap-1.5">
                                                                    <span
                                                                        className="size-1.5 shrink-0 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                AFFILIATION_STATUS_COLOR[a.status] ??
                                                                                'var(--arc-text-muted)',
                                                                        }}
                                                                    />
                                                                    <span className="truncate text-[10px] font-medium text-[var(--arc-text)]">
                                                                        {a.organization_name ?? a.organization?.name ?? 'Unknown'}
                                                                    </span>
                                                                    {a.role && (
                                                                        <span className="shrink-0 text-[9px] text-[var(--arc-text-muted)]">
                                                                            {a.role}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {all.length > 3 && (
                                                                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                                                    +{all.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Dash />
                                                    )}
                                                </CompareCell>
                                            );
                                        })}
                                    </CompareRow>

                                    <CompareRow label="RELATIONS" diff={isDiff(diffKeys.relations)} rowIndex={1}>
                                        {slots.map((slot) => {
                                            const out = slot.entity?.outgoing_relations?.length ?? 0;
                                            const inc = slot.entity?.incoming_relations?.length ?? 0;
                                            return (
                                                <CompareCell key={slot.id} diff={isDiff(diffKeys.relations) && !!slot.entity}>
                                                    {slot.entity ? (
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                                <span className="arc-mono font-bold text-[var(--arc-text)]">
                                                                    {out + inc}
                                                                </span>
                                                                <span className="text-[var(--arc-text-muted)]">total</span>
                                                            </div>
                                                            <div className="flex gap-2 text-[9px] text-[var(--arc-text-muted)]">
                                                                <span>↑ {out} out</span>
                                                                <span>↓ {inc} in</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Dash />
                                                    )}
                                                </CompareCell>
                                            );
                                        })}
                                    </CompareRow>

                                    <CompareRow label="TIMELINES" diff={isDiff(diffKeys.timelines)} rowIndex={2}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.timelines) && !!slot.entity}>
                                                {slot.entity?.timelines?.length ? (
                                                    <div className="space-y-0.5">
                                                        {slot.entity.timelines.slice(0, 3).map((tl) => (
                                                            <div key={tl.id} className="truncate text-[10px] text-[var(--arc-text-muted)]">
                                                                {tl.name}
                                                            </div>
                                                        ))}
                                                        {slot.entity.timelines.length > 3 && (
                                                            <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                                                +{slot.entity.timelines.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="MEDIA SOURCES" diff={isDiff(diffKeys.mediaSources)} rowIndex={3}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.mediaSources) && !!slot.entity}>
                                                <StatValue value={slot.entity?.media_sources?.length ?? 0} />
                                            </CompareCell>
                                        ))}
                                    </CompareRow>
                                </>
                            )}

                            {/* RECORDS */}
                            <SectionGroup
                                id="records"
                                collapsed={collapsedSections.has('records')}
                                colCount={slots.length}
                                onToggle={() => toggleSection('records')}
                            />
                            {!collapsedSections.has('records') && (
                                <>
                                    <CompareRow label="POWERS" diff={isDiff(diffKeys.powers)} rowIndex={0}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.powers) && !!slot.entity}>
                                                {slot.entity?.power_profiles?.length ? (
                                                    <div className="space-y-2">
                                                        {slot.entity.power_profiles.slice(0, 3).map((p) => (
                                                            <div key={p.id} className="space-y-1">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="truncate text-[10px] font-medium text-[var(--arc-text)]">
                                                                        {p.name}
                                                                    </span>
                                                                    <span
                                                                        className="arc-mono shrink-0 text-[8px] font-bold uppercase"
                                                                        style={{ color: POWER_STATUS_COLOR[p.status] ?? 'var(--arc-text-muted)' }}
                                                                    >
                                                                        {p.status}
                                                                    </span>
                                                                </div>
                                                                {p.power_level != null && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--arc-border)]">
                                                                            <div
                                                                                className="h-full rounded-full transition-all"
                                                                                style={{
                                                                                    width: `${p.power_level * 10}%`,
                                                                                    backgroundColor: POWER_BAR_COLOR(p.power_level),
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <span className="arc-mono shrink-0 text-[8px] text-[var(--arc-text-muted)]">
                                                                            {p.power_level}/10
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {slot.entity.power_profiles.length > 3 && (
                                                            <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                                                +{slot.entity.power_profiles.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="INFECTIONS" diff={isDiff(diffKeys.infections)} rowIndex={1}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.infections) && !!slot.entity}>
                                                {slot.entity?.infection_records?.length ? (
                                                    <div className="space-y-1">
                                                        {slot.entity.infection_records.slice(0, 3).map((rec) => (
                                                            <div key={rec.id} className="flex items-center gap-1.5">
                                                                <span
                                                                    className="size-1.5 shrink-0 rounded-full"
                                                                    style={{ backgroundColor: INFECTION_STATUS_COLOR[rec.status] ?? 'var(--arc-text-muted)' }}
                                                                />
                                                                <span className="truncate text-[10px] text-[var(--arc-text-muted)]">
                                                                    {rec.pathogen_name ?? 'Unknown pathogen'}
                                                                </span>
                                                                <span
                                                                    className="arc-mono ml-auto shrink-0 text-[8px] font-bold uppercase"
                                                                    style={{ color: INFECTION_STATUS_COLOR[rec.status] ?? 'var(--arc-text-muted)' }}
                                                                >
                                                                    {rec.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {slot.entity.infection_records.length > 3 && (
                                                            <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                                                +{slot.entity.infection_records.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>

                                    <CompareRow label="MUTATIONS" diff={isDiff(diffKeys.mutations)} rowIndex={2}>
                                        {slots.map((slot) => {
                                            const stages = slot.entity?.mutation_stages ?? [];
                                            const maxThreat = stages.reduce((max, s) => Math.max(max, s.threat_level ?? 0), 0);
                                            return (
                                                <CompareCell key={slot.id} diff={isDiff(diffKeys.mutations) && !!slot.entity}>
                                                    {stages.length ? (
                                                        <div className="space-y-0.5">
                                                            <StatValue value={stages.length} suffix=" stages" />
                                                            {maxThreat > 0 && (
                                                                <div className="flex items-center gap-1 text-[9px]">
                                                                    <span className="text-[var(--arc-text-muted)]">Peak threat:</span>
                                                                    <span
                                                                        className="arc-mono font-bold"
                                                                        style={{ color: POWER_BAR_COLOR(maxThreat) }}
                                                                    >
                                                                        {maxThreat}/10
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Dash />
                                                    )}
                                                </CompareCell>
                                            );
                                        })}
                                    </CompareRow>

                                    <CompareRow label="DEATHS" diff={isDiff(diffKeys.deaths)} rowIndex={3}>
                                        {slots.map((slot) => {
                                            const records = slot.entity?.death_records ?? [];
                                            const revived = records.filter((r) => r.is_revived).length;
                                            return (
                                                <CompareCell key={slot.id} diff={isDiff(diffKeys.deaths) && !!slot.entity}>
                                                    {records.length ? (
                                                        <div className="space-y-1">
                                                            <StatValue value={records.length} suffix=" record(s)" />
                                                            <div className="flex flex-wrap gap-2">
                                                                {records.some((r) => r.is_confirmed) && (
                                                                    <span className="arc-mono text-[8px] font-bold uppercase text-[var(--arc-danger)]">
                                                                        CONFIRMED
                                                                    </span>
                                                                )}
                                                                {revived > 0 && (
                                                                    <span className="arc-mono text-[8px] font-bold uppercase text-[var(--arc-success)]">
                                                                        REVIVED ×{revived}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Dash />
                                                    )}
                                                </CompareCell>
                                            );
                                        })}
                                    </CompareRow>

                                    <CompareRow label="CONSCIOUSNESS" diff={isDiff(diffKeys.consciousness)} rowIndex={4}>
                                        {slots.map((slot) => {
                                            const records = slot.entity?.consciousness_records ?? [];
                                            const latest = records[0];
                                            return (
                                                <CompareCell key={slot.id} diff={isDiff(diffKeys.consciousness) && !!slot.entity}>
                                                    {records.length ? (
                                                        <div className="space-y-0.5">
                                                            <StatValue value={records.length} suffix=" record(s)" />
                                                            {latest && (
                                                                <div className="flex items-center gap-1">
                                                                    <span
                                                                        className="size-1.5 rounded-full"
                                                                        style={{ backgroundColor: CONSCIOUSNESS_STATUS_COLOR[latest.status] ?? 'var(--arc-text-muted)' }}
                                                                    />
                                                                    <span
                                                                        className="arc-mono text-[9px] uppercase"
                                                                        style={{ color: CONSCIOUSNESS_STATUS_COLOR[latest.status] ?? 'var(--arc-text-muted)' }}
                                                                    >
                                                                        {latest.status}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Dash />
                                                    )}
                                                </CompareCell>
                                            );
                                        })}
                                    </CompareRow>

                                    <CompareRow label="QUOTES" diff={isDiff(diffKeys.quotes)} rowIndex={5}>
                                        {slots.map((slot) => (
                                            <CompareCell key={slot.id} diff={isDiff(diffKeys.quotes) && !!slot.entity}>
                                                {slot.entity?.quotes?.length ? (
                                                    <div className="space-y-1.5">
                                                        {slot.entity.quotes
                                                            .filter((q) => q.is_featured)
                                                            .slice(0, 1)
                                                            .map((q) => (
                                                                <p key={q.id} className="line-clamp-2 text-[10px] italic text-[var(--arc-text-muted)]">
                                                                    "{q.quote}"
                                                                </p>
                                                            ))}
                                                        <StatValue value={slot.entity.quotes.length} suffix=" total" />
                                                    </div>
                                                ) : (
                                                    <Dash />
                                                )}
                                            </CompareCell>
                                        ))}
                                    </CompareRow>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {entitiesWithData.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                    <Scale className="size-8 text-[var(--arc-text-muted)]" opacity={0.4} />
                    <div className="text-center">
                        <p className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                            SELECT ENTITIES TO COMPARE
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--arc-text-muted)]">
                            Add up to 5 subjects · toggle Diff to highlight differences
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Section group header row

function SectionGroup({
    id,
    collapsed,
    colCount,
    onToggle,
}: {
    id: SectionGroupId;
    collapsed: boolean;
    colCount: number;
    onToggle: () => void;
}) {
    const group = SECTION_GROUPS.find((g) => g.id === id)!;
    const { Icon } = group;
    return (
        <>
            <button
                onClick={onToggle}
                className="flex items-center gap-2 border-b border-t border-[var(--arc-border-strong)] bg-[var(--arc-win-title-bg)] px-3 py-1.5 text-left transition-colors hover:bg-[var(--arc-win-title-active-bg)]"
            >
                <Icon className="size-3 text-[var(--arc-win-title-text)]" />
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-win-title-text)]">
                    {group.label}
                </span>
                <ChevronDown
                    className={cn(
                        'ml-auto size-3 text-[var(--arc-win-title-text)] transition-transform',
                        collapsed && '-rotate-90',
                    )}
                />
            </button>
            {Array.from({ length: colCount }).map((_, i) => (
                <button
                    key={i}
                    onClick={onToggle}
                    className="border-b border-l border-t border-[var(--arc-border-strong)] bg-[var(--arc-win-title-bg)] py-1.5 transition-colors hover:bg-[var(--arc-win-title-active-bg)]"
                />
            ))}
        </>
    );
}

// Slot header for a loaded entity

function SlotHeader({
    entity,
    onClear,
    onOpenDossier,
}: {
    entity: ApiEntity;
    onClear: () => void;
    onOpenDossier: () => void;
}) {
    const profileImg = entity.images?.find((img) => img.type === 'profile');
    const thumbUrl = profileImg?.thumbnail_url ?? profileImg?.url ?? null;

    return (
        <div className="flex items-start gap-2">
            {/* Profile image */}
            <button
                onClick={onOpenDossier}
                className="size-14 shrink-0 overflow-hidden rounded border border-[var(--arc-border-strong)] bg-[var(--arc-bg)] transition-opacity hover:opacity-80"
                title="Open dossier"
            >
                {thumbUrl ? (
                    <img src={thumbUrl} alt={entity.name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <TypeIcon entityType={entity.entity_type} size="md" />
                    </div>
                )}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                    <button
                        onClick={onOpenDossier}
                        className="block truncate text-left text-xs font-semibold text-[var(--arc-text)] hover:text-[var(--arc-accent)]"
                    >
                        {entity.name}
                    </button>
                    {entity.is_featured && (
                        <Star className="size-3 shrink-0 text-[var(--arc-warning)]" fill="currentColor" /> 
                    )}
                    {entity.is_locked && (
                        <Lock className="size-3 shrink-0 text-[var(--arc-text-muted)]" />
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <TypeIcon entityType={entity.entity_type} size="sm" />
                    <span className="arc-mono truncate text-[9px] text-[var(--arc-text-muted)]">
                        {entity.entity_type?.name ?? 'Unknown'}
                    </span>
                </div>
                {(entity.categories?.length ?? 0) > 0 && (
                    <div className="arc-mono mt-0.5 text-[8px] text-[var(--arc-text-muted)]">
                        {entity.categories.length} {entity.categories.length === 1 ? 'category' : 'categories'}
                    </div>
                )}
                {entity.entity_status && (
                    <div className="mt-1">
                        <StatusBadge status={entity.entity_status} />
                    </div>
                )}
            </div>

            <button
                onClick={onClear}
                className="mt-0.5 shrink-0 text-[var(--arc-text-muted)] transition-colors hover:text-[var(--arc-danger)]"
                title="Remove"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}

// Empty slot with entity search

function SlotSearch({
    isActive,
    canRemove,
    searchQuery,
    searchResults,
    searching,
    onToggle,
    onQueryChange,
    onSelect,
    onRemove,
}: {
    isActive: boolean;
    canRemove: boolean;
    searchQuery: string;
    searchResults: ApiEntitySummary[];
    searching: boolean;
    onToggle: () => void;
    onQueryChange: (q: string) => void;
    onSelect: (slug: string) => void;
    onRemove: () => void;
}) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={cn(
                    'flex w-full items-center gap-2 rounded border border-dashed px-3 py-2.5 text-left transition-all',
                    isActive
                        ? 'border-[var(--arc-accent)] bg-[var(--arc-accent)]/5'
                        : 'border-[var(--arc-border)] hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]',
                )}
            >
                <Search className="size-3.5 text-[var(--arc-text-muted)]" />
                <span className="text-xs text-[var(--arc-text-muted)]">Select entity…</span>
                <ChevronDown
                    className={cn(
                        'ml-auto size-3.5 text-[var(--arc-text-muted)] transition-transform',
                        isActive && 'rotate-180',
                    )}
                />
            </button>

            {isActive && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-[var(--arc-border)] bg-[var(--arc-surface)] shadow-lg">
                    <div className="border-b border-[var(--arc-border)] px-3 py-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder="Search entities…"
                            className="w-full bg-transparent text-xs text-[var(--arc-text)] placeholder:text-[var(--arc-text-muted)] focus:outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {searching ? (
                            <div className="flex items-center justify-center py-5">
                                <Loader2 className="size-4 animate-spin text-[var(--arc-accent)]" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((result) => {
                                const thumb = result.images?.find((img) => img.type === 'profile');
                                const thumbUrl = thumb?.thumbnail_url ?? thumb?.url ?? null;
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => onSelect(result.slug)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--arc-surface-hover)]"
                                    >
                                        <div className="size-6 shrink-0 overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-bg)]">
                                            {thumbUrl ? (
                                                <img src={thumbUrl} alt={result.name} className="size-full object-cover" />
                                            ) : (
                                                <div className="flex size-full items-center justify-center">
                                                    <TypeIcon entityType={result.entity_type} size="sm" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-medium text-[var(--arc-text)]">
                                                {result.name}
                                            </div>
                                            <div className="arc-mono truncate text-[8px] text-[var(--arc-text-muted)]">
                                                {result.entity_type?.name}
                                            </div>
                                        </div>
                                        {result.entity_status && (
                                            <StatusBadge status={result.entity_status} size="sm" />
                                        )}
                                    </button>
                                );
                            })
                        ) : searchQuery ? (
                            <div className="py-5 text-center text-xs text-[var(--arc-text-muted)]">No results found</div>
                        ) : (
                            <div className="py-5 text-center text-xs text-[var(--arc-text-muted)]">Type to search…</div>
                        )}
                    </div>
                </div>
            )}

            {canRemove && (
                <button
                    onClick={onRemove}
                    className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-[var(--arc-border)] bg-[var(--arc-surface)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)]"
                    title="Remove slot"
                >
                    <X className="size-3" />
                </button>
            )}
        </div>
    );
}

// Helper components

function CompareRow({
    label,
    children,
    diff = false,
    rowIndex = 0,
}: {
    label: string;
    children: React.ReactNode;
    diff?: boolean;
    rowIndex?: number;
}) {
    return (
        <>
            <div
                className={cn(
                    'flex items-center border-b border-[var(--arc-border)] px-3 py-2',
                    rowIndex % 2 === 0 ? 'bg-[var(--arc-surface-alt)]' : 'bg-[var(--arc-surface)]',
                    diff && 'border-l-2 border-l-[var(--arc-warning)]/60',
                )}
            >
                <span className="arc-mono text-[9px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                    {label}
                </span>
            </div>
            {children}
        </>
    );
}

function CompareCell({ children, diff = false }: { children: React.ReactNode; diff?: boolean }) {
    return (
        <div
            className={cn(
                'border-b border-l border-[var(--arc-border)] bg-[var(--arc-bg)] p-3 transition-colors',
                diff && 'bg-[var(--arc-warning)]/5 border-l-[var(--arc-warning)]/30',
            )}
        >
            {children}
        </div>
    );
}

function Dash() {
    return <span className="arc-mono text-[10px] text-[var(--arc-text-muted)] opacity-40">—</span>;
}

function StatValue({ value, suffix = '' }: { value: number; suffix?: string }) {
    return (
        <span className={cn('arc-mono text-sm font-bold', value > 0 ? 'text-[var(--arc-text)]' : 'text-[var(--arc-text-muted)]')}>
            {value}
            {suffix && <span className="text-[10px] font-normal text-[var(--arc-text-muted)]">{suffix}</span>}
        </span>
    );
}