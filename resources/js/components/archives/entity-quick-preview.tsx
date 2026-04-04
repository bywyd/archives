import { ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity } from '@/types/api';

type Props = {
    universeId: number;
    entitySlug: string;
    entityName?: string;
    children: React.ReactNode;
    /** Delay before showing preview (ms) */
    delay?: number;
    /** Position of the popover */
    side?: 'top' | 'bottom' | 'left' | 'right';
    /** Enable/disable preview */
    enabled?: boolean;
};

export function EntityQuickPreview({
    universeId,
    entitySlug,
    entityName,
    children,
    delay = 400,
    side = 'right',
    enabled = true,
}: Props) {
    const [open, setOpen] = useState(false);
    const [entity, setEntity] = useState<ApiEntity | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { openWindow } = useWindowStore();

    const fetchEntity = useCallback(async () => {
        if (entity?.slug === entitySlug) return; // Already loaded
        
        setLoading(true);
        setError(null);
        
        try {
            const res = await api.fetchEntity(universeId, entitySlug);
            setEntity(res.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load preview');
        } finally {
            setLoading(false);
        }
    }, [universeId, entitySlug, entity?.slug]);

    const handleMouseEnter = useCallback(() => {
        if (!enabled) return;
        hoverTimerRef.current = setTimeout(() => {
            setOpen(true);
            fetchEntity();
        }, delay);
    }, [delay, enabled, fetchEntity]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    }, []);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen) {
            setOpen(false);
        }
    }, []);

    const openDossier = useCallback(() => {
        setOpen(false);
        openWindow({
            type: 'entity-dossier',
            title: `${entityName ?? entity?.name ?? entitySlug}  DOSSIER`,
            icon: entity?.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${entitySlug}`,
                universeId,
                entitySlug,
            },
        });
    }, [openWindow, universeId, entitySlug, entityName, entity]);

    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
            }
        };
    }, []);

    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
                <span
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="inline"
                >
                    {children}
                </span>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side={side}
                    sideOffset={8}
                    align="start"
                    className={cn(
                        'z-999 w-80 rounded-none border border-[var(--arc-accent)]/30 bg-[var(--arc-surface)] shadow-xl',
                        'arc-animate-scale-in'
                    )}
                    onMouseEnter={() => {
                        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    }}
                    onMouseLeave={() => setOpen(false)}
                >
                    {loading && (
                        <div className="flex items-center justify-center gap-2 p-6">
                            <Loader2 className="size-4 animate-spin text-[var(--arc-accent)]" />
                            <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                                LOADING...
                            </span>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 text-center">
                            <p className="text-xs text-[var(--arc-danger)]">{error}</p>
                        </div>
                    )}

                    {!loading && !error && entity && (
                        <PreviewContent entity={entity} onOpenDossier={openDossier} />
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

function PreviewContent({ entity, onOpenDossier }: { entity: ApiEntity; onOpenDossier: () => void }) {
    const profileImage = entity.images?.find((img) => img.type === 'profile');
    const relationCount = (entity.outgoing_relations?.length ?? 0) + (entity.incoming_relations?.length ?? 0);

    return (
        <div className="overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--arc-border)] bg-[var(--arc-bg-pure)] p-3">
                <div className="flex gap-3">
                    {/* Profile Image */}
                    <div className="size-14 shrink-0 overflow-hidden rounded-none border border-[var(--arc-border)] bg-[var(--arc-bg)]">
                        {profileImage ? (
                            <img
                                src={profileImage.thumbnail_url ?? profileImage.url}
                                alt={entity.name}
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center">
                                <TypeIcon entityType={entity.entity_type} size="lg" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <TypeIcon entityType={entity.entity_type} size="sm" />
                            <span className="arc-mono text-[8px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                                {entity.entity_type?.name ?? 'Entity'}
                            </span>
                        </div>
                        <h3 className="mt-0.5 truncate text-sm font-bold text-[var(--arc-text)]">
                            {entity.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                            <StatusBadge status={entity.entity_status} size="sm" />
                            {entity.is_featured && (
                                <span className="arc-mono rounded-none bg-[var(--arc-warning)]/10 px-1 py-0.5 text-[8px] font-bold text-[var(--arc-warning)]">
                                    ★ PRIORITY
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-3">
                {entity.short_description && (
                    <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-[var(--arc-text-muted)]">
                        {entity.short_description}
                    </p>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-1.5 rounded-none border border-[var(--arc-accent)] bg-[var(--arc-bg-pure)] p-2">
                    <QuickStat label="Relations" value={relationCount} />
                    <QuickStat label="Sections" value={entity.sections?.length ?? 0} />
                    <QuickStat label="Attributes" value={entity.attributes?.length ?? 0} />
                </div>

                {/* Aliases */}
                {entity.aliases && entity.aliases.length > 0 && (
                    <div className="mt-2">
                        <span className="arc-mono text-[8px] font-semibold text-[var(--arc-text-muted)]">
                            ALIASES:{' '}
                        </span>
                        <span className="text-[10px] text-[var(--arc-text)]">
                            {entity.aliases
                                .slice(0, 3)
                                .map((a) => a.alias)
                                .join(', ')}
                            {entity.aliases.length > 3 && ` +${entity.aliases.length - 3} more`}
                        </span>
                    </div>
                )}

                {/* Tags */}
                {entity.tags && entity.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {entity.tags.slice(0, 4).map((tag) => (
                            <span
                                key={tag.id}
                                className="rounded-full px-1.5 py-0.5 text-[8px] font-medium"
                                style={{
                                    color: tag.color ?? 'var(--arc-text-muted)',
                                    backgroundColor: `${tag.color ?? '#6B7280'}15`,
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer - Open Dossier Button */}
            <div className="border-t border-[var(--arc-border)] bg-[var(--arc-bg-pure)] px-3 py-2">
                <button
                    onClick={onOpenDossier}
                    className="flex w-full items-center justify-center gap-1.5 rounded-none border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/8 px-3 py-1.5 text-xs font-medium text-[var(--arc-accent)] transition-all hover:border-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/15"
                >
                    <ExternalLink className="size-3" />
                    Open Full Dossier
                </button>
            </div>
        </div>
    );
}

function QuickStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="text-center">
            <div className="arc-mono text-sm font-bold text-[var(--arc-text)]">{value}</div>
            <div className="arc-mono text-[7px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                {label}
            </div>
        </div>
    );
}
