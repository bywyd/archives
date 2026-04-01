import { Clock, History, Pin, PinOff, Trash2, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useHistoryStore, type HistoryEntry, type PinnedItem } from '@/stores/history-store';
import { useWindowStore } from '@/stores/window-store';

type Props = {
    universeId?: number;
    maxItems?: number;
    showPinned?: boolean;
    showClearButton?: boolean;
    compact?: boolean;
};

export function RecentlyViewed({
    universeId,
    maxItems = 10,
    showPinned = true,
    showClearButton = true,
    compact = false,
}: Props) {
    const { history, pinned, clearHistory, removeFromHistory, pinItem, unpinItem, isPinned } =
        useHistoryStore();
    const { openWindow } = useWindowStore();

    const filteredHistory = useMemo(() => {
        let items = history;
        if (universeId) {
            items = items.filter((h) => h.universeId === universeId);
        }
        return items.slice(0, maxItems);
    }, [history, universeId, maxItems]);

    const filteredPinned = useMemo(() => {
        if (!showPinned) return [];
        let items = pinned;
        if (universeId) {
            items = items.filter((p) => p.universeId === universeId);
        }
        return items;
    }, [pinned, universeId, showPinned]);

    const openEntity = useCallback(
        (entry: HistoryEntry | PinnedItem) => {
            openWindow({
                type: 'entity-dossier',
                title: `${entry.name}  DOSSIER`,
                icon: entry.entityType?.icon ?? 'EN',
                props: {
                    key: `entity-${entry.universeId}-${entry.slug}`,
                    universeId: entry.universeId,
                    entitySlug: entry.slug,
                },
            });
        },
        [openWindow]
    );

    const handlePin = useCallback(
        (entry: HistoryEntry) => {
            if (isPinned(entry.entityId, entry.universeId)) {
                unpinItem(entry.entityId, entry.universeId);
            } else {
                pinItem({
                    ...entry,
                    type: entry.type,
                });
            }
        },
        [isPinned, pinItem, unpinItem]
    );

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (filteredHistory.length === 0 && filteredPinned.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <History className="size-8 text-[var(--arc-text-muted)]/30" />
                <p className="text-xs text-[var(--arc-text-muted)]">No recently viewed items</p>
                <p className="arc-mono text-[9px] text-[var(--arc-text-muted)]/50">
                    Open entities to build your history
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Pinned Items */}
            {filteredPinned.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Pin className="size-3 text-[var(--arc-warning)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-warning)]">
                            PINNED
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]/50" />
                        <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                            {filteredPinned.length}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {filteredPinned.map((item) => (
                            <HistoryItem
                                key={`pinned-${item.entityId}-${item.universeId}`}
                                entry={item}
                                isPinned={true}
                                onOpen={() => openEntity(item)}
                                onPin={() => unpinItem(item.entityId, item.universeId)}
                                onRemove={() => unpinItem(item.entityId, item.universeId)}
                                timeLabel={formatTime(item.pinnedAt)}
                                compact={compact}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent History */}
            {filteredHistory.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Clock className="size-3 text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                            RECENT
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]/50" />
                        {showClearButton && filteredHistory.length > 0 && (
                            <button
                                className="arc-mono flex items-center gap-1 text-[8px] text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                                onClick={clearHistory}
                                title="Clear history"
                            >
                                <Trash2 className="size-2.5" />
                                CLEAR
                            </button>
                        )}
                    </div>
                    <div className="space-y-1">
                        {filteredHistory.map((item) => (
                            <HistoryItem
                                key={`history-${item.entityId}-${item.universeId}-${item.viewedAt}`}
                                entry={item}
                                isPinned={isPinned(item.entityId, item.universeId)}
                                onOpen={() => openEntity(item)}
                                onPin={() => handlePin(item)}
                                onRemove={() => removeFromHistory(item.entityId, item.universeId)}
                                timeLabel={formatTime(item.viewedAt)}
                                compact={compact}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

type HistoryItemProps = {
    entry: HistoryEntry | PinnedItem;
    isPinned: boolean;
    onOpen: () => void;
    onPin: () => void;
    onRemove: () => void;
    timeLabel: string;
    compact?: boolean;
};

function HistoryItem({ entry, isPinned, onOpen, onPin, onRemove, timeLabel, compact }: HistoryItemProps) {
    return (
        <div
            className={cn(
                'group relative flex items-center gap-2 rounded border border-transparent p-1.5 transition-all',
                'hover:border-[var(--arc-border)] hover:bg-[var(--arc-surface-hover)]',
                compact ? 'gap-1.5 p-1' : ''
            )}
        >
            {/* Thumbnail */}
            <button
                onClick={onOpen}
                className={cn(
                    'flex shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]',
                    compact ? 'size-7' : 'size-9'
                )}
            >
                {entry.profileImage ? (
                    <img
                        src={entry.profileImage}
                        alt={entry.name}
                        className="size-full object-cover"
                    />
                ) : (
                    <TypeIcon entityType={entry.entityType} size={compact ? 'sm' : 'md'} />
                )}
            </button>

            {/* Info */}
            <button onClick={onOpen} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                    <TypeIcon entityType={entry.entityType} size="sm" />
                    <span
                        className={cn(
                            'truncate font-medium text-[var(--arc-text)] group-hover:text-[var(--arc-accent)]',
                            compact ? 'text-[10px]' : 'text-xs'
                        )}
                    >
                        {entry.name}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={entry.entityStatus} size="sm" />
                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                        {timeLabel}
                    </span>
                </div>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPin();
                    }}
                    className={cn(
                        'flex size-5 items-center justify-center rounded hover:bg-[var(--arc-surface-alt)]',
                        isPinned ? 'text-[var(--arc-warning)]' : 'text-[var(--arc-text-muted)]'
                    )}
                    title={isPinned ? 'Unpin' : 'Pin'}
                >
                    {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="flex size-5 items-center justify-center rounded text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-alt)] hover:text-[var(--arc-danger)]"
                    title="Remove"
                >
                    <X className="size-3" />
                </button>
            </div>
        </div>
    );
}
