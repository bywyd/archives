import {
    AlertCircle,
    ChevronDown,
    Loader2,
    Plus,
    Scale,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, ApiEntitySummary } from '@/types/api';

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

export function EntityComparison({ universeId, initialEntitySlugs = [] }: Props) {
    // Capture initial slugs once  avoids re-running the effect if parent re-renders
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
    const [searchResults, setSearchResults] = useState<ApiEntitySummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const { openWindow } = useWindowStore();

    // Load initial entities  runs once on mount using the captured ref
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
            api.searchEntities(universeId, searchQuery)
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

    const removeSlot = (slotId: string) =>
        setSlots((prev) => prev.filter((s) => s.id !== slotId));

    const clearSlot = (slotId: string) =>
        setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, entity: null, error: null } : s)));

    const entitiesWithData = slots.filter((s) => s.entity !== null);

    return (
        <div className="flex h-full flex-col">
            {/*  Header  */}
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Scale className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        ENTITY COMPARISON
                    </span>
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                         {entitiesWithData.length} SUBJECTS
                    </span>
                </div>
                <button
                    onClick={addSlot}
                    disabled={slots.length >= 5}
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] px-2 py-1 text-[10px] text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:text-[var(--arc-accent)] disabled:opacity-40"
                >
                    <Plus className="size-3" />
                    Add Subject
                </button>
            </div>

            {/*  Comparison Grid  */}
            <div className="flex-1 overflow-auto">
                <div
                    ref={gridRef}
                    className="grid min-w-max"
                    style={{ gridTemplateColumns: `180px repeat(${slots.length}, minmax(220px, 1fr))` }}
                >
                    {/*  Sticky subject selector row  */}
                    <div className="sticky top-0 z-10 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                        <span className="arc-mono text-[9px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                            SUBJECTS
                        </span>
                    </div>

                    {slots.map((slot) => (
                        <div
                            key={slot.id}
                            className="sticky top-0 z-10 border-b-2 border-l border-[var(--arc-border)] border-b-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] p-3"
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
                                            title: `${slot.entity!.name}  DOSSIER`,
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

                    {/*  Comparison data rows  */}
                    {entitiesWithData.length > 0 && (
                        <>
                            <CompareRow label="STATUS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
                                        {slot.entity?.entity_status ? (
                                            <StatusBadge status={slot.entity.entity_status} />
                                        ) : (
                                            <Dash />
                                        )}
                                    </CompareCell>
                                ))}
                            </CompareRow>

                            <CompareRow label="TYPE">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
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

                            <CompareRow label="DESCRIPTION">
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

                            <CompareRow label="ALIASES">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
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

                            <CompareRow label="TAGS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
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

                            <CompareRow label="RELATIONS">
                                {slots.map((slot) => {
                                    const count =
                                        (slot.entity?.outgoing_relations?.length ?? 0) +
                                        (slot.entity?.incoming_relations?.length ?? 0);
                                    return (
                                        <CompareCell key={slot.id}>
                                            <span className="arc-mono text-sm font-bold text-[var(--arc-text)]">
                                                {count}
                                            </span>
                                        </CompareCell>
                                    );
                                })}
                            </CompareRow>

                            <CompareRow label="POWERS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
                                        <StatValue value={slot.entity?.power_profiles?.length ?? 0} />
                                    </CompareCell>
                                ))}
                            </CompareRow>

                            <CompareRow label="SECTIONS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
                                        <StatValue value={slot.entity?.sections?.length ?? 0} />
                                    </CompareCell>
                                ))}
                            </CompareRow>

                            <CompareRow label="INFECTIONS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
                                        <StatValue value={slot.entity?.infection_records?.length ?? 0} />
                                    </CompareCell>
                                ))}
                            </CompareRow>

                            <CompareRow label="MUTATIONS">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
                                        <StatValue value={slot.entity?.mutation_stages?.length ?? 0} />
                                    </CompareCell>
                                ))}
                            </CompareRow>

                            <CompareRow label="ATTRIBUTES">
                                {slots.map((slot) => (
                                    <CompareCell key={slot.id}>
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
                                                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
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
                </div>
            </div>

            {/*  Empty state  */}
            {entitiesWithData.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)] py-10">
                    <Scale className="size-8 text-[var(--arc-text-muted)]" opacity={0.4} />
                    <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                        SELECT ENTITIES TO COMPARE
                    </span>
                </div>
            )}
        </div>
    );
}

//  Slot header for a loaded entity 

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
                className="size-11 shrink-0 overflow-hidden rounded border border-[var(--arc-border-strong)] bg-[var(--arc-bg)] transition-opacity hover:opacity-80"
                title="Open dossier"
            >
                {thumbUrl ? (
                    <img src={thumbUrl} alt={entity.name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <TypeIcon entityType={entity.entity_type} size="sm" />
                    </div>
                )}
            </button>

            <div className="min-w-0 flex-1">
                <button
                    onClick={onOpenDossier}
                    className="block truncate text-left text-xs font-semibold text-[var(--arc-text)] hover:text-[var(--arc-accent)]"
                >
                    {entity.name}
                </button>
                <div className="arc-mono truncate text-[9px] text-[var(--arc-text-muted)]">
                    {entity.entity_type?.name ?? 'Unknown'}
                </div>
                {entity.entity_status && (
                    <div className="mt-1">
                        <StatusBadge status={entity.entity_status} />
                    </div>
                )}
            </div>

            <button
                onClick={onClear}
                className="mt-0.5 shrink-0 text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                title="Remove"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}

//  Empty slot with entity search 

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
                                    </button>
                                );
                            })
                        ) : searchQuery ? (
                            <div className="py-5 text-center text-xs text-[var(--arc-text-muted)]">
                                No results found
                            </div>
                        ) : (
                            <div className="py-5 text-center text-xs text-[var(--arc-text-muted)]">
                                Type to search…
                            </div>
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

//  Helper components 

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <>
            <div className="border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <span className="arc-mono text-[9px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                    {label}
                </span>
            </div>
            {children}
        </>
    );
}

function CompareCell({ children }: { children: React.ReactNode }) {
    return (
        <div className="border-b border-l border-[var(--arc-border)] bg-[var(--arc-bg)] p-3">
            {children}
        </div>
    );
}

function Dash() {
    return <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]"></span>;
}

function StatValue({ value }: { value: number }) {
    return (
        <span className={cn('arc-mono text-sm font-bold', value > 0 ? 'text-[var(--arc-text)]' : 'text-[var(--arc-text-muted)]')}>
            {value}
        </span>
    );
}