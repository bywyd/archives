import { AlertCircle, ChevronLeft, ChevronRight, Clock, Eye, Loader2, MapPin, Pause, Play, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, ApiEntityIntelligenceRecord, ApiEntitySummary, ApiReconstructionResponse } from '@/types/api';

type Props = {
    universeId: number;
    incidentSlug: string;
};

/*  Entity attribute helpers  */
function getAttr(entity: ApiEntity, slug: string): string | null {
    const attr = (entity.attributes ?? []).find((a: any) => a.definition?.slug === slug || a.slug === slug);
    return attr?.value ?? null;
}

function getParticipants(entity: ApiEntity) {
    return (entity.incoming_relations ?? [])
        .filter((r: any) => r.relation_type?.slug === 'participated-in')
        .map((r: any) => ({
            entity: r.from_entity as ApiEntitySummary | null,
            description: r.description as string | null,
            context: r.context as string | null,
            status: r.status as string | null,
        }));
}

function getLocation(entity: ApiEntity): ApiEntitySummary | null {
    const rel = (entity.outgoing_relations ?? []).find((r: any) => r.relation_type?.slug === 'located-at');
    return (rel?.to_entity as ApiEntitySummary) ?? null;
}

const SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-[var(--arc-text-muted)]',
    medium: 'bg-[var(--arc-warning)]',
    high: 'bg-orange-400',
    critical: 'bg-[var(--arc-danger)]',
    'extinction-level': 'bg-[var(--arc-danger)] animate-pulse',
};

const SEVERITY_TEXT: Record<string, string> = {
    low: 'text-[var(--arc-text-muted)]',
    medium: 'text-[var(--arc-warning)]',
    high: 'text-orange-400',
    critical: 'text-[var(--arc-danger)]',
    'extinction-level': 'text-[var(--arc-danger)]',
};

const PHASE_BG_COLORS = [
    'bg-[var(--arc-accent)]/15',
    'bg-cyan-500/15',
    'bg-amber-500/15',
    'bg-emerald-500/15',
    'bg-rose-500/15',
    'bg-violet-500/15',
    'bg-sky-400/15',
    'bg-orange-400/15',
];

const CLASS_COLORS: Record<string, string> = {
    known: 'text-[var(--arc-success)] border-[var(--arc-success)]',
    unknown: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    classified: 'text-[var(--arc-warning)] border-[var(--arc-warning)]',
    redacted: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    partial: 'text-orange-400 border-orange-400',
    rumored: 'text-blue-400 border-blue-400',
    discovered: 'text-emerald-400 border-emerald-400',
};

const AUTOPLAY_INTERVAL = 4000;

export function TemporalSlider({ universeId, incidentSlug }: Props) {
    const [data, setData] = useState<ApiReconstructionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.fetchEntityReconstruction(universeId, incidentSlug)
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load timeline data');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [universeId, incidentSlug]);

    const allEvents = data?.phases.flatMap((p) => p.events) ?? [];
    const totalEvents = allEvents.length;
    const currentEvent = allEvents[currentIdx] ?? null;

    // Build phase map for each event index
    const eventPhaseMap = data?.phases.flatMap((phase, phaseIdx) =>
        phase.events.map(() => ({ name: phase.name, idx: phaseIdx })),
    ) ?? [];

    // Autoplay
    useEffect(() => {
        if (isPlaying && totalEvents > 0) {
            playRef.current = setInterval(() => {
                setCurrentIdx((prev) => {
                    if (prev >= totalEvents - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, AUTOPLAY_INTERVAL);
        }
        return () => {
            if (playRef.current) clearInterval(playRef.current);
        };
    }, [isPlaying, totalEvents]);

    const goTo = useCallback((idx: number) => {
        setCurrentIdx(Math.max(0, Math.min(idx, totalEvents - 1)));
    }, [totalEvents]);

    const goPrev = () => { setIsPlaying(false); goTo(currentIdx - 1); };
    const goNext = () => { setIsPlaying(false); goTo(currentIdx + 1); };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current || totalEvents <= 1) return;
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const idx = Math.round(pct * (totalEvents - 1));
        setIsPlaying(false);
        goTo(idx);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        setIsPlaying(false);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !trackRef.current || totalEvents <= 1) return;
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        goTo(Math.round(pct * (totalEvents - 1)));
    };

    const handlePointerUp = () => setIsDragging(false);

    const openEntity = (entity: ApiEntitySummary) => {
        openWindow({
            type: 'entity-dossier',
            title: `${entity.name} — DOSSIER`,
            icon: entity.entity_type?.icon ?? 'EN',
            props: { key: `entity-${universeId}-${entity.slug}`, universeId, entitySlug: entity.slug },
        });
    };

    // Collect all unique entities from all events as "roster"
    const roster = data?.entities ?? [];

    // Determine which entity IDs are "active" at current event (participants)
    const activeEntityIds = new Set<number>();
    if (currentEvent) {
        getParticipants(currentEvent).forEach((p) => {
            if (p.entity?.id) activeEntityIds.add(p.entity.id);
        });
    }

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                <div className="text-center">
                    <div className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        LOADING TEMPORAL DATA
                    </div>
                    <div className="arc-mono mt-1 text-[9px] text-[var(--arc-text-muted)]">
                        CALIBRATING CHRONOMETER...
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <span className="arc-mono text-xs font-medium text-[var(--arc-danger)]">
                    {error || 'TEMPORAL DATA UNAVAILABLE'}
                </span>
            </div>
        );
    }

    if (totalEvents === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <Clock className="size-6 text-[var(--arc-text-muted)]/40" />
                <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">NO EVENTS TO DISPLAY</span>
            </div>
        );
    }

    const pct = totalEvents > 1 ? (currentIdx / (totalEvents - 1)) * 100 : 50;
    const currentPhase = eventPhaseMap[currentIdx];

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-3">
                <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        TEMPORAL SLIDER
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {data.incident.name}
                    </span>
                </div>
            </div>

            {/* Slider Track Area */}
            <div className="border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-4 pt-4 pb-3">
                {/* Phase segments */}
                <div className="flex items-center gap-0.5 mb-2">
                    {data.phases.map((phase, idx) => (
                        <div
                            key={phase.name}
                            className={cn('h-1 rounded-full flex-1 transition-opacity', PHASE_BG_COLORS[idx % PHASE_BG_COLORS.length])}
                            style={{ flex: phase.events.length }}
                            title={phase.name}
                        />
                    ))}
                </div>

                {/* Track */}
                <div
                    ref={trackRef}
                    className="relative h-8 cursor-pointer select-none"
                    onClick={handleTrackClick}
                >
                    {/* Track baseline */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--arc-border)]" />

                    {/* Progress fill */}
                    <div
                        className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--arc-accent)] transition-[width]"
                        style={{ width: `${pct}%`, transitionDuration: isDragging ? '0ms' : '200ms' }}
                    />

                    {/* Event markers */}
                    {allEvents.map((event, idx) => {
                        const x = totalEvents > 1 ? (idx / (totalEvents - 1)) * 100 : 50;
                        const isActive = idx === currentIdx;
                        const isPast = idx < currentIdx;
                        const severity = getAttr(event, 'significance');
                        return (
                            <button
                                key={event.id}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
                                style={{ left: `${x}%` }}
                                onClick={(e) => { e.stopPropagation(); setIsPlaying(false); goTo(idx); }}
                                title={event.name}
                            >
                                <div className={cn(
                                    'rounded-full transition-all',
                                    isActive
                                        ? 'size-4 border-2 border-[var(--arc-accent)] shadow-[0_0_6px_var(--arc-accent)]'
                                        : isPast
                                            ? 'size-2.5 border border-[var(--arc-accent)]/60'
                                            : 'size-2 border border-[var(--arc-border-strong)]',
                                    severity
                                        ? SEVERITY_COLORS[severity] ?? 'bg-[var(--arc-surface)]'
                                        : isActive
                                            ? 'bg-[var(--arc-accent)]'
                                            : isPast
                                                ? 'bg-[var(--arc-accent)]/40'
                                                : 'bg-[var(--arc-surface)]',
                                )} />
                            </button>
                        );
                    })}

                    {/* Draggable handle */}
                    <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                        style={{ left: `${pct}%`, transitionProperty: isDragging ? 'none' : 'left', transitionDuration: '200ms' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <div className="size-5 rounded border-2 border-[var(--arc-accent)] bg-[var(--arc-surface)] shadow-lg" />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <button className="arc-btn p-1" onClick={goPrev} disabled={currentIdx === 0}>
                            <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                            className="arc-btn p-1"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        </button>
                        <button className="arc-btn p-1" onClick={goNext} disabled={currentIdx >= totalEvents - 1}>
                            <ChevronRight className="size-3.5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {currentPhase && (
                            <span className="arc-mono rounded bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--arc-text-muted)]">
                                PHASE: {currentPhase.name.toUpperCase()}
                            </span>
                        )}
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            EVENT {currentIdx + 1} / {totalEvents}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Current event card */}
                <div className="flex-1 overflow-y-auto p-4">
                    {currentEvent && (
                        <div className="arc-animate-window-open" key={currentEvent.id}>
                            {/* Event header */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                {getAttr(currentEvent, 'date') && (
                                    <span className="arc-mono rounded bg-[var(--arc-accent)]/8 px-1.5 py-0.5 text-[10px] font-bold text-[var(--arc-accent)]">
                                        {getAttr(currentEvent, 'date')}
                                    </span>
                                )}
                                {getAttr(currentEvent, 'significance') && (
                                    <span className={cn(
                                        'arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                        SEVERITY_TEXT[getAttr(currentEvent, 'significance')!],
                                        `${SEVERITY_COLORS[getAttr(currentEvent, 'significance')!]?.replace('bg-', 'bg-')}/10`,
                                    )}>
                                        {getAttr(currentEvent, 'significance')}
                                    </span>
                                )}
                                {getAttr(currentEvent, 'duration') && (
                                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                        <Clock className="mr-0.5 inline size-2.5" />
                                        {getAttr(currentEvent, 'duration')}
                                    </span>
                                )}
                                {getAttr(currentEvent, 'outcome') && (
                                    <span className="arc-mono rounded bg-[var(--arc-text-muted)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--arc-text-muted)]">
                                        {getAttr(currentEvent, 'outcome')}
                                    </span>
                                )}
                            </div>

                            <h2 className="text-lg font-bold text-[var(--arc-text)]">
                                {currentEvent.name}
                            </h2>

                            {currentEvent.short_description && (
                                <p className="mt-1 text-sm text-[var(--arc-text-muted)]">
                                    {currentEvent.short_description}
                                </p>
                            )}

                            {getAttr(currentEvent, 'casualties') && (
                                <div className="mt-1 arc-mono text-[9px] text-[var(--arc-danger)]">
                                    CASUALTIES: {getAttr(currentEvent, 'casualties')}
                                </div>
                            )}

                            {/* Narrative — from sections or content */}
                            {(() => {
                                const narSection = (currentEvent.sections ?? []).find((s: any) => s.slug === 'narrative' || s.slug === 'narrative-reconstruction');
                                const narContent = narSection?.content ?? currentEvent.content;
                                return narContent ? (
                                    <div className="mt-3 rounded border border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/5 p-3">
                                        <div
                                            className="text-sm leading-relaxed text-[var(--arc-text)] prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: narContent }}
                                        />
                                    </div>
                                ) : null;
                            })()}

                            {/* Location */}
                            {getLocation(currentEvent) && (
                                <div className="mt-3 flex items-center gap-2">
                                    <MapPin className="size-3 text-emerald-400" />
                                    <button
                                        className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--arc-accent)]"
                                        onClick={() => openEntity(getLocation(currentEvent)!)}
                                    >
                                        <TypeIcon entityType={getLocation(currentEvent)!.entity_type} size="sm" />
                                        <span className="font-medium text-[var(--arc-text)]">{getLocation(currentEvent)!.name}</span>
                                        <span className="arc-mono text-[9px] text-[var(--arc-accent)]">→</span>
                                    </button>
                                </div>
                            )}

                            {/* Participants */}
                            {getParticipants(currentEvent).length > 0 && (
                                <div className="mt-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Users className="size-3 text-[var(--arc-warning)]" />
                                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                                            PARTICIPANTS
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {getParticipants(currentEvent).map((p, idx) => (
                                            <div key={p.entity?.id ?? idx} className="flex items-center gap-2 rounded bg-[var(--arc-surface-alt)] px-2 py-1.5">
                                                <button
                                                    className="flex items-center gap-1 text-xs transition-colors hover:text-[var(--arc-accent)]"
                                                    onClick={() => p.entity && openEntity(p.entity)}
                                                    disabled={!p.entity}
                                                >
                                                    {p.entity && <TypeIcon entityType={p.entity.entity_type} size="sm" />}
                                                    <span className="font-medium text-[var(--arc-text)]">{p.entity?.name ?? 'Unknown'}</span>
                                                </button>
                                                {p.description && (
                                                    <span className="arc-mono rounded bg-[var(--arc-accent)]/8 px-1.5 py-0.5 text-[9px] text-[var(--arc-accent)]">
                                                        {p.description}
                                                    </span>
                                                )}
                                                {p.status && (
                                                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                        → {p.status}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Intelligence at this point */}
                            {currentEvent.intelligence_records && currentEvent.intelligence_records.length > 0 && (
                                <div className="mt-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Eye className="size-3 text-[var(--arc-warning)]" />
                                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                                            INTELLIGENCE REVEALED
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {currentEvent.intelligence_records.map((rec) => (
                                            <IntelCard key={rec.id} record={rec} onOpenEntity={openEntity} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right sidebar: Entity roster */}
                {roster.length > 0 && (
                    <div className="w-[180px] shrink-0 border-l border-[var(--arc-border)] bg-[var(--arc-surface-alt)] overflow-y-auto">
                        <div className="sticky top-0 z-10 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-2">
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                                ENTITY ROSTER
                            </span>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                            {roster.map((entity) => {
                                const isActive = activeEntityIds.has(entity.id);
                                return (
                                    <button
                                        key={entity.id}
                                        className={cn(
                                            'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left transition-all',
                                            isActive
                                                ? 'bg-[var(--arc-accent)]/10 border border-[var(--arc-accent)]/30'
                                                : 'border border-transparent opacity-40 hover:opacity-70',
                                        )}
                                        onClick={() => openEntity(entity)}
                                    >
                                        <TypeIcon entityType={entity.entity_type} size="sm" />
                                        <span className={cn(
                                            'text-[10px] font-medium truncate',
                                            isActive ? 'text-[var(--arc-text)]' : 'text-[var(--arc-text-muted)]',
                                        )}>
                                            {entity.name}
                                        </span>
                                        {isActive && (
                                            <div className="ml-auto size-1.5 rounded-full bg-[var(--arc-accent)] animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-1.5">
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    TEMPORAL RECORD #{data.incident.id.toString().padStart(4, '0')}
                </span>
                {currentEvent && getAttr(currentEvent, 'date') && (
                    <span className="arc-mono text-[9px] font-bold text-[var(--arc-accent)]">
                        {getAttr(currentEvent, 'date')}
                    </span>
                )}
            </div>
        </div>
    );
}

/*  Compact Intel Card  */

function IntelCard({
    record,
    onOpenEntity,
}: {
    record: ApiEntityIntelligenceRecord;
    onOpenEntity: (entity: ApiEntitySummary) => void;
}) {
    return (
        <div className="flex items-start gap-2 rounded bg-[var(--arc-bg)] px-2 py-1.5 border border-[var(--arc-border)]">
            <span className={cn(
                'mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[8px] font-bold uppercase',
                CLASS_COLORS[record.classification] ?? CLASS_COLORS.unknown,
            )}>
                {record.classification}
            </span>
            <div className="flex-1 min-w-0">
                {record.intelligence_summary && (
                    <p className="text-[10px] leading-relaxed text-[var(--arc-text)]">
                        {record.intelligence_summary}
                    </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                    {record.observer && (
                        <button
                            className="flex items-center gap-0.5 text-[9px] transition-colors hover:text-[var(--arc-accent)]"
                            onClick={() => onOpenEntity(record.observer!)}
                        >
                            <TypeIcon entityType={record.observer.entity_type} size="sm" />
                            <span className="text-[var(--arc-text-muted)]">{record.observer.name}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
