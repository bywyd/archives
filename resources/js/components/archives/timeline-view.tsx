import { AlertCircle, Clock, Edit3, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiTimeline, ApiTimelineEvent } from '@/types/api';

type Props = {
    universeId: number;
    timelineId: number;
};

export function TimelineView({ universeId, timelineId }: Props) {
    const [timeline, setTimeline] = useState<ApiTimeline | null>(null);
    const [events, setEvents] = useState<ApiTimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            api.fetchTimeline(universeId, timelineId),
            api.fetchTimelineEvents(universeId, timelineId),
        ])
            .then(([tlRes, evRes]) => {
                if (cancelled) {
                    return;
                }

                setTimeline(tlRes.data);
                setEvents(evRes.data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Failed to load timeline');
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
    }, [universeId, timelineId]);

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                <div className="text-center">
                    <div className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        LOADING TIMELINE
                    </div>
                    <div className="arc-mono mt-1 text-[9px] text-[var(--arc-text-muted)]">
                        RECONSTRUCTING CHRONOLOGICAL DATA...
                    </div>
                </div>
            </div>
        );
    }

    if (error || !timeline) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <span className="arc-mono text-xs font-medium text-[var(--arc-danger)]">
                    {error || 'TIMELINE NOT FOUND'}
                </span>
            </div>
        );
    }

    const openEntityDossier = (event: ApiTimelineEvent) => {
        if (!event.entity) {
            return;
        }

        openWindow({
            type: 'entity-dossier',
            title: `${event.entity.name}  DOSSIER`,
            icon: event.entity.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${event.entity.slug}`,
                universeId,
                entitySlug: event.entity.slug,
            },
        });
    };

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Header */}
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] p-4">
                <div className="flex items-center gap-2">
                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        TIMELINE RECORD
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        #{timeline.id.toString().padStart(4, '0')}
                    </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <Clock className="size-5 text-[var(--arc-accent)]" />
                    <h1 className="arc-heading-accent inline-block text-lg font-bold text-[var(--arc-text)]">
                        {timeline.name}
                    </h1>
                    <button
                        onClick={() =>
                            openWindow({
                                type: 'timeline-editor',
                                title: `EDIT  ${timeline.name}`,
                                icon: 'TL',
                                props: {
                                    key: `edit-timeline-${universeId}-${timeline.id}`,
                                    universeId,
                                    timelineId: timeline.id,
                                },
                            })
                        }
                        className="arc-btn text-[10px]"
                    >
                        <Edit3 className="size-3" /> Edit
                    </button>
                </div>
                {timeline.description && (
                    <p className="mt-1 text-sm text-[var(--arc-text-muted)]">
                        {timeline.description}
                    </p>
                )}
                <span className="arc-mono mt-2 inline-block text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {events.length} EVENT{events.length !== 1 ? 'S' : ''} RECORDED
                </span>
            </div>

            {/* Timeline Track */}
            {events.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="relative min-w-max">
                        {/* Track Line */}
                        <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-[var(--arc-accent)]/20" />

                        {/* Events */}
                        <div className="space-y-0">
                            {events.map((event, idx) => (
                                <div key={event.id} className="relative flex gap-4 pb-5">
                                    {/* Node */}
                                    <div className="relative z-10 flex size-12 shrink-0 items-center justify-center">
                                        <div
                                            className={cn(
                                                'size-3 rounded-full border-2',
                                                event.entity
                                                    ? 'border-[var(--arc-accent)] bg-[var(--arc-accent)]'
                                                    : 'border-[var(--arc-border-strong)] bg-[var(--arc-surface)]',
                                            )}
                                        />
                                    </div>

                                    {/* Event Card */}
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex-1 rounded border bg-[var(--arc-surface)] p-3 text-left transition-all',
                                            event.entity
                                                ? 'arc-card-hover cursor-pointer border-[var(--arc-border)] hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-hover)]'
                                                : 'cursor-default border-[var(--arc-border)]',
                                        )}
                                        onClick={() => openEntityDossier(event)}
                                        disabled={!event.entity}
                                    >
                                        <div className="flex items-center gap-2">
                                            {/* Date */}
                                            {event.fictional_date && (
                                                <span className="arc-mono rounded bg-[var(--arc-accent)]/8 px-1.5 py-0.5 text-[10px] font-bold text-[var(--arc-accent)]">
                                                    {event.fictional_date}
                                                </span>
                                            )}
                                            {event.event_type && (
                                                <span className="arc-mono rounded bg-[var(--arc-text-muted)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--arc-text-muted)]">
                                                    {event.event_type}
                                                </span>
                                            )}
                                            {event.severity && (
                                                <SeverityBadge severity={event.severity} />
                                            )}
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                EVENT #{(idx + 1).toString().padStart(3, '0')}
                                            </span>
                                        </div>

                                        <h3 className="mt-1 text-sm font-medium text-[var(--arc-text)]">
                                            {event.title}
                                        </h3>

                                        {event.description && (
                                            <p className="mt-0.5 text-xs text-[var(--arc-text-muted)]">
                                                {event.description}
                                            </p>
                                        )}

                                        {event.location && (
                                            <div className="mt-1 flex items-center gap-1 text-[9px] text-[var(--arc-text-muted)]">
                                                <span className="arc-mono font-semibold">LOC:</span>
                                                <span>{event.location.name}</span>
                                            </div>
                                        )}

                                        {event.entity && (
                                            <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--arc-border)] pt-1.5">
                                                <TypeIcon
                                                    entityType={event.entity.entity_type}
                                                    size="sm"
                                                />
                                                <span className="text-[10px] font-medium text-[var(--arc-text)]">
                                                    {event.entity.name}
                                                </span>
                                                <span className="arc-mono text-[9px] text-[var(--arc-accent)]">
                                                    → VIEW DOSSIER
                                                </span>
                                            </div>
                                        )}

                                        {/* Participants */}
                                        {event.participants && event.participants.length > 0 && (
                                            <div className="mt-2 border-t border-[var(--arc-border)] pt-1.5">
                                                <div className="flex items-center gap-1 text-[9px] text-[var(--arc-text-muted)]">
                                                    <Users className="size-2.5" />
                                                    <span className="arc-mono font-semibold">PARTICIPANTS ({event.participants.length})</span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {event.participants.map((p) => (
                                                        <span
                                                            key={p.id}
                                                            className="inline-flex items-center gap-1 rounded bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[9px]"
                                                        >
                                                            <span className="font-medium text-[var(--arc-text)]">{p.entity?.name ?? 'Unknown'}</span>
                                                            {p.role && (
                                                                <span className="arc-mono text-[var(--arc-text-muted)]">({p.role})</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-[var(--arc-text-muted)]">
                        No events in this timeline
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-1.5">
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    TIMELINE #{timeline.id.toString().padStart(4, '0')}
                </span>
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    {events.length} EVENTS
                </span>
            </div>
        </div>
    );
}

const SEVERITY_COLORS: Record<string, string> = {
    low: 'text-[var(--arc-text-muted)] bg-[var(--arc-text-muted)]/10',
    medium: 'text-[var(--arc-warning)] bg-[var(--arc-warning)]/10',
    high: 'text-orange-400 bg-orange-400/10',
    critical: 'text-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    'extinction-level': 'text-[var(--arc-danger)] bg-[var(--arc-danger)]/20 animate-pulse',
};

function SeverityBadge({ severity }: { severity: string }) {
    return (
        <span className={cn('arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low)}>
            {severity}
        </span>
    );
}
