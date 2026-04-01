import {
    BookOpen,
    Clock,
    Compass,
    Film,
    GitBranch,
    Globe,
    History,
    Loader2,
    Percent,
    PlusCircle,
    Search,
    Shield,
    Shuffle,
    Sparkles,
    Tag,
    TrendingUp,
    Users,
    AlertCircle,
    FolderOpen,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EntityCard } from '@/components/archives/entity-card';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiEntity,
    ApiMediaSource,
    ApiTimeline,
    ApiUniverse,
    ApiMetaEntityType,
    ApiCategory,
    ApiTag,
} from '@/types/api';

type Props = {
    universeId: number;
};

export function UniverseDashboard({ universeId }: Props) {
    const [universe, setUniverse] = useState<ApiUniverse | null>(null);
    const [entities, setEntities] = useState<ApiEntity[]>([]);
    const [timelines, setTimelines] = useState<ApiTimeline[]>([]);
    const [mediaSources, setMediaSources] = useState<ApiMediaSource[]>([]);
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [tags, setTags] = useState<ApiTag[]>([]);
    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [recentEntities, setRecentEntities] = useState<ApiEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            api.fetchUniverse(universeId),
            api.fetchEntities(universeId, { featured: true, per_page: 6 }),
            api.fetchTimelines(universeId),
            api.fetchMediaSources(universeId),
            api.fetchEntityTypes(),
            api.fetchTags(),
            api.fetchCategories(universeId),
            api.fetchEntities(universeId, { per_page: 5 }),
        ])
            .then(([uRes, eRes, tRes, mRes, etRes, tagRes, catRes, recentRes]) => {
                if (cancelled) {
                    return;
                }

                setUniverse(uRes.data);
                setEntities(eRes.data);
                setTimelines(tRes.data);
                setMediaSources(mRes.data);
                setEntityTypes(etRes.data);
                setTags(tagRes.data);
                setCategories(catRes.data);
                setRecentEntities(recentRes.data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Failed to load universe');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [universeId]);

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                <div className="text-center">
                    <div className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        LOADING UNIVERSE BRIEFING
                    </div>
                    <div className="arc-mono mt-1 text-[9px] text-[var(--arc-text-muted)]">
                        DECRYPTING CLASSIFIED DATA...
                    </div>
                </div>
            </div>
        );
    }

    if (error || !universe) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <span className="arc-mono text-xs font-medium text-[var(--arc-danger)]">
                    {error || 'UNIVERSE NOT FOUND'}
                </span>
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    ACCESS DENIED OR DATA CORRUPTED
                </span>
            </div>
        );
    }

    const openEntityDossier = (entity: ApiEntity) => {
        openWindow({
            type: 'entity-dossier',
            title: `${entity.name}  DOSSIER`,
            icon: entity.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${entity.slug}`,
                universeId,
                entitySlug: entity.slug,
            },
        });
    };

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Universe Header  classified briefing style */}
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] p-5">
                <div className="flex items-center gap-2">
                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        UNIVERSE BRIEFING
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono rounded border border-[var(--arc-border)] px-1.5 py-0.5 text-[8px] text-[var(--arc-text-muted)]">
                        ID: {universe.id.toString().padStart(4, '0')}
                    </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/8">
                        <Globe className="size-5 text-[var(--arc-accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="arc-heading-accent text-lg font-bold text-[var(--arc-text)]">
                            {universe.name}
                        </h1>
                        {universe.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-[var(--arc-text-muted)]">
                                {universe.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats Row  intelligence summary */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    <StatCard
                        icon={<Users className="size-4" />}
                        label="Entities"
                        value={universe.entities_count ?? entities.length}
                    />
                    <StatCard
                        icon={<Shield className="size-4" />}
                        label="Types"
                        value={entityTypes.length}
                    />
                    <StatCard
                        icon={<Clock className="size-4" />}
                        label="Timelines"
                        value={timelines.length}
                    />
                    <StatCard
                        icon={<Film className="size-4" />}
                        label="Media"
                        value={mediaSources.length}
                    />
                    <StatCard
                        icon={<Tag className="size-4" />}
                        label="Tags"
                        value={tags.length}
                    />
                    <StatCard
                        icon={<FolderOpen className="size-4" />}
                        label="Categories"
                        value={categories.length}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--arc-border)] px-4 py-2">
                <span className="arc-mono mr-1 text-[8px] tracking-[0.15em] text-[var(--arc-text-muted)]">ACTIONS:</span>
                <button
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-accent)]/40 bg-[var(--arc-accent)]/8 px-3 py-1.5 text-xs font-medium text-[var(--arc-accent)] transition-all hover:border-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/15"
                    onClick={() =>
                        openWindow({
                            type: 'search',
                            title: `SEARCH  ${universe.name}`,
                            icon: 'SR',
                            props: { universeId },
                        })
                    }
                >
                    <Search className="size-3.5" />
                    Search
                </button>
                <button
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-1.5 text-xs font-medium text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                    onClick={() =>
                        openWindow({
                            type: 'entity-list',
                            title: `${universe.name}  ALL ENTITIES`,
                            icon: 'EL',
                            props: {
                                key: `entities-${universeId}-all`,
                                universeId,
                            },
                        })
                    }
                >
                    <Users className="size-3.5" />
                    All Entities
                </button>
                <button
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-1.5 text-xs font-medium text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                    onClick={() =>
                        openWindow({
                            type: 'media-sources',
                            title: `${universe.name}  MEDIA`,
                            icon: 'MS',
                            props: {
                                key: `media-${universeId}`,
                                universeId,
                            },
                        })
                    }
                >
                    <Film className="size-3.5" />
                    Media Sources
                </button>
                <button
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-1.5 text-xs font-medium text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                    onClick={() =>
                        openWindow({
                            type: 'discovery',
                            title: `DISCOVER  ${universe.name}`,
                            icon: '🎲',
                            props: {
                                key: `discovery-${universeId}`,
                                universeId,
                            },
                        })
                    }
                >
                    <Shuffle className="size-3.5" />
                    Discover
                </button>
                <button
                    className="flex items-center gap-1.5 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-1.5 text-xs font-medium text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                    onClick={() =>
                        openWindow({
                            type: 'recently-viewed',
                            title: `HISTORY  ${universe.name}`,
                            icon: '📜',
                            props: {
                                key: `history-${universeId}`,
                                universeId,
                            },
                        })
                    }
                >
                    <History className="size-3.5" />
                    History
                </button>
                <div className="mx-1 h-5 w-px bg-[var(--arc-border)]" />
                <button
                    className="flex items-center gap-1.5 border border-[var(--arc-success)]/40 bg-[var(--arc-success)]/8 px-3 py-1.5 text-xs font-medium text-[var(--arc-success)] transition-all hover:border-[var(--arc-success)] hover:bg-[var(--arc-success)]/15"
                    onClick={() =>
                        openWindow({
                            type: 'entity-editor',
                            title: `NEW ENTITY  ${universe.name}`,
                            icon: 'NE',
                            props: {
                                key: `new-entity-${universeId}-${Date.now()}`,
                                universeId,
                            },
                        })
                    }
                >
                    <PlusCircle className="size-3.5" />
                    New Entity
                </button>
                <button
                    className="flex items-center gap-1.5 border border-[var(--arc-success)]/40 bg-[var(--arc-success)]/8 px-3 py-1.5 text-xs font-medium text-[var(--arc-success)] transition-all hover:border-[var(--arc-success)] hover:bg-[var(--arc-success)]/15"
                    onClick={() =>
                        openWindow({
                            type: 'timeline-editor',
                            title: `NEW TIMELINE  ${universe.name}`,
                            icon: 'TL',
                            props: {
                                key: `new-timeline-${universeId}-${Date.now()}`,
                                universeId,
                            },
                        })
                    }
                >
                    <PlusCircle className="size-3.5" />
                    New Timeline
                </button>
                <button
                    className="flex items-center gap-1.5 border border-[var(--arc-success)]/40 bg-[var(--arc-success)]/8 px-3 py-1.5 text-xs font-medium text-[var(--arc-success)] transition-all hover:border-[var(--arc-success)] hover:bg-[var(--arc-success)]/15"
                    onClick={() =>
                        openWindow({
                            type: 'media-source-editor',
                            title: `NEW MEDIA SOURCE  ${universe.name}`,
                            icon: 'MS',
                            props: {
                                key: `new-media-${universeId}-${Date.now()}`,
                                universeId,
                            },
                        })
                    }
                >
                    <PlusCircle className="size-3.5" />
                    New Media
                </button>
            </div>

            <div className="flex-1 space-y-5 p-4">
                {/* Entity Types Breakdown with Visual Chart */}
                {entityTypes.length > 0 && (
                    <DashboardSection title="ENTITY TYPE BREAKDOWN" icon={<Shield className="size-3" />}>
                        <div className="mb-4 space-y-2">
                            {/* Bar chart visualization */}
                            {entityTypes.slice(0, 8).map((et) => {
                                const totalEntities = universe.entities_count ?? entities.length;
                                const typeCount = et.entities_count ?? 0;
                                const percentage = totalEntities > 0 ? (typeCount / totalEntities) * 100 : 0;
                                return (
                                    <button
                                        key={et.id}
                                        className="group flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition-all hover:bg-[var(--arc-surface-hover)]"
                                        onClick={() =>
                                            openWindow({
                                                type: 'entity-list',
                                                title: `${universe.name} > ${et.name.toUpperCase()}`,
                                                icon: 'EL',
                                                props: {
                                                    key: `entities-${universeId}-${et.slug}`,
                                                    universeId,
                                                    typeSlug: et.slug,
                                                },
                                            })
                                        }
                                    >
                                        <TypeIcon entityType={et} size="sm" />
                                        <span className="w-24 truncate text-[11px] font-medium text-[var(--arc-text)] group-hover:text-[var(--arc-accent)]">
                                            {et.name}
                                        </span>
                                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--arc-surface-alt)]">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.max(percentage, 2)}%`,
                                                    backgroundColor: et.color ?? 'var(--arc-accent)',
                                                }}
                                            />
                                        </div>
                                        <span className="arc-mono w-10 text-right text-[9px] text-[var(--arc-text-muted)]">
                                            {typeCount}
                                        </span>
                                        <span className="arc-mono w-12 text-right text-[8px] text-[var(--arc-text-muted)]">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {/* Type Grid */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {entityTypes.map((et) => (
                                <button
                                    key={et.id}
                                    className="arc-card-hover flex items-center gap-2 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2 text-left transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]"
                                    onClick={() =>
                                        openWindow({
                                            type: 'entity-list',
                                            title: `${universe.name} > ${et.name.toUpperCase()}`,
                                            icon: 'EL',
                                            props: {
                                                key: `entities-${universeId}-${et.slug}`,
                                                universeId,
                                                typeSlug: et.slug,
                                            },
                                        })
                                    }
                                >
                                    <TypeIcon entityType={et} size="sm" />
                                    <span className="flex-1 truncate text-[11px] font-medium text-[var(--arc-text)]">
                                        {et.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </DashboardSection>
                )}

                {/* Featured Entities  data table */}
                {entities.length > 0 && (
                    <DashboardSection title="PRIORITY SUBJECTS" icon={<Shield className="size-3" />}>
                        <table className="arc-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Classification</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entities.map((entity) => (
                                    <tr
                                        key={entity.id}
                                        className="cursor-pointer"
                                        onClick={() => openEntityDossier(entity)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <TypeIcon entityType={entity.entity_type} size="sm" />
                                                <div>
                                                    <span className="text-xs font-medium text-[var(--arc-text)]">
                                                        {entity.name}
                                                    </span>
                                                    {entity.short_description && (
                                                        <p className="line-clamp-1 text-[10px] text-[var(--arc-text-muted)]">
                                                            {entity.short_description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                                {entity.entity_type?.name ?? ''}
                                            </span>
                                        </td>
                                        <td>
                                            <StatusBadge status={entity.entity_status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DashboardSection>
                )}

                {/* Recent Entities */}
                {recentEntities.length > 0 && (
                    <DashboardSection title="RECENT ENTRIES" icon={<BookOpen className="size-3" />}>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {recentEntities.map((entity) => (
                                <EntityCard
                                    key={entity.id}
                                    entity={entity}
                                    compact
                                    onClick={() => openEntityDossier(entity)}
                                />
                            ))}
                        </div>
                    </DashboardSection>
                )}

                {/* Timelines */}
                {timelines.length > 0 && (
                    <DashboardSection title="TIMELINES" icon={<Clock className="size-3" />}>
                        <div className="grid gap-2">
                            {timelines.map((tl) => (
                                <button
                                    key={tl.id}
                                    className="arc-card-hover flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3 text-left transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]"
                                    onClick={() =>
                                        openWindow({
                                            type: 'timeline',
                                            title: `${tl.name}  TIMELINE`,
                                            icon: 'TL',
                                            props: {
                                                key: `timeline-${universeId}-${tl.id}`,
                                                universeId,
                                                timelineId: tl.id,
                                            },
                                        })
                                    }
                                >
                                    <Clock className="size-4 shrink-0 text-[var(--arc-accent)]" />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-xs font-medium text-[var(--arc-text)]">
                                            {tl.name}
                                        </span>
                                        {tl.description && (
                                            <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--arc-text-muted)]">
                                                {tl.description}
                                            </p>
                                        )}
                                    </div>
                                    {tl.entities_count != null && (
                                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                            {tl.entities_count} EVENTS
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </DashboardSection>
                )}

                {/* Tags & Categories side-by-side */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {tags.length > 0 && (
                        <DashboardSection title="TAGS" icon={<Tag className="size-3" />}>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                            color: tag.color ?? 'var(--arc-text-muted)',
                                            backgroundColor: `${tag.color ?? '#6B7280'}12`,
                                            borderWidth: 1,
                                            borderColor: `${tag.color ?? '#6B7280'}25`,
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </DashboardSection>
                    )}

                    {categories.length > 0 && (
                        <DashboardSection title="CATEGORIES" icon={<FolderOpen className="size-3" />}>
                            <div className="space-y-1">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs text-[var(--arc-text)]">
                                        <FolderOpen className="size-3 text-[var(--arc-text-muted)]" />
                                        {cat.name}
                                        {cat.children && cat.children.length > 0 && (
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                ({cat.children.length} sub)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </DashboardSection>
                    )}
                </div>

                {/* Media Sources Table */}
                {mediaSources.length > 0 && (
                    <DashboardSection title="MEDIA SOURCES" icon={<Film className="size-3" />}>
                        <table className="arc-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Release</th>
                                    <th>Entities</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mediaSources.map((ms) => (
                                    <tr key={ms.id}>
                                        <td className="text-xs font-medium text-[var(--arc-text)]">{ms.name}</td>
                                        <td>
                                            <span className="arc-mono rounded border border-[var(--arc-border)] px-1 py-0.5 text-[8px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                                                {ms.media_type}
                                            </span>
                                        </td>
                                        <td className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                            {ms.release_date ?? ''}
                                        </td>
                                        <td className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                            {ms.entities_count ?? ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DashboardSection>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div className="arc-card-hover rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2.5">
            <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded bg-[var(--arc-accent)]/8 text-[var(--arc-accent)]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="arc-mono text-xl font-bold tabular-nums text-[var(--arc-text)]">
                        {value}
                    </div>
                    <div className="arc-mono -mt-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--arc-text-muted)]">
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardSection({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="arc-animate-slide-up">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded bg-[var(--arc-accent)]/8 text-[var(--arc-accent)]">{icon}</span>
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    {title}
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
            </div>
            {children}
        </div>
    );
}
