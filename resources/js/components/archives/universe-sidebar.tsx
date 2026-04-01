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
    Loader2,
    MonitorPlay,
    Search,
    Tv,
    BookOpen,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
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
            title: `${currentUniverse.name} â€” DASHBOARD`,
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
            title: `${currentUniverse.name} â€” MEDIA`,
            icon: 'MS',
            props: { key: `media-${currentUniverse.id}`, universeId: currentUniverse.id },
        });
    };

    const openAdvancedSearch = () => {
        if (!currentUniverse) return;
        openWindow({
            type: 'advanced-search',
            title: `${currentUniverse.name} â€” INTELLIGENCE ANALYSIS`,
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
            title: `${mediaSourceName.toUpperCase()}`,
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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--arc-sidebar-border)] px-3 py-3">
                <Link href="/" className="flex items-center gap-2.5">
                    {/* <AppLogoIcon className="size-7 text-[var(--arc-sidebar-accent)]" /> */}
                    {appLogo ? 
                        <img src={appLogo} alt={appName+" Logo"} className="size-7" />
                    : 
                        <AppLogoIcon className="size-7 text-blue-600" />    
                    }
                    <div className="flex flex-col">
                        <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-sidebar-accent)] uppercase">
                            {appName}
                        </span>
                        <span className="arc-mono text-[7px] tracking-[0.15em] text-[var(--arc-sidebar-text-muted)]/50">
                            INTELLIGENCE DATABASE
                        </span>
                    </div>
                </Link>
                <div className="flex items-center gap-0.5">
                    <button
                        className="flex size-7 items-center justify-center rounded text-[var(--arc-sidebar-text-muted)] transition-colors hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-accent)]"
                        onClick={() => router.visit('/archives')}
                        title="Switch Universe"
                    >
                        <LayoutGrid className="size-3.5" />
                    </button>
                    <button
                        className="flex size-7 items-center justify-center rounded text-[var(--arc-sidebar-text-muted)] transition-colors hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-accent)]"
                        onClick={() =>
                            openWindow({ type: 'search', title: 'SEARCH TERMINAL', icon: 'SR' })
                        }
                        title="Search"
                    >
                        <Search className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto px-1.5 py-2 sidebar-scroll">
                {!currentUniverse && (
                    <div className="px-3 py-6 text-center">
                        <Globe className="mx-auto mb-2 size-5 text-[var(--arc-sidebar-text-muted)]/30" />
                        <p className="text-xs text-[var(--arc-sidebar-text-muted)]">No universe selected</p>
                    </div>
                )}

                {currentUniverse && (
                    <div className="mb-1">
                        {/* Universe row */}
                        <div className="group flex items-center">
                            <button
                                className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-xs bg-[var(--arc-sidebar-accent)]/8 text-[var(--arc-sidebar-text)] transition-all hover:bg-[var(--arc-sidebar-accent)]/12"
                                onClick={openUniverseDashboard}
                            >
                                <Globe className="size-3.5 shrink-0 text-[var(--arc-sidebar-accent)]" />
                                <span className="flex-1 truncate font-medium">{currentUniverse.name}</span>
                                {currentUniverse.entities_count != null && (
                                    <span className="arc-mono shrink-0 rounded-full bg-[var(--arc-sidebar-text-muted)]/10 px-1.5 py-0.5 text-[8px] tabular-nums text-[var(--arc-sidebar-text-muted)]/60">
                                        {currentUniverse.entities_count}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Sub-tree */}
                        <div className="relative ml-[11px] pl-[13px]">
                            {/* Tree guide line */}
                            <div className="absolute inset-y-0 left-[11px] w-px bg-[var(--arc-sidebar-border)]" />

                            {treeLoading && !tree && (
                                <div className="flex items-center gap-2 px-2 py-3">
                                    <Loader2 className="size-3 animate-spin text-[var(--arc-sidebar-accent)]" />
                                    <span className="arc-mono text-[8px] text-[var(--arc-sidebar-text-muted)]">
                                        LOADING...
                                    </span>
                                </div>
                            )}

                            {tree && (
                                <div className="space-y-0.5 py-1">
                                    {/* â”€â”€ INTELLIGENCE ANALYSIS â”€â”€ */}
                                    <TreeLeaf
                                        icon={<Brain className="size-3 text-[var(--arc-sidebar-accent)]/70" />}
                                        label="Intelligence Analysis"
                                        onClick={openAdvancedSearch}
                                    />

                                    {/* â”€â”€ ENTITIES â”€â”€ */}
                                    <SectionHeader
                                        icon={<Layers className="size-3" />}
                                        label="ENTITIES"
                                        count={tree.total_entities}
                                        isOpen={isSectionOpen(currentUniverse.id, 'entities')}
                                        onToggle={() => toggleSection(currentUniverse.id, 'entities')}
                                    />
                                    {isSectionOpen(currentUniverse.id, 'entities') && (
                                        <div className="relative ml-2 space-y-px pl-2.5">
                                            <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/40" />
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
                                                    onClick={() =>
                                                        openEntityList({ typeSlug: et.slug })
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* â”€â”€ TIMELINES â”€â”€ */}
                                    {tree.timelines.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<Clock className="size-3" />}
                                                label="TIMELINES"
                                                count={tree.timelines.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'timelines')}
                                                onToggle={() =>
                                                    toggleSection(currentUniverse.id, 'timelines')
                                                }
                                            />
                                            {isSectionOpen(currentUniverse.id, 'timelines') && (
                                                <div className="relative ml-2 space-y-px pl-2.5">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/40" />
                                                    {tree.timelines.map((tl) => (
                                                        <TreeLeaf
                                                            key={tl.id}
                                                            icon={<Clock className="size-3 text-[var(--arc-sidebar-text-muted)]/50" />}
                                                            label={tl.name}
                                                            count={tl.entities_count}
                                                            onClick={() =>
                                                                openTimeline(tl.id, tl.name)
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* â”€â”€ CATEGORIES â”€â”€ */}
                                    {tree?.categories?.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<FolderTree className="size-3" />}
                                                label="CATEGORIES"
                                                count={tree.categories.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'categories')}
                                                onToggle={() =>
                                                    toggleSection(currentUniverse.id, 'categories')
                                                }
                                            />
                                            {isSectionOpen(currentUniverse.id, 'categories') && (
                                                <div className="relative ml-2 space-y-px pl-2.5">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/40" />
                                                    {tree.categories.map((cat) => (
                                                        <div key={cat.id}>
                                                            <div className="flex items-center">
                                                                {cat.children.length > 0 ? (
                                                                    <button
                                                                        className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--arc-sidebar-text-muted)]/60 transition-colors hover:text-[var(--arc-sidebar-text)]"
                                                                        onClick={() =>
                                                                            toggleCategory(cat.id)
                                                                        }
                                                                        aria-label={
                                                                            expandedCategories.has(cat.id)
                                                                                ? 'Collapse'
                                                                                : 'Expand'
                                                                        }
                                                                    >
                                                                        <ChevronRight className="arc-chevron size-2.5" data-open={expandedCategories.has(cat.id)} />
                                                                    </button>
                                                                ) : (
                                                                    <span className="size-4 shrink-0" />
                                                                )}
                                                                <TreeLeaf
                                                                    icon={expandedCategories.has(cat.id)
                                                                        ? <FolderOpen className="size-3 text-[var(--arc-sidebar-accent)]/60" />
                                                                        : <FolderClosed className="size-3 text-[var(--arc-sidebar-text-muted)]/50" />
                                                                    }
                                                                    label={cat.name}
                                                                    className="flex-1"
                                                                    onClick={() =>
                                                                        openEntityList({
                                                                            categorySlug: cat.slug,
                                                                            label: cat.name,
                                                                        })
                                                                    }
                                                                />
                                                            </div>
                                                            {expandedCategories.has(cat.id) &&
                                                                cat.children.length > 0 && (
                                                                    <div className="relative ml-5 space-y-px pl-2.5">
                                                                        <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/30" />
                                                                        {cat.children.map((child) => (
                                                                            <TreeLeaf
                                                                                key={child.id}
                                                                                icon={<FolderClosed className="size-2.5 text-[var(--arc-sidebar-text-muted)]/40" />}
                                                                                label={child.name}
                                                                                onClick={() =>
                                                                                    openEntityList({
                                                                                        categorySlug: child.slug,
                                                                                        label: child.name,
                                                                                    })
                                                                                }
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

                                    {/* â”€â”€ MEDIA SOURCES â”€â”€ */}
                                    {tree.media_sources.length > 0 && (
                                        <>
                                            <SectionHeader
                                                icon={<Clapperboard className="size-3" />}
                                                label="MEDIA"
                                                count={tree.media_sources.length}
                                                isOpen={isSectionOpen(currentUniverse.id, 'media')}
                                                onToggle={() =>
                                                    toggleSection(currentUniverse.id, 'media')
                                                }
                                            />
                                            {isSectionOpen(currentUniverse.id, 'media') && (
                                                <div className="relative ml-2 space-y-px pl-2.5">
                                                    <div className="absolute inset-y-0 left-0 w-px bg-[var(--arc-sidebar-border)]/40" />
                                                    <TreeLeaf
                                                        label="All Media Sources"
                                                        icon={<Clapperboard className="size-3 text-[var(--arc-sidebar-text-muted)]/50" />}
                                                        count={tree.media_sources.length}
                                                        onClick={openMediaSources}
                                                    />
                                                    {tree.media_sources.map((ms) => (
                                                        <TreeLeaf
                                                            key={ms.id}
                                                            icon={<span className="text-[var(--arc-sidebar-text-muted)]/50">{getMediaIcon(ms.media_type)}</span>}
                                                            label={ms.name}
                                                            badge={ms.media_type}
                                                            count={ms.entities_count}
                                                            onClick={() =>
                                                                openMediaSourceDetail(
                                                                    ms.id,
                                                                    ms.name,
                                                                    ms.media_type,
                                                                )
                                                            }
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

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--arc-sidebar-border)] px-3 py-2">
                <span className="arc-mono text-[8px] tracking-[0.15em] text-[var(--arc-sidebar-text-muted)]/50">
                    {currentUniverse?.name.toUpperCase() ?? 'NO UNIVERSE'}
                </span>
                <span className="size-1.5 rounded-full bg-green-500/60" title="Connected" />
            </div>

            {/* Agent badge */}
            <AgentBadge />
        </div>
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
                'mt-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors',
                isOpen
                    ? 'bg-[var(--arc-sidebar-hover)]/50'
                    : 'hover:bg-[var(--arc-sidebar-hover)]',
            )}
            onClick={onToggle}
        >
            <ChevronRight className="arc-chevron size-2.5 shrink-0 text-[var(--arc-sidebar-text-muted)]/60" data-open={isOpen} />
            <span className={cn(
                'shrink-0 transition-colors',
                isOpen ? 'text-[var(--arc-sidebar-accent)]' : 'text-[var(--arc-sidebar-text-muted)]',
            )}>{icon}</span>
            <span className={cn(
                'arc-mono flex-1 text-[9px] font-bold tracking-[0.12em] transition-colors',
                isOpen ? 'text-[var(--arc-sidebar-text)]/80' : 'text-[var(--arc-sidebar-text-muted)]/80',
            )}>
                {label}
            </span>
            {count !== undefined && (
                <span className="arc-mono rounded-full bg-[var(--arc-sidebar-text-muted)]/8 px-1.5 py-0.5 text-[8px] tabular-nums text-[var(--arc-sidebar-text-muted)]/50">
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
    className,
    onClick,
}: {
    icon?: ReactNode;
    label: string;
    count?: number;
    badge?: string;
    dimIfZero?: boolean;
    className?: string;
    onClick: () => void;
}) {
    const isDim = dimIfZero && count === 0;

    return (
        <button
            className={cn(
                'group/leaf flex w-full items-center gap-1.5 rounded px-2 py-[5px] text-left text-[11px] transition-colors',
                isDim
                    ? 'text-[var(--arc-sidebar-text-muted)]/30 hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-text-muted)]/60'
                    : 'text-[var(--arc-sidebar-text-muted)] hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-sidebar-text)]',
                className,
            )}
            onClick={onClick}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="flex-1 truncate">{label}</span>
            {badge && (
                <span className="arc-mono shrink-0 rounded bg-[var(--arc-sidebar-accent)]/10 px-1 py-px text-[7px] uppercase tracking-wider text-[var(--arc-sidebar-accent)]/60">
                    {badge}
                </span>
            )}
            {count !== undefined && (
                <span className="arc-mono shrink-0 text-[8px] tabular-nums text-[var(--arc-sidebar-text-muted)]/40">
                    {count}
                </span>
            )}
        </button>
    );
}