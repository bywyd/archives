import {
    Brain,
    ChevronRight,
    Clapperboard,
    Clock,
    Film,
    FolderClosed,
    FolderOpen,
    FolderTree,
    Gamepad2,
    Globe,
    LayoutGrid,
    Layers,
    MonitorPlay,
    Search,
    Tv,
    BookOpen,
    RefreshCw,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AgentBadge } from '@/components/archives/agent-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import { useArchive } from '@/contexts/archive-context';
import type { ApiSidebarTree } from '@/types/api';
import AppLogoIcon from '../app-logo-icon';

type SectionKey = 'entities' | 'timelines' | 'categories' | 'media';

const MEDIA_TYPE_ICONS: Record<string, ReactNode> = {
    game: <Gamepad2 className="size-3" />,
    movie: <Film className="size-3" />,
    tv: <Tv className="size-3" />,
    series: <MonitorPlay className="size-3" />,
    book: <BookOpen className="size-3" />,
};

function getMediaIcon(type: string): ReactNode {
    return MEDIA_TYPE_ICONS[type.toLowerCase()] ?? <Clapperboard className="size-3" />;
}

export function UniverseSidebar({ appName, appLogo }: { appName: string; appLogo?: string }) {
    const { currentUniverse } = useArchive();
    const [treeData, setTreeData] = useState<Record<number, ApiSidebarTree>>({});
    const [treeLoading, setTreeLoading] = useState(false);
    const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
    const { openWindow } = useWindowStore();

    // Auto-fetch sidebar tree when the universe is available
    useEffect(() => {
        if (!currentUniverse) return;
        const id = currentUniverse.id;
        if (treeData[id]) return;

        setTreeLoading(true);
        api.fetchSidebarTree(id)
            .then((res) => setTreeData((prev) => ({ ...prev, [id]: res.data })))
            .catch(() => {})
            .finally(() => setTreeLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUniverse?.id]);

    const refreshTree = () => {
        if (!currentUniverse) return;
        const id = currentUniverse.id;
        setTreeLoading(true);
        api.fetchSidebarTree(id)
            .then((res) => setTreeData((prev) => ({ ...prev, [id]: res.data })))
            .catch(() => {})
            .finally(() => setTreeLoading(false));
    };

    const toggleSection = (universeId: number, section: SectionKey) => {
        const key = `${universeId}-${section}`;
        setClosedSections((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const isSectionOpen = (universeId: number, section: SectionKey) =>
        !closedSections.has(`${universeId}-${section}`);

    const toggleCategory = (id: number) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const openUniverseDashboard = () => {
        if (!currentUniverse) return;
        openWindow({
            type: 'universe-dashboard',
            title: `${currentUniverse.name} – DASHBOARD`,
            icon: 'UV',
            props: { key: `universe-${currentUniverse.id}`, universeId: currentUniverse.id },
        });
    };

    const openEntityList = (
        opts?: { typeSlug?: string; categorySlug?: string; label?: string },
    ) => {
        if (!currentUniverse) return;
        const { id: universeId, name: universeName } = currentUniverse;
        const keyParts: string[] = [String(universeId)];
        let titleSuffix = 'ENTITIES';
        if (opts?.typeSlug) {
            keyParts.push('type', opts.typeSlug);
            titleSuffix = opts.typeSlug.toUpperCase();
        } else if (opts?.categorySlug) {
            keyParts.push('cat', opts.categorySlug);
            titleSuffix = (opts.label ?? opts.categorySlug).toUpperCase();
        }
        openWindow({
            type: 'entity-list',
            title: `${universeName} > ${titleSuffix}`,
            icon: 'EL',
            props: {
                key: `entities-${keyParts.join('-')}`,
                universeId,
                typeSlug: opts?.typeSlug,
                categorySlug: opts?.categorySlug,
            },
        });
    };

    const openTimeline = (timelineId: number, timelineName: string) => {
        if (!currentUniverse) return;
        openWindow({
            type: 'timeline',
            title: timelineName.toUpperCase(),
            icon: 'TL',
            props: {
                key: `timeline-${currentUniverse.id}-${timelineId}`,
                universeId: currentUniverse.id,
                timelineId,
            },
        });
    };

    const openMediaSources = () => {
        if (!currentUniverse) return;
        openWindow({
            type: 'media-sources',
            title: `${currentUniverse.name} – MEDIA`,
            icon: 'MS',
            props: { key: `media-${currentUniverse.id}`, universeId: currentUniverse.id },
        });
    };

    const openAdvancedSearch = () => {
        if (!currentUniverse) return;
        openWindow({
            type: 'advanced-search',
            title: `${currentUniverse.name} – INTELLIGENCE ANALYSIS`,
            icon: 'IA',
            props: { key: `advsearch-${currentUniverse.id}`, universeId: currentUniverse.id },
            size: { width: 960, height: 700 },
        });
    };

    const openMediaSourceDetail = (
        mediaSourceId: number,
        mediaSourceName: string,
        mediaType: string,
    ) => {
        if (!currentUniverse) return;
        openWindow({
            type: 'media-source-detail',
            title: mediaSourceName.toUpperCase(),
            icon: 'MD',
            props: {
                key: `media-detail-${currentUniverse.id}-${mediaSourceId}`,
                universeId: currentUniverse.id,
                mediaSourceId,
                mediaType,
            },
        });
    };

    const tree = currentUniverse ? treeData[currentUniverse.id] : undefined;

    return (
        <div className="flex h-full flex-col border-r border-[var(--arc-sidebar-border)] bg-[var(--arc-sidebar-bg)]">

            {/* ── Header ── */}
            <div className="flex items-center gap-2 border-b border-[var(--arc-sidebar-border)] px-3 py-2.5">
                <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
                    {appLogo
                        ? <img src={appLogo} alt={appName + ' Logo'} className="size-6 shrink-0" />
                        : <AppLogoIcon className="size-6 shrink-0 text-[var(--arc-sidebar-accent)]" />
                    }
                    <div className="min-w-0 flex-1">
                        <div className="arc-mono truncate text-[10px] font-bold tracking-[0.18em] text-[var(--arc-sidebar-accent)] uppercase">
                            {appName}
                        </div>
                        <div className="arc-mono text-[7px] tracking-[0.14em] text-[var(--arc-sidebar-text-muted)]/40 uppercase">
                            Intelligence Database
                        </div>
                    </div>
                </Link>
                <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                        onClick={() => router.visit('/archives')}
                        title="Switch Universe"
                        icon={<LayoutGrid className="size-3.5" />}
                    />
                    <IconButton
                        onClick={() => openWindow({ type: 'search', title: 'SEARCH TERMINAL', icon: 'SR' })}
                        title="Search (Ctrl+K)"
                        icon={<Search className="size-3.5" />}
                    />
                </div>
            </div>

            {/* ── Tree ── */}
            <div className="flex-1 overflow-y-auto sidebar-scroll">

                {/* No universe */}
                {!currentUniverse && (
                    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10">
                        <div className="flex size-10 items-center justify-center rounded-none border border-[var(--arc-sidebar-border)] bg-[var(--arc-sidebar-hover)]">
                            <Globe className="size-4 text-[var(--arc-sidebar-text-muted)]/40" />
                        </div>
                        <div className="text-center">
                            <p className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-sidebar-text-muted)]/50 uppercase">No Active Theater</p>
                            <p className="mt-0.5 arc-mono text-[8px] text-[var(--arc-sidebar-text-muted)]/30">Select a universe to begin</p>
                        </div>
                        <button
                            className="arc-mono mt-1 rounded-none border border-[var(--arc-sidebar-accent)]/20 bg-[var(--arc-sidebar-accent)]/8 px-3 py-1 text-[9px] tracking-[0.12em] text-[var(--arc-sidebar-accent)]/70 uppercase transition-colors hover:bg-[var(--arc-sidebar-accent)]/15 hover:text-[var(--arc-sidebar-accent)]"
                            onClick={() => router.visit('/archives')}
                        >
                            Browse Universes
                        </button>
                    </div>
                )}

                {currentUniverse && (
                    <div className="py-2">

                        {/* ── Active Universe ── */}
                        <div className="px-2 pb-1.5">
                            <button
                                className="group flex w-full items-center gap-2 rounded-none border border-[var(--arc-sidebar-accent)]/15 bg-[var(--arc-sidebar-accent)]/8 px-2.5 py-2 text-left transition-all hover:border-[var(--arc-sidebar-accent)]/25 hover:bg-[var(--arc-sidebar-accent)]/12"
                                onClick={openUniverseDashboard}
                                style={{ borderLeftWidth: 3, borderLeftColor: 'var(--arc-sidebar-accent)' }}
                            >
                                <Globe className="size-3.5 shrink-0 text-[var(--arc-sidebar-accent)]" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] font-semibold text-[var(--arc-sidebar-text)] leading-tight">
                                        {currentUniverse.name}
                                    </div>
                                    <div className="arc-mono text-[7.5px] text-[var(--arc-sidebar-text-muted)]/50 tracking-wide">
                                        ACTIVE THEATER
                                    </div>
                                </div>
                                {currentUniverse.entities_count != null && (
                                    <span className="arc-mono shrink-0 rounded-none border border-[var(--arc-sidebar-border)] px-1.5 py-0.5 text-[8px] tabular-nums text-[var(--arc-sidebar-text-muted)]/50">
                                        {currentUniverse.entities_count}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* ── Sub-tree ── */}
                        <div className="relative ml-[11px] pl-[13px]">
                            {/* Tree guide line */}
                            <div
                                className="absolute inset-y-0 left-[11px] w-px"
                                style={{ background: 'linear-gradient(to bottom, rgba(59,130,246,0.25), rgba(59,130,246,0.06) 80%, transparent)' }}
                            />

                            {/* Loading skeletons */}
                            {treeLoading && !tree && (
                                <div className="arc-stagger space-y-1 py-2 pr-2">
                                    {[80, 60, 72, 55, 65].map((w, i) => (
                                        <div
                                            key={i}
                                            className="h-6 animate-pulse rounded"
                                            style={{ width: `${w}%`, background: 'rgba(59,130,246,0.06)' }}
                                        />
                                    ))}
                                </div>
                            )}

                            {tree && (
                                <div className="arc-stagger space-y-px py-1 pr-1">

                                    {/* Intelligence Analysis */}
                                    <TreeLeaf
                                        icon={<Brain className="size-3 text-[var(--arc-sidebar-accent)]/70" />}
                                        label="Intelligence Analysis"
                                        onClick={openAdvancedSearch}
                                        accent
                                    />

                                    {/* ── ENTITIES ── */}
                                    <SectionHeader
                                        icon={<Layers className="size-3" />}
                                        label="Entities"
                                        count={tree.total_entities}
                                        isOpen={isSectionOpen(currentUniverse.id, 'entities')}
                                        onToggle={() => toggleSection(currentUniverse.id, 'entities')}
                                    />
                                    {isSectionOpen(currentUniverse.id, 'entities') && (
                                        <div className="relative ml-2 space-y-px pl-2.5 pb-1">
                                            <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/60" />
                                            <TreeLeaf
                                                label="All Entities"
                                                onClick={() => openEntityList()}
                                            />
                                            {tree.entity_types.map((et) => (
                                                <TreeLeaf
                                                    key={et.id}
                                                    icon={<TypeIcon entityType={et} size="sm" />}
                                                    label={et.name}
                                                    count={et.entities_count}
                                                    dimIfZero
                                                    onClick={() => openEntityList({ typeSlug: et.slug })}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* ── TIMELINES ── */}
                                    {tree.timelines.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<Clock className="size-3" />}
                                                label="Timelines"
                                                count={tree.timelines.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'timelines')}
                                                onToggle={() => toggleSection(currentUniverse.id, 'timelines')}
                                            />
                                            {isSectionOpen(currentUniverse.id, 'timelines') && (
                                                <div className="relative ml-2 space-y-px pl-2.5 pb-1">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/60" />
                                                    {tree.timelines.map((tl) => (
                                                        <TreeLeaf
                                                            key={tl.id}
                                                            icon={<Clock className="size-3 text-[var(--arc-sidebar-text-muted)]/40" />}
                                                            label={tl.name}
                                                            count={tl.entities_count}
                                                            onClick={() => openTimeline(tl.id, tl.name)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ── CATEGORIES ── */}
                                    {tree?.categories?.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<FolderTree className="size-3" />}
                                                label="Categories"
                                                count={tree.categories.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'categories')}
                                                onToggle={() => toggleSection(currentUniverse.id, 'categories')}
                                            />
                                            {isSectionOpen(currentUniverse.id, 'categories') && (
                                                <div className="relative ml-2 space-y-px pl-2.5 pb-1">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/60" />
                                                    {tree.categories.map((cat) => (
                                                        <div key={cat.id}>
                                                            <div className="flex items-center">
                                                                {cat.children.length > 0 ? (
                                                                    <button
                                                                        className="flex size-4 shrink-0 items-center justify-center rounded-none text-[var(--arc-sidebar-text-muted)]/50 transition-colors hover:text-[var(--arc-sidebar-text)]"
                                                                        onClick={() => toggleCategory(cat.id)}
                                                                        aria-label={expandedCategories.has(cat.id) ? 'Collapse' : 'Expand'}
                                                                    >
                                                                        <ChevronRight className="arc-chevron size-2.5" data-open={expandedCategories.has(cat.id)} />
                                                                    </button>
                                                                ) : (
                                                                    <span className="size-4 shrink-0" />
                                                                )}
                                                                <TreeLeaf
                                                                    icon={expandedCategories.has(cat.id)
                                                                        ? <FolderOpen className="size-3 text-[var(--arc-sidebar-accent)]/60" />
                                                                        : <FolderClosed className="size-3 text-[var(--arc-sidebar-text-muted)]/40" />
                                                                    }
                                                                    label={cat.name}
                                                                    className="flex-1"
                                                                    onClick={() => openEntityList({ categorySlug: cat.slug, label: cat.name })}
                                                                />
                                                            </div>
                                                            {expandedCategories.has(cat.id) && cat.children.length > 0 && (
                                                                <div className="relative ml-5 space-y-px pl-2.5">
                                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/40" />
                                                                    {cat.children.map((child) => (
                                                                        <TreeLeaf
                                                                            key={child.id}
                                                                            icon={<FolderClosed className="size-2.5 text-[var(--arc-sidebar-text-muted)]/30" />}
                                                                            label={child.name}
                                                                            onClick={() => openEntityList({ categorySlug: child.slug, label: child.name })}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ── MEDIA SOURCES ── */}
                                    {tree.media_sources.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<Clapperboard className="size-3" />}
                                                label="Media"
                                                count={tree.media_sources.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'media')}
                                                onToggle={() => toggleSection(currentUniverse.id, 'media')}
                                            />
                                            {isSectionOpen(currentUniverse.id, 'media') && (
                                                <div className="relative ml-2 space-y-px pl-2.5 pb-1">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/60" />
                                                    <TreeLeaf
                                                        label="All Media Sources"
                                                        icon={<Clapperboard className="size-3 text-[var(--arc-sidebar-text-muted)]/40" />}
                                                        onClick={openMediaSources}
                                                    />
                                                    {tree.media_sources.map((ms) => (
                                                        <TreeLeaf
                                                            key={ms.id}
                                                            icon={<span className="text-[var(--arc-sidebar-text-muted)]/40">{getMediaIcon(ms.media_type)}</span>}
                                                            label={ms.name}
                                                            badge={ms.media_type}
                                                            count={ms.entities_count}
                                                            onClick={() => openMediaSourceDetail(ms.id, ms.name, ms.media_type)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Status bar ── */}
            <div
                className="flex items-center justify-between border-t border-[var(--arc-sidebar-border)] px-3 py-1.5"
                style={{ background: 'rgba(15,23,42,0.6)' }}
            >
                <span className="arc-mono truncate text-[8px] tracking-[0.12em] text-[var(--arc-sidebar-text-muted)]/40 uppercase">
                    {currentUniverse?.name ?? 'No Universe'}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                    {currentUniverse && (
                        <button
                            className="text-[var(--arc-sidebar-text-muted)]/30 transition-colors hover:text-[var(--arc-sidebar-text-muted)]/70"
                            onClick={refreshTree}
                            title="Refresh tree"
                        >
                            <RefreshCw className={cn('size-2.5', treeLoading && 'animate-spin')} />
                        </button>
                    )}
                    <span
                        className={cn('size-1.5 rounded-full', currentUniverse ? 'bg-green-500/60' : 'bg-[var(--arc-sidebar-text-muted)]/20')}
                        title={currentUniverse ? 'Connected' : 'Idle'}
                    />
                </div>
            </div>

            {/* ── Agent badge ── */}
            <AgentBadge />
        </div>
    );
}

function IconButton({ icon, onClick, title }: { icon: ReactNode; onClick: () => void; title?: string }) {
    return (
        <button
            className="flex size-7 items-center justify-center rounded-none text-[var(--arc-sidebar-text-muted)]/60 transition-colors hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-accent)]"
            onClick={onClick}
            title={title}
        >
            {icon}
        </button>
    );
}

function SectionHeader({
    icon,
    label,
    count,
    isOpen,
    onToggle,
}: {
    icon: ReactNode;
    label: string;
    count?: number;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            className={cn(
                'flex w-full items-center gap-1.5 rounded-none px-2 py-1 text-left transition-colors mt-1',
                isOpen
                    ? 'text-[var(--arc-sidebar-text)]/70'
                    : 'text-[var(--arc-sidebar-text-muted)]/50 hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-text-muted)]/80',
            )}
            onClick={onToggle}
        >
            <ChevronRight
                className="arc-chevron size-2.5 shrink-0"
                style={{ color: isOpen ? 'var(--arc-sidebar-accent)' : undefined, opacity: isOpen ? 0.7 : 0.4 }}
                data-open={isOpen}
            />
            <span className={cn('shrink-0 transition-colors', isOpen ? 'text-[var(--arc-sidebar-accent)]/70' : '')}>
                {icon}
            </span>
            <span className="arc-mono flex-1 text-[9px] font-semibold tracking-[0.1em] uppercase">
                {label}
            </span>
            {count !== undefined && (
                <span className="arc-mono rounded-none px-1.5 py-0.5 text-[7.5px] tabular-nums" style={{ color: 'rgba(100,116,139,0.45)' }}>
                    {count}
                </span>
            )}
        </button>
    );
}

function TreeLeaf({
    icon,
    label,
    count,
    badge,
    dimIfZero,
    accent,
    className,
    onClick,
}: {
    icon?: ReactNode;
    label: string;
    count?: number;
    badge?: string;
    dimIfZero?: boolean;
    accent?: boolean;
    className?: string;
    onClick: () => void;
}) {
    const isDim = dimIfZero && count === 0;

    return (
        <button
            className={cn(
                'group/leaf flex w-full items-center gap-1.5 rounded-none px-2 py-1.5 text-left text-[11px] transition-all',
                isDim
                    ? 'text-[var(--arc-sidebar-text-muted)]/25 hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-text-muted)]/50'
                    : accent
                        ? 'text-[var(--arc-sidebar-accent)]/70 hover:bg-[var(--arc-sidebar-accent)]/8 hover:text-[var(--arc-sidebar-accent)]'
                        : 'text-[var(--arc-sidebar-text-muted)]/70 hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-text)]',
                className,
            )}
            style={{ boxShadow: 'none' }}
            onMouseEnter={(e) => {
                if (!isDim) e.currentTarget.style.boxShadow = 'inset 2px 0 0 rgba(59,130,246,0.4)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            onClick={onClick}
        >
            {icon && icon}
            <span className="flex-1 truncate">{label}</span>
            {badge && (
                <span className="arc-mono shrink-0 rounded-none bg-[var(--arc-sidebar-accent)]/10 px-1 py-px text-[7px] uppercase tracking-wider text-[var(--arc-sidebar-accent)]/50">
                    {badge}
                </span>
            )}
            {count !== undefined && (
                <span className="arc-mono shrink-0 text-[8px] tabular-nums" style={{ color: 'rgba(100,116,139,0.35)' }}>
                    {count}
                </span>
            )}
        </button>
    );
}