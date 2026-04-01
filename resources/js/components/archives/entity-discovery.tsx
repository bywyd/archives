import {
    Compass,
    Dices,
    Filter,
    Loader2,
    Sparkles,
    Target,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EntityCard } from '@/components/archives/entity-card';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, ApiMetaEntityType, ApiUniverse } from '@/types/api';

type Props = {
    universeId?: number;
};

type DiscoveryMode = 'random' | 'featured' | 'related' | 'type';

export function EntityDiscovery({ universeId }: Props) {
    const [mode, setMode] = useState<DiscoveryMode>('random');
    const [entities, setEntities] = useState<ApiEntity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [universes, setUniverses] = useState<ApiUniverse[]>([]);
    const [selectedUniverse, setSelectedUniverse] = useState<number | null>(universeId ?? null);
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const { openWindow } = useWindowStore();

    // Load universes and entity types on mount
    useEffect(() => {
        Promise.all([api.fetchUniverses(), api.fetchEntityTypes()])
            .then(([uRes, etRes]) => {
                setUniverses(uRes.data);
                setEntityTypes(etRes.data);
                if (!selectedUniverse && uRes.data.length > 0) {
                    setSelectedUniverse(uRes.data[0].id);
                }
            })
            .catch(() => {});
    }, [selectedUniverse]);

    const discover = useCallback(async () => {
        if (!selectedUniverse) return;

        setLoading(true);
        setError(null);

        try {
            let params: api.FetchEntitiesParams = { per_page: 6 };

            switch (mode) {
                case 'random':
                    // Fetch random by requesting a random page and shuffle
                    const totalRes = await api.fetchEntities(selectedUniverse, { per_page: 1 });
                    const totalPages = totalRes.meta.last_page;
                    const randomPage = Math.floor(Math.random() * totalPages) + 1;
                    params = { ...params, page: randomPage };
                    break;
                case 'featured':
                    params = { ...params, featured: true };
                    break;
                case 'type':
                    if (selectedType) {
                        params = { ...params, type: selectedType };
                    }
                    break;
            }

            const res = await api.fetchEntities(selectedUniverse, params);
            // Shuffle for random mode
            if (mode === 'random') {
                setEntities(shuffleArray(res.data));
            } else {
                setEntities(res.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to discover entities');
        } finally {
            setLoading(false);
        }
    }, [selectedUniverse, mode, selectedType]);

    // Auto-discover on mount and when params change
    useEffect(() => {
        if (selectedUniverse) {
            discover();
        }
    }, [selectedUniverse, mode, selectedType, discover]);

    const openEntityDossier = (entity: ApiEntity) => {
        openWindow({
            type: 'entity-dossier',
            title: `${entity.name}  DOSSIER`,
            icon: entity.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${selectedUniverse}-${entity.slug}`,
                universeId: selectedUniverse,
                entitySlug: entity.slug,
            },
        });
    };

    const modes: { id: DiscoveryMode; label: string; icon: React.ReactNode; description: string }[] = [
        { id: 'random', label: 'Random', icon: <Dices className="size-3.5" />, description: 'Discover random entities' },
        { id: 'featured', label: 'Priority', icon: <Sparkles className="size-3.5" />, description: 'Featured & important entities' },
        { id: 'type', label: 'By Type', icon: <Filter className="size-3.5" />, description: 'Filter by entity type' },
    ];

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] p-4">
                <div className="flex items-center gap-2">
                    <Compass className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        DISCOVERY MODE
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                </div>

                {/* Universe Selector */}
                {!universeId && universes.length > 1 && (
                    <div className="mt-3">
                        <label className="arc-mono mb-1 block text-[8px] font-semibold tracking-wide text-[var(--arc-text-muted)]">
                            UNIVERSE
                        </label>
                        <select
                            value={selectedUniverse ?? ''}
                            onChange={(e) => setSelectedUniverse(Number(e.target.value))}
                            className="arc-mono h-8 w-full rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-xs text-[var(--arc-text)] outline-none focus:border-[var(--arc-accent)]/50"
                        >
                            {universes.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Mode Selector */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition-all',
                                mode === m.id
                                    ? 'border-[var(--arc-accent)]/40 bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                    : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/20 hover:bg-[var(--arc-surface-hover)]'
                            )}
                            title={m.description}
                        >
                            {m.icon}
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Type Filter (when mode is 'type') */}
                {mode === 'type' && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {entityTypes.map((et) => (
                            <button
                                key={et.slug}
                                onClick={() => setSelectedType(selectedType === et.slug ? null : et.slug)}
                                className={cn(
                                    'flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-medium transition-all',
                                    selectedType === et.slug
                                        ? 'border-[var(--arc-accent)]/30 text-[var(--arc-text)]'
                                        : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/20'
                                )}
                                style={
                                    selectedType === et.slug
                                        ? { backgroundColor: `${et.color}20` }
                                        : undefined
                                }
                            >
                                <TypeIcon entityType={et} size="sm" />
                                {et.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Refresh Button */}
                <button
                    onClick={discover}
                    disabled={loading || !selectedUniverse}
                    className={cn(
                        'mt-3 flex w-full items-center justify-center gap-2 rounded border border-[var(--arc-accent)]/40 bg-[var(--arc-accent)]/8 px-4 py-2 text-xs font-medium text-[var(--arc-accent)] transition-all',
                        'hover:border-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/15',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                >
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <>
                            <Zap className="size-4" />
                            {mode === 'random' ? 'Discover New' : 'Refresh'}
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && entities.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                        <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                            SCANNING DATABASE...
                        </span>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                        <Target className="size-8 text-[var(--arc-danger)]/50" />
                        <p className="text-xs text-[var(--arc-danger)]">{error}</p>
                    </div>
                )}

                {!loading && !error && entities.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <Compass className="size-8 text-[var(--arc-text-muted)]/30" />
                        <p className="text-sm text-[var(--arc-text-muted)]">No entities found</p>
                        <p className="arc-mono text-[9px] text-[var(--arc-text-muted)]/50">
                            Try different filters
                        </p>
                    </div>
                )}

                {entities.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {entities.map((entity, idx) => (
                            <div
                                key={entity.id}
                                className="arc-animate-in"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <EntityCard
                                    entity={entity}
                                    onClick={() => openEntityDossier(entity)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Utility function to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
