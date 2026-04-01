import { Link2, Pin, Zap } from 'lucide-react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useHistoryStore } from '@/stores/history-store';
import type { ApiEntitySummary, ApiSearchResult } from '@/types/api';

type Props = {
    entity: ApiEntitySummary | ApiSearchResult;
    onClick?: () => void;
    compact?: boolean;
    /** Show additional stats like relations count */
    showStats?: boolean;
    /** Universe ID for pinning functionality */
    universeId?: number;
    /** Highlight search matches */
    highlightQuery?: string;
};

export function EntityCard({
    entity,
    onClick,
    compact = false,
    showStats = false,
    universeId,
    highlightQuery,
}: Props) {
    const profileImage = entity.images?.find((img) => img.type === 'profile');
    const { isPinned } = useHistoryStore();

    // Determine if we can show pin status
    const entityUniverse = 'universe' in entity ? entity.universe?.id : universeId;
    const pinned = entityUniverse ? isPinned(entity.id, entityUniverse) : false;

    // Extract stats from full entity if available
    const stats = getEntityStats(entity);

    // Highlight matching text
    const highlightText = (text: string) => {
        if (!highlightQuery || !text) return text;
        const regex = new RegExp(`(${escapeRegex(highlightQuery)})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-[var(--arc-warning)]/20 text-[var(--arc-warning)]">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'arc-card-hover group relative flex w-full items-start gap-3 rounded border text-left transition-all',
                'border-[var(--arc-border)] bg-[var(--arc-surface)]',
                'hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]',
                compact ? 'gap-2 p-2' : 'p-3',
            )}
        >
            {/* Pin indicator */}
            {pinned && (
                <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-[var(--arc-warning)]/50 bg-[var(--arc-warning)]/10">
                    <Pin className="size-2.5 text-[var(--arc-warning)]" />
                </div>
            )}

            {/* Thumbnail */}
            <div
                className={cn(
                    'shrink-0 overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] transition-all group-hover:border-[var(--arc-accent)]/20',
                    compact ? 'size-9' : 'size-12',
                )}
            >
                {profileImage ? (
                    <img
                        src={profileImage.thumbnail_url ?? profileImage.url}
                        alt={entity.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <TypeIcon entityType={entity.entity_type} size={compact ? 'sm' : 'md'} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <TypeIcon entityType={entity.entity_type} size="sm" />
                    <span
                        className={cn(
                            'truncate font-medium text-[var(--arc-text)] transition-colors group-hover:text-[var(--arc-accent)]',
                            compact ? 'text-xs' : 'text-sm',
                        )}
                    >
                        {highlightText(entity.name)}
                    </span>
                </div>

                {entity.short_description && !compact && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--arc-text-muted)]">
                        {highlightText(entity.short_description)}
                    </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={entity.entity_status} />
                    {'universe' in entity && entity.universe && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {entity.universe.name}
                        </span>
                    )}
                    {entity.is_featured && (
                        <span className="arc-mono flex items-center gap-0.5 rounded bg-[var(--arc-warning)]/10 px-1 py-0.5 text-[8px] font-bold text-[var(--arc-warning)]">
                            ★
                        </span>
                    )}
                </div>

                {/* Stats row */}
                {showStats && stats.hasStats && (
                    <div className="mt-2 flex items-center gap-3 border-t border-[var(--arc-border)] pt-2">
                        {stats.relations > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-[var(--arc-text-muted)]">
                                <Link2 className="size-3" />
                                <span className="arc-mono font-semibold">{stats.relations}</span>
                                <span>relations</span>
                            </div>
                        )}
                        {stats.powers > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-[var(--arc-text-muted)]">
                                <Zap className="size-3 text-[var(--arc-warning)]" />
                                <span className="arc-mono font-semibold">{stats.powers}</span>
                                <span>abilities</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Tags preview */}
                {'tags' in entity && entity.tags && entity.tags.length > 0 && !compact && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {entity.tags.slice(0, 3).map((tag: any) => (
                            <span
                                key={tag.id}
                                className="rounded-full px-1.5 py-0.5 text-[8px] font-medium"
                                style={{
                                    color: tag.color ?? 'var(--arc-text-muted)',
                                    backgroundColor: `${tag.color ?? '#6B7280'}12`,
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                        {entity.tags.length > 3 && (
                            <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                +{entity.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}

// Extract stats from entity if available
function getEntityStats(entity: ApiEntitySummary | ApiSearchResult) {
    const isFullEntity = 'outgoing_relations' in entity || 'incoming_relations' in entity;
    const fullEntity = entity as any;

    const relations =
        (fullEntity.outgoing_relations?.length ?? 0) + (fullEntity.incoming_relations?.length ?? 0);
    const powers = fullEntity.power_profiles?.length ?? 0;

    return {
        relations,
        powers,
        hasStats: relations > 0 || powers > 0,
    };
}

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

