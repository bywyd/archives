import {
    AlertCircle,
    BookOpen,
    Calendar,
    Clapperboard,
    Edit3,
    Film,
    Gamepad2,
    Loader2,
    MonitorPlay,
    Tag,
    Tv,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { EntityCard } from '@/components/archives/entity-card';
import * as api from '@/lib/api';
import { useWindowStore } from '@/stores/window-store';
import type { ApiMediaSource } from '@/types/api';

type Props = {
    universeId: number;
    mediaSourceId: number;
};

const MEDIA_TYPE_ICON: Record<string, React.ReactNode> = {
    game: <Gamepad2 className="size-5" />,
    movie: <Film className="size-5" />,
    tv: <Tv className="size-5" />,
    series: <MonitorPlay className="size-5" />,
    book: <BookOpen className="size-5" />,
};

function getTypeIcon(type: string) {
    return MEDIA_TYPE_ICON[type.toLowerCase()] ?? <Clapperboard className="size-5" />;
}

const MEDIA_TYPE_COLOR: Record<string, string> = {
    game: '#22c55e',
    movie: '#3b82f6',
    tv: '#a855f7',
    series: '#a855f7',
    book: '#f59e0b',
};

export function MediaSourceDetail({ universeId, mediaSourceId }: Props) {
    const [source, setSource] = useState<ApiMediaSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.fetchMediaSource(universeId, mediaSourceId)
            .then((res) => {
                if (!cancelled) setSource(res.data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load media source');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [universeId, mediaSourceId]);

    const openEntityDossier = (entitySlug: string, entityName: string) => {
        openWindow({
            type: 'entity-dossier',
            title: entityName.toUpperCase(),
            icon: 'ED',
            props: {
                key: `entity-${universeId}-${entitySlug}`,
                universeId,
                entitySlug,
            },
        });
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">
                        LOADING MEDIA FILE...
                    </span>
                </div>
            </div>
        );
    }

    if (error || !source) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-[var(--arc-danger)]">
                <AlertCircle className="mr-2 size-4" />
                {error ?? 'Media source not found'}
            </div>
        );
    }

    const accentColor = MEDIA_TYPE_COLOR[source.media_type.toLowerCase()] ?? 'var(--arc-accent)';
    const entities = source.entities;

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Header */}
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)]">
                <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                        >
                            {getTypeIcon(source.media_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                                <span
                                    className="arc-mono rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {source.media_type}
                                </span>
                                {source.release_date && (
                                    <span className="flex items-center gap-1 text-[10px] text-[var(--arc-text-muted)]">
                                        <Calendar className="size-3" />
                                        {source.release_date}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-lg font-bold leading-tight text-[var(--arc-text)]">
                                {source.name}
                            </h1>
                            <button
                                onClick={() =>
                                    openWindow({
                                        type: 'media-source-editor',
                                        title: `EDIT  ${source.name}`,
                                        icon: 'MS',
                                        props: {
                                            key: `edit-media-${universeId}-${source.id}`,
                                            universeId,
                                            mediaSourceId: source.id,
                                        },
                                    })
                                }
                                className="arc-btn text-[10px]"
                            >
                                <Edit3 className="size-3" /> Edit
                            </button>
                            {source.description && (
                                <p className="mt-1.5 text-xs leading-relaxed text-[var(--arc-text-muted)]">
                                    {source.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-3 flex items-center gap-4 border-t border-[var(--arc-border)] pt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--arc-text-muted)]">
                            <Users className="size-3" />
                            <span className="arc-mono font-semibold">{source.entities_count ?? 0}</span>
                            <span>entities</span>
                        </div>
                        {source.tags && source.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Tag className="size-3 text-[var(--arc-text-muted)]" />
                                <div className="flex flex-wrap gap-1">
                                    {source.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="rounded-full px-1.5 py-px text-[8px] font-medium"
                                            style={{
                                                backgroundColor: `${tag.color ?? accentColor}18`,
                                                color: tag.color ?? accentColor,
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Entities section */}
            <div className="flex-1 p-4">
                <div className="arc-section-header mb-4">
                    <Users className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-section-label">FEATURED ENTITIES</span>
                    <span className="arc-section-count">{entities?.length ?? source.entities_count ?? 0}</span>
                </div>

                {(!entities || entities.length === 0) && (
                    <div className="rounded-lg border border-dashed border-[var(--arc-border)] py-10 text-center">
                        <Users className="mx-auto mb-2 size-5 text-[var(--arc-text-muted)]/30" />
                        <p className="text-xs text-[var(--arc-text-muted)]">
                            No entities linked to this media source
                        </p>
                    </div>
                )}

                {entities && entities.length > 0 && (
                    <div className="space-y-1">
                        {entities.map((entity) => (
                            <button
                                key={entity.id}
                                className="arc-card-hover flex w-full items-center gap-3 rounded-lg border border-[var(--arc-border)] px-3 py-2.5 text-left transition-colors hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]"
                                onClick={() => openEntityDossier(entity.slug, entity.name)}
                            >
                                {/* Entity thumbnail */}
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[var(--arc-surface-alt)]">
                                    {entity.images?.[0] ? (
                                        <img
                                            src={entity.images[0].url}
                                            alt=""
                                            className="size-8 rounded object-cover"
                                        />
                                    ) : (
                                        <span
                                            className="arc-mono text-[9px] font-bold uppercase"
                                            style={{ color: entity.entity_type?.color ?? 'var(--arc-text-muted)' }}
                                        >
                                            {entity.name.slice(0, 2)}
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-xs font-medium text-[var(--arc-text)]">
                                            {entity.name}
                                        </span>
                                        {entity.entity_type && (
                                            <span
                                                className="arc-mono shrink-0 rounded px-1 py-px text-[7px] uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: `${entity.entity_type.color ?? '#666'}18`,
                                                    color: entity.entity_type.color ?? '#666',
                                                }}
                                            >
                                                {entity.entity_type.name}
                                            </span>
                                        )}
                                    </div>
                                    {entity.pivot?.role && (
                                        <span className="mt-0.5 block text-[10px] text-[var(--arc-text-muted)]">
                                            Role: {entity.pivot.role}
                                        </span>
                                    )}
                                    {entity.short_description && (
                                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--arc-text-muted)]">
                                            {entity.short_description}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
