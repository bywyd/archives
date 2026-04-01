import { BookOpen, Clapperboard, Film, Gamepad2, Loader2, AlertCircle, MonitorPlay, Tv, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { useWindowStore } from '@/stores/window-store';
import type { ApiMediaSource } from '@/types/api';

type Props = {
    universeId: number;
};

const MEDIA_TYPE_ICON: Record<string, React.ReactNode> = {
    game: <Gamepad2 className="size-4" />,
    movie: <Film className="size-4" />,
    tv: <Tv className="size-4" />,
    series: <MonitorPlay className="size-4" />,
    book: <BookOpen className="size-4" />,
};

const MEDIA_TYPE_COLOR: Record<string, string> = {
    game: '#22c55e',
    movie: '#3b82f6',
    tv: '#a855f7',
    series: '#a855f7',
    book: '#f59e0b',
};

function getTypeIcon(type: string) {
    return MEDIA_TYPE_ICON[type.toLowerCase()] ?? <Clapperboard className="size-4" />;
}

export function MediaSourcesPanel({ universeId }: Props) {
    const [sources, setSources] = useState<ApiMediaSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        api.fetchMediaSources(universeId)
            .then((res) => {
                if (!cancelled) {
                    setSources(res.data);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Failed to load media sources');
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

    const openDetail = (ms: ApiMediaSource) => {
        openWindow({
            type: 'media-source-detail',
            title: ms.name.toUpperCase(),
            icon: 'MD',
            props: {
                key: `media-detail-${universeId}-${ms.id}`,
                universeId,
                mediaSourceId: ms.id,
                mediaType: ms.media_type,
            },
        });
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="size-4 animate-spin text-[var(--arc-accent)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-[var(--arc-danger)]">
                <AlertCircle className="mr-2 size-4" />
                {error}
            </div>
        );
    }

    // Group sources by media type
    const grouped = sources.reduce<Record<string, ApiMediaSource[]>>((acc, ms) => {
        const key = ms.media_type.toLowerCase();
        (acc[key] ??= []).push(ms);
        return acc;
    }, {});

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Film className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        MEDIA SOURCES REGISTRY
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {sources.length} ENTRIES
                    </span>
                    <button
                        onClick={() =>
                            openWindow({
                                type: 'media-source-editor',
                                title: 'NEW MEDIA SOURCE',
                                icon: 'MS',
                                props: {
                                    key: `new-media-${universeId}-${Date.now()}`,
                                    universeId,
                                },
                            })
                        }
                        className="arc-btn arc-btn-primary text-[10px]"
                    >
                        + New
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4">
                {sources.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--arc-border)] py-10 text-center">
                        <Clapperboard className="mx-auto mb-2 size-5 text-[var(--arc-text-muted)]/30" />
                        <p className="text-xs text-[var(--arc-text-muted)]">
                            No media sources registered
                        </p>
                    </div>
                )}

                {Object.entries(grouped).map(([type, items]) => {
                    const color = MEDIA_TYPE_COLOR[type] ?? 'var(--arc-accent)';
                    return (
                        <div key={type} className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <span style={{ color }}>{getTypeIcon(type)}</span>
                                <span className="arc-mono text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color }}>
                                    {type === 'tv' ? 'TV SERIES' : `${type}S`}
                                </span>
                                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">{items.length}</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {items.map((ms) => (
                                    <button
                                        key={ms.id}
                                        className="arc-card-hover flex items-start gap-3 rounded-lg border border-[var(--arc-border)] p-3 text-left transition-colors hover:border-[var(--arc-accent)]/20 hover:bg-[var(--arc-surface-hover)]"
                                        onClick={() => openDetail(ms)}
                                    >
                                        <div
                                            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded"
                                            style={{ backgroundColor: `${color}12`, color }}
                                        >
                                            {getTypeIcon(ms.media_type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-medium text-[var(--arc-text)]">
                                                {ms.name}
                                            </div>
                                            {ms.description && (
                                                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--arc-text-muted)]">
                                                    {ms.description}
                                                </p>
                                            )}
                                            <div className="mt-1.5 flex items-center gap-3 text-[9px] text-[var(--arc-text-muted)]">
                                                {ms.release_date && (
                                                    <span className="arc-mono">{ms.release_date}</span>
                                                )}
                                                {ms.entities_count != null && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="size-2.5" />
                                                        {ms.entities_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
