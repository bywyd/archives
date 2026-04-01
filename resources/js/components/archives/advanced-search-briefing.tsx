import {
    AlertCircle,
    Brain,
    ExternalLink,
    FileSearch,
    InfoIcon,
    Loader2,
    Network,
    Search,
    Sparkles,
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
    ApiAdvancedSearchResponse,
    ApiAdvancedSearchResult,
    ApiUniverse,
} from '@/types/api';

type Props = {
    universeId?: number;
    initialQuery?: string;
};

//  Main Component 

export function AdvancedSearchBriefing({ universeId, initialQuery }: Props) {
    const [query, setQuery] = useState(initialQuery ?? '');
    const [searchData, setSearchData] = useState<ApiAdvancedSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [universes, setUniverses] = useState<ApiUniverse[]>([]);
    const [selectedUniverse, setSelectedUniverse] = useState<number | null>(universeId ?? null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow } = useWindowStore();

    // Load universes on mount when no universeId provided
    useEffect(() => {
        if (universeId) return;
        api.fetchUniverses()
            .then((res) => {
                setUniverses(res.data);
                if (!selectedUniverse && res.data.length > 0) {
                    setSelectedUniverse(res.data[0].id);
                }
            })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const activeUniverseId = universeId ?? selectedUniverse;

    //  Spawn child windows on successful search 

    const spawnResultWindows = useCallback(
        (data: ApiAdvancedSearchResponse) => {
            if (data.results.length === 0 || !activeUniverseId) return;

            const queryKey = data.query.raw.toLowerCase().replace(/\s+/g, '-').slice(0, 30);

            openWindow({
                type: 'search-briefing',
                title: 'INTEL BRIEFING',
                icon: 'IB',
                props: {
                    key: `briefing-${queryKey}`,
                    briefing: data.briefing,
                    queryRaw: data.query.raw,
                },
                size: { width: 700, height: 500 },
            });

            openWindow({
                type: 'search-subjects',
                title: `SUBJECTS  ${data.results.length} FOUND`,
                icon: 'SF',
                props: {
                    key: `subjects-${queryKey}`,
                    results: data.results,
                    subjectProfiles: data.briefing.subject_profiles,
                    universeId: activeUniverseId,
                },
                size: { width: 850, height: 580 },
            });

            if (data.connections.nodes.length > 0) {
                openWindow({
                    type: 'search-connections',
                    title: 'CONNECTION ANALYSIS',
                    icon: 'CA',
                    props: {
                        key: `connections-${queryKey}`,
                        nodes: data.connections.nodes,
                        edges: data.connections.edges,
                        keyConnections: data.briefing.key_connections,
                        results: data.results,
                        universeId: activeUniverseId,
                    },
                    size: { width: 800, height: 560 },
                });
            }
        },
        [activeUniverseId, openWindow],
    );

    const executeSearch = useCallback(
        async (searchQuery: string) => {
            const trimmed = searchQuery.trim();
            if (trimmed.length < 2 || !activeUniverseId) return;

            setLoading(true);
            setError(null);

            try {
                const data = await api.advancedSearch(activeUniverseId, trimmed, 20);
                setSearchData(data);
                spawnResultWindows(data);
            } catch {
                setError('Intelligence query failed. Verify connection and retry.');
            } finally {
                setLoading(false);
            }
        },
        [activeUniverseId, spawnResultWindows],
    );

    // Execute initial query on mount
    useEffect(() => {
        if (initialQuery && initialQuery.trim().length >= 2 && activeUniverseId) {
            executeSearch(initialQuery);
        }
    }, [activeUniverseId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-focus
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeSearch(query);
        }
    };

    const openDossier = (result: ApiAdvancedSearchResult) => {
        openWindow({
            type: 'entity-dossier',
            title: `${result.name}  DOSSIER`,
            icon: result.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${activeUniverseId}-${result.slug}`,
                universeId: activeUniverseId,
                entitySlug: result.slug,
            },
        });
    };

    const openAllTopDossiers = () => {
        if (!searchData) return;
        searchData.results.slice(0, 3).forEach((r) => openDossier(r));
    };

    return (
        <div className="flex h-full flex-col">
            {/*  Search Bar  */}
            <div className="border-b border-[var(--arc-border)] p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Brain className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-xs font-semibold tracking-[0.2em] text-[var(--arc-accent)]">
                        INTELLIGENCE ANALYSIS ENGINE &#91;BETA&#93;
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    {searchData && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {searchData.total} MATCH{searchData.total !== 1 ? 'ES' : ''}
                        </span>
                    )}
                </div>

                {/* Universe Selector (when no universeId prop) */}
                {!universeId && universes.length > 1 && (
                    <div className="mb-3">
                        <label className="arc-mono mb-1 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                            TARGET UNIVERSE
                        </label>
                        <select
                            value={selectedUniverse ?? ''}
                            onChange={(e) => setSelectedUniverse(Number(e.target.value))}
                            className="arc-mono h-8 w-full border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-xs text-[var(--arc-text)] outline-none focus:border-[var(--arc-accent)]/50"
                        >
                            {universes.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="relative">
                    <FileSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--arc-text-muted)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className={cn(
                            'arc-mono h-10 w-full border bg-[var(--arc-bg)] pl-9 pr-20 text-sm text-[var(--arc-text)] outline-none',
                            'border-[var(--arc-border)] placeholder:text-[var(--arc-text-muted)]/50',
                            'focus:border-[var(--arc-accent)]/50 focus:ring-1 focus:ring-[var(--arc-accent)]/20',
                        )}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        {query && (
                            <button
                                className="p-1 text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                                onClick={() => {
                                    setQuery('');
                                    setSearchData(null);
                                    inputRef.current?.focus();
                                }}
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => executeSearch(query)}
                            disabled={loading || query.trim().length < 2}
                            className={cn(
                                'flex items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wider transition-all',
                                'border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]',
                                'hover:bg-[var(--arc-accent)]/20 disabled:opacity-40',
                            )}
                        >
                            {loading ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                            ANALYZE
                        </button>
                    </div>
                </div>

                {/* Query interpretation */}
                {searchData?.query && !loading && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {searchData.query.intent && (
                            <span className="arc-mono rounded-full border border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[var(--arc-accent)]">
                                INTENT: {searchData.query.intent.toUpperCase()}
                            </span>
                        )}
                        {searchData.query.keywords.map((kw) => (
                            <span
                                key={kw}
                                className="arc-mono rounded-full border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-2 py-0.5 text-[9px] text-[var(--arc-text)]"
                            >
                                {kw}
                            </span>
                        ))}
                        {searchData.query.has_action_context && (
                            <span className="arc-mono rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-500">
                                ACTION DETECTED
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/*  Content  */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="size-8 animate-spin text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[11px] tracking-[0.2em] text-[var(--arc-text-muted)]">
                            ANALYZING INTELLIGENCE DATABASE...
                        </span>
                        <div className="mt-2 h-1 w-48 overflow-hidden bg-[var(--arc-border)]">
                            <div className="h-full animate-pulse bg-[var(--arc-accent)]/60" style={{ width: '60%' }} />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="m-4 flex items-center gap-2 border border-[var(--arc-danger)]/30 bg-[var(--arc-danger)]/10 px-4 py-3 text-sm text-[var(--arc-danger)]">
                        <AlertCircle className="size-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/*  Empty state: no search yet  */}
                {!loading && !error && !searchData && (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                        <div className="flex size-16 items-center justify-center rounded-full border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                            <Brain className="size-8 text-[var(--arc-text-muted)]" />
                        </div>
                        <div>
                            <p className="arc-mono text-xs font-bold tracking-[0.15em] text-[var(--arc-text)]">
                                INTELLIGENCE ANALYSIS ENGINE &#91;BETA&#93;
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--arc-text-muted)]">
                                Enter a natural language query to search across all entities,
                                relations, records, and documents.
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--arc-text-muted)]">
                                Try queries like &quot;what happened at X&quot; or &quot;who is responsible for Y&quot;.
                            </p>
                            <p className='mt-5 text-[10px] italic text-[var(--arc-text-muted)] mx-10'>
                                <InfoIcon className="size-3 inline-block mb-0.5" /> 
                                This feature is not properly completed and may produce inaccurate or incomplete results. It is just a SQL query engine, nothing to do with AI.
                            </p>
                        </div>
                    </div>
                )}

                {/*  No results  */}
                {!loading && !error && searchData && searchData.results.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Search className="size-8 text-[var(--arc-text-muted)]" />
                        <p className="arc-mono text-xs tracking-[0.15em] text-[var(--arc-text-muted)]">
                            NO MATCHING RECORDS FOUND
                        </p>
                        <p className="text-[11px] text-[var(--arc-text-muted)]">
                            Try different keywords or broader search terms.
                        </p>
                    </div>
                )}

                {/*  Result Summary  */}
                {!loading && !error && searchData && searchData.results.length > 0 && (
                    <div className="p-4 space-y-4">
                        {/* Classification + query recap */}
                        <div className="border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <FileSearch className="size-3.5 text-[var(--arc-accent)]" />
                                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                    QUERY RESULTS  {searchData.briefing.classification}
                                </span>
                                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                            </div>
                            <p className="arc-mono text-[10px] text-[var(--arc-text-muted)] mb-1">
                                {searchData.briefing.header}
                            </p>
                            <p className="text-[11px] text-[var(--arc-text)] leading-relaxed">
                                {searchData.briefing.narrative.slice(0, 200)}
                                {searchData.briefing.narrative.length > 200 ? '...' : ''}
                            </p>
                        </div>

                        {/* Quick stats row */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 text-center">
                                <div className="arc-mono text-lg font-bold text-[var(--arc-accent)]">{searchData.total}</div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">MATCHES</div>
                            </div>
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 text-center">
                                <div className="arc-mono text-lg font-bold text-[var(--arc-text)]">{searchData.results[0]?.score ?? 0}</div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">TOP SCORE</div>
                            </div>
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 text-center">
                                <div className="arc-mono text-lg font-bold text-[var(--arc-text)]">{searchData.connections.nodes.length}</div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">NODES</div>
                            </div>
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 text-center">
                                <div className="arc-mono text-lg font-bold text-[var(--arc-text)]">{searchData.connections.edges.length}</div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">LINKS</div>
                            </div>
                        </div>

                        {/* Top subjects preview */}
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <Users className="size-3.5 text-[var(--arc-accent)]" />
                                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                    TOP SUBJECTS
                                </span>
                                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                            </div>
                            <div className="space-y-1.5">
                                {searchData.results.slice(0, 5).map((result, i) => {
                                    const profileImage = result.images.find((img) => img.type === 'profile');
                                    return (
                                        <div
                                            key={result.id}
                                            className="flex items-center gap-3 border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 transition-all hover:border-[var(--arc-accent)]/20 cursor-pointer"
                                            onClick={() => openDossier(result)}
                                        >
                                            <div className="flex size-6 shrink-0 items-center justify-center border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 arc-mono text-[9px] font-bold text-[var(--arc-accent)]">
                                                {i + 1}
                                            </div>
                                            {profileImage ? (
                                                <div className="size-8 shrink-0 overflow-hidden border border-[var(--arc-border)]">
                                                    <img
                                                        src={profileImage.thumbnail_url ?? profileImage.url}
                                                        alt={profileImage.alt_text ?? result.name}
                                                        className="size-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex size-8 shrink-0 items-center justify-center border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                                                    <TypeIcon entityType={result.entity_type as any} size="sm" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-xs font-semibold text-[var(--arc-text)]">
                                                        {result.name}
                                                    </span>
                                                    <StatusBadge status={result.entity_status as any} size="sm" />
                                                    {result.is_featured && <Sparkles className="size-3 text-amber-500" />}
                                                </div>
                                                {result.short_description && (
                                                    <p className="truncate text-[10px] text-[var(--arc-text-muted)]">
                                                        {result.short_description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="arc-mono shrink-0 text-[10px] font-bold" style={{
                                                color: result.score > 100 ? 'var(--arc-accent)' : result.score > 50 ? 'var(--arc-text)' : 'var(--arc-text-muted)',
                                            }}>
                                                {result.score}
                                            </div>
                                            <ExternalLink className="size-3 shrink-0 text-[var(--arc-text-muted)]" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={openAllTopDossiers}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-wider transition-all',
                                    'border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]',
                                    'hover:bg-[var(--arc-accent)]/20',
                                )}
                            >
                                <Sparkles className="size-3.5" />
                                OPEN TOP 3 DOSSIERS
                            </button>
                            <button
                                onClick={() => spawnResultWindows(searchData)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-wider transition-all',
                                    'border border-[var(--arc-border)] bg-[var(--arc-surface)] text-[var(--arc-text-muted)]',
                                    'hover:border-[var(--arc-accent)]/20 hover:text-[var(--arc-text)]',
                                )}
                            >
                                <Network className="size-3.5" />
                                RE-OPEN ANALYSIS WINDOWS
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
