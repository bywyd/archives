import {
    AlertCircle,
    Compass,
    Filter,
    History,
    LayoutGrid,
    List,
    Loader2,
    Search,
    SlidersHorizontal,
    Sparkles,
    Terminal,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EntityCard } from '@/components/archives/entity-card';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useHistoryStore } from '@/stores/history-store';
import { useWindowStore } from '@/stores/window-store';
import type { ApiMetaEntityStatus, ApiMetaEntityType, ApiSearchResult, ApiUniverse } from '@/types/api';

type Props = Record<string, unknown>;

type SortOption = 'relevance' | 'name-asc' | 'name-desc' | 'newest' | 'oldest';

export function SearchTerminal(_props: Props) {
    const [query, setQuery] = useState(_props.initialQuery as string || '');
    const [results, setResults] = useState<ApiSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [entityStatuses, setEntityStatuses] = useState<ApiMetaEntityStatus[]>([]);
    const [universes, setUniverses] = useState<ApiUniverse[]>([]);
    const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
    const [activeUniverseFilter, setActiveUniverseFilter] = useState<number | null>(null);
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('relevance');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow } = useWindowStore();
    const { history } = useHistoryStore();
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);


    // Auto-focus
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const performSearch = useCallback(
        async (searchQuery: string) => {
            if (searchQuery.trim().length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const res = await api.globalSearch(searchQuery);
                setResults(res.data);
            } catch {
                setError('Search failed. Check your connection.');
            } finally {
                setLoading(false);
            }
        },
        [],
    );
    
    // Load filter options
    useEffect(() => {
        Promise.all([
            api.fetchEntityTypes(),
            api.fetchEntityStatuses(),
            api.fetchUniverses(),
        ])
            .then(([etRes, esRes, uRes]) => {
                setEntityTypes(etRes.data);
                setEntityStatuses(esRes.data);
                setUniverses(uRes.data);
            })
            .catch(() => {});
        if (query !== '') {
            performSearch(query);
        }
    }, []);

    // Filtered and sorted results
    const filtered = useMemo(() => {
        let items = [...results];

        // Apply type filter
        if (activeTypeFilter) {
            items = items.filter((r) => r.entity_type?.slug === activeTypeFilter);
        }

        // Apply status filter
        if (activeStatusFilter) {
            items = items.filter((r) => r.entity_status?.slug === activeStatusFilter);
        }

        // Apply universe filter
        if (activeUniverseFilter) {
            items = items.filter((r) => r.universe?.id === activeUniverseFilter);
        }

        // Apply featured filter
        if (featuredOnly) {
            items = items.filter((r) => r.is_featured);
        }

        // Apply sorting
        switch (sortBy) {
            case 'name-asc':
                items.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                items.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'newest':
                items.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
                break;
            case 'oldest':
                items.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
                break;
            // 'relevance' keeps original order
        }

        return items;
    }, [results, activeTypeFilter, activeStatusFilter, activeUniverseFilter, featuredOnly, sortBy]);

    // Count active filters
    const activeFilterCount = [activeTypeFilter, activeStatusFilter, activeUniverseFilter, featuredOnly].filter(Boolean).length;

    const clearAllFilters = () => {
        setActiveTypeFilter(null);
        setActiveStatusFilter(null);
        setActiveUniverseFilter(null);
        setFeaturedOnly(false);
        setSortBy('relevance');
    };

    const handleInputChange = (value: string) => {
        setQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            performSearch(query);
        }
    };

    const openEntityDossier = (result: ApiSearchResult) => {
        if (!result.universe) {
            return;
        }

        openWindow({
            type: 'entity-dossier',
            title: `${result.name}  DOSSIER`,
            icon: result.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${result.universe.id}-${result.slug}`,
                universeId: result.universe.id,
                entitySlug: result.slug,
            },
        });
    };

    // Recent searches from history
    const recentSearches = history.slice(0, 5);

    return (
        <div className="flex h-full flex-col">
            {/* Search Header */}
            <div className="border-b border-[var(--arc-border)] p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Search className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-xs font-semibold tracking-[0.2em] text-[var(--arc-accent)]">
                        GLOBAL SEARCH TERMINAL
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={cn(
                            'flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-medium transition-all',
                            showAdvanced || activeFilterCount > 0
                                ? 'border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/20'
                        )}
                    >
                        <SlidersHorizontal className="size-3" />
                        FILTERS
                        {activeFilterCount > 0 && (
                            <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-[var(--arc-accent)] text-[8px] text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--arc-text-muted)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search entities, aliases, codenames..."
                        className={cn(
                            'arc-mono h-10 w-full rounded-none border bg-[var(--arc-bg)] pl-9 pr-9 text-sm text-[var(--arc-text)] outline-none',
                            'border-[var(--arc-border)] placeholder:text-[var(--arc-text-muted)]/50',
                            'focus:border-[var(--arc-accent)]/50 focus:ring-1 focus:ring-[var(--arc-accent)]/20',
                        )}
                    />
                    {query && (
                        <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                            onClick={() => {
                                setQuery('');
                                setResults([]);
                                inputRef.current?.focus();
                            }}
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* Quick Type Filter Chips */}
                {entityTypes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                            className={cn(
                                'rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all',
                                !activeTypeFilter
                                    ? 'border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/15 text-[var(--arc-accent)]'
                                    : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/20 hover:bg-[var(--arc-surface-hover)]',
                            )}
                            onClick={() => setActiveTypeFilter(null)}
                        >
                            All
                        </button>
                        {/* render first 5 */}
                        {entityTypes.slice(0, isTypeFilterOpen ? entityTypes.length : 6).map((et) => (
                            <button
                                key={et.slug}
                                className={cn(
                                    'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all',
                                    activeTypeFilter === et.slug
                                        ? 'border-[var(--arc-accent)]/30 text-[var(--arc-accent)]'
                                        : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/20 hover:bg-[var(--arc-surface-hover)]',
                                )}
                                style={
                                    activeTypeFilter === et.slug
                                        ? { backgroundColor: `${et.color}20` }
                                        : undefined
                                }
                                onClick={() =>
                                    setActiveTypeFilter(
                                        activeTypeFilter === et.slug ? null : et.slug,
                                    )
                                }
                            >
                                <TypeIcon entityType={et} size="sm" />
                                {et.name}
                            </button>
                        ))}
                        {/* render remaining types */}
                        {entityTypes.length > 6 && (
                            <button
                                className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all"
                                onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                            >
                                {isTypeFilterOpen ? 'Show Less' : `+${entityTypes.length - 5} More`}
                            </button>
                        )}

                    </div>
                )}

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="mt-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] p-3">
                        <div className="flex items-center justify-between">
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                ADVANCED FILTERS
                            </span>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="arc-mono text-[9px] text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                                >
                                    CLEAR ALL
                                </button>
                            )}
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Status Filter */}
                            <div>
                                <label className="arc-mono mb-1.5 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                                    STATUS
                                </label>
                                <select
                                    value={activeStatusFilter ?? ''}
                                    onChange={(e) => setActiveStatusFilter(e.target.value || null)}
                                    className="arc-mono h-7 w-full rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-[10px] text-[var(--arc-text)] outline-none focus:border-[var(--arc-accent)]/50"
                                >
                                    <option value="">All Statuses</option>
                                    {entityStatuses.map((es) => (
                                        <option key={es.slug} value={es.slug}>
                                            {es.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Universe Filter */}
                            <div>
                                <label className="arc-mono mb-1.5 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                                    UNIVERSE
                                </label>
                                <select
                                    value={activeUniverseFilter ?? ''}
                                    onChange={(e) => setActiveUniverseFilter(e.target.value ? Number(e.target.value) : null)}
                                    className="arc-mono h-7 w-full rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-[10px] text-[var(--arc-text)] outline-none focus:border-[var(--arc-accent)]/50"
                                >
                                    <option value="">All Universes</option>
                                    {universes.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="arc-mono mb-1.5 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                                    SORT BY
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="arc-mono h-7 w-full rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-[10px] text-[var(--arc-text)] outline-none focus:border-[var(--arc-accent)]/50"
                                >
                                    <option value="relevance">Relevance</option>
                                    <option value="name-asc">Name (A-Z)</option>
                                    <option value="name-desc">Name (Z-A)</option>
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>

                            {/* Featured Only */}
                            <div>
                                <label className="arc-mono mb-1.5 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                                    OPTIONS
                                </label>
                                <button
                                    onClick={() => setFeaturedOnly(!featuredOnly)}
                                    className={cn(
                                        'flex h-7 items-center gap-1.5 rounded border px-2 text-[10px] font-medium transition-all',
                                        featuredOnly
                                            ? 'border-[var(--arc-warning)]/40 bg-[var(--arc-warning)]/10 text-[var(--arc-warning)]'
                                            : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-warning)]/20'
                                    )}
                                >
                                    <Sparkles className="size-3" />
                                    Priority Only
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-3">
                {/* Recent Searches (when no query) */}
                {!loading && query.trim().length < 2 && results.length === 0 && recentSearches.length > 0 && (
                    <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2">
                            <History className="size-3 text-[var(--arc-text-muted)]" />
                            <span className="arc-mono text-[9px] font-semibold tracking-[0.15em] text-[var(--arc-text-muted)]">
                                RECENT
                            </span>
                        </div>
                        <div className="space-y-1">
                            {recentSearches.map((item) => (
                                <button
                                    key={`${item.entityId}-${item.universeId}`}
                                    onClick={() => {
                                        if (item.universeId) {
                                            openWindow({
                                                type: 'entity-dossier',
                                                title: `${item.name}  DOSSIER`,
                                                icon: item.entityType?.icon ?? 'EN',
                                                props: {
                                                    key: `entity-${item.universeId}-${item.slug}`,
                                                    universeId: item.universeId,
                                                    entitySlug: item.slug,
                                                },
                                            });
                                        }
                                    }}
                                    className="flex w-full items-center gap-2 rounded border border-transparent p-1.5 text-left transition-all hover:border-[var(--arc-border)] hover:bg-[var(--arc-surface-hover)]"
                                >
                                    <TypeIcon entityType={item.entityType} size="sm" />
                                    <span className="flex-1 truncate text-xs text-[var(--arc-text)]">{item.name}</span>
                                    <StatusBadge status={item.entityStatus} size="sm" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                        <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[10px] tracking-[0.15em] text-[var(--arc-text-muted)]">
                            QUERYING DATABASE...
                        </span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-md bg-[var(--arc-danger)]/10 px-3 py-2 text-sm text-[var(--arc-danger)]">
                        <AlertCircle className="size-4" />
                        {error}
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                                {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''} FOUND
                                {results.length !== filtered.length && (
                                    <span className="ml-1 text-[var(--arc-accent)]">
                                        (of {results.length})
                                    </span>
                                )}
                            </span>
                            <div className="flex items-center gap-1 rounded border border-[var(--arc-border)] p-0.5">
                                <button
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-sm transition-all',
                                        viewMode === 'table'
                                            ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                            : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                                    )}
                                    onClick={() => setViewMode('table')}
                                    title="Table View"
                                >
                                    <List className="size-3.5" />
                                </button>
                                <button
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-sm transition-all',
                                        viewMode === 'grid'
                                            ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                            : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                                    )}
                                    onClick={() => setViewMode('grid')}
                                    title="Card View"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        {viewMode === 'table' ? (
                            <table className="arc-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        {/* <th>Universe</th> */}
                                        <th className="hidden lg:table-cell">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((result) => (
                                        <tr
                                            key={result.id}
                                            className="cursor-pointer"
                                            onClick={() => openEntityDossier(result)}
                                        >
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <TypeIcon entityType={result.entity_type} size="sm" />
                                                    <span className="text-xs font-medium text-[var(--arc-text)]">
                                                        {result.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                                    {result.entity_type?.name ?? ''}
                                                </span>
                                            </td>
                                            <td>
                                                <StatusBadge status={result.entity_status} />
                                            </td>
                                            {/* <td>
                                                <span className="arc-mono line-clamp-1 text-[10px] text-[var(--arc-text-muted)]">
                                                    {result.universe?.name ?? ''}
                                                </span>
                                            </td> */}
                                            <td className="hidden lg:table-cell">
                                                <span className="line-clamp-1 text-[11px] text-[var(--arc-text-muted)]">
                                                    {result.short_description ?? ''}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {filtered.map((result) => (
                                    <EntityCard
                                        key={result.id}
                                        entity={result}
                                        onClick={() => openEntityDossier(result)}
                                        highlightQuery={query}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!loading &&
                    !error &&
                    filtered.length === 0 &&
                    query.trim().length >= 2 && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <Search className="size-8 text-[var(--arc-text-muted)]/20" />
                            <div>
                                <p className="text-sm text-[var(--arc-text-muted)]">
                                    No results found for &ldquo;{query}&rdquo;
                                </p>
                                <p className="arc-mono mt-1.5 text-[10px] text-[var(--arc-text-muted)]/50">
                                    TRY DIFFERENT KEYWORDS OR REMOVE FILTERS
                                </p>
                            </div>
                        </div>
                    )}

                {!loading && query.trim().length < 2 && results.length === 0 && (
                    <div className="flex flex-col items-center gap-4 py-16 text-center">
                        <Terminal className="size-10 text-[var(--arc-text-muted)]/15" />
                        <div>
                            <p className="arc-mono text-[10px] font-medium tracking-[0.2em] text-[var(--arc-text-muted)]/60">
                                SEARCH TERMINAL READY
                            </p>
                            <p className="arc-mono mt-1.5 text-[9px] text-[var(--arc-text-muted)]/40">
                                ENTER AT LEAST 2 CHARACTERS TO QUERY DATABASE
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]/40">
                    SEARCH MODULE v2.0
                </span>
                {activeFilterCount > 0 && (
                    <span className="arc-mono text-[9px] text-[var(--arc-accent)]/60">
                        {activeFilterCount} FILTER{activeFilterCount !== 1 ? 'S' : ''} ACTIVE
                    </span>
                )}
                <span className="arc-mono text-[9px] tabular-nums text-[var(--arc-text-muted)]/40">
                    {filtered.length} RECORDS
                </span>
            </div>
        </div>
    );
}
