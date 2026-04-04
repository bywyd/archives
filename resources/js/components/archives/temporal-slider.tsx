import {
    AlertCircle,
    Bug,
    ChevronLeft,
    ChevronRight,
    Clock,
    Crosshair,
    DoorOpen,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    Flame,
    Link2,
    Loader2,
    MapPin,
    Pause,
    Play,
    Scan,
    ShieldAlert,
    Sword,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EntityQuickPreview } from '@/components/archives/entity-quick-preview';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, ApiEntityIntelligenceRecord, ApiEntitySummary, ApiReconstructionResponse } from '@/types/api';

type Props = {
    universeId: number;
    incidentSlug: string;
};

/*  helpers  */

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

/*  colour / icon maps  */

const SEVERITY_COLORS: Record<string, string> = {
    low: 'text-[var(--arc-text-muted)] bg-[var(--arc-text-muted)]/10',
    medium: 'text-[var(--arc-warning)] bg-[var(--arc-warning)]/10',
    moderate: 'text-[var(--arc-warning)] bg-[var(--arc-warning)]/10',
    high: 'text-orange-400 bg-orange-400/10',
    severe: 'text-orange-500 bg-orange-500/10',
    critical: 'text-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    'extinction-level': 'text-[var(--arc-danger)] bg-[var(--arc-danger)]/20 animate-pulse',
};

const SEVERITY_DOT: Record<string, string> = {
    low: 'bg-[var(--arc-text-muted)]',
    medium: 'bg-[var(--arc-warning)]',
    moderate: 'bg-[var(--arc-warning)]',
    high: 'bg-orange-400',
    severe: 'bg-orange-500',
    critical: 'bg-[var(--arc-danger)]',
    'extinction-level': 'bg-[var(--arc-danger)] animate-pulse',
};

const THREAT_BORDER: Record<string, string> = {
    none: 'border-l-[var(--arc-border)]',
    low: 'border-l-[var(--arc-text-muted)]',
    moderate: 'border-l-[var(--arc-warning)]',
    high: 'border-l-orange-400',
    severe: 'border-l-orange-500',
    critical: 'border-l-[var(--arc-danger)]',
};

const THREAT_MARKER: Record<string, string> = {
    none: 'border-[var(--arc-border-strong)]',
    low: 'border-[var(--arc-text-muted)]',
    moderate: 'border-[var(--arc-warning)]',
    high: 'border-orange-400',
    severe: 'border-orange-500',
    critical: 'border-[var(--arc-danger)]',
};

const EVENT_TYPE_ICON: Record<string, React.ReactNode> = {
    combat: <Sword className="size-2.5" />,
    discovery: <Scan className="size-2.5" />,
    escape: <DoorOpen className="size-2.5" />,
    infection: <Bug className="size-2.5" />,
    betrayal: <ShieldAlert className="size-2.5" />,
    investigation: <Crosshair className="size-2.5" />,
    catastrophe: <Flame className="size-2.5" />,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
    combat: 'text-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    discovery: 'text-cyan-400 bg-cyan-400/10',
    escape: 'text-emerald-400 bg-emerald-400/10',
    infection: 'text-violet-400 bg-violet-400/10',
    betrayal: 'text-[var(--arc-warning)] bg-[var(--arc-warning)]/10',
    investigation: 'text-[var(--arc-accent)] bg-[var(--arc-accent)]/10',
    catastrophe: 'text-orange-400 bg-orange-400/10',
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

const PHASE_TEXT_COLORS = [
    'text-[var(--arc-accent)]',
    'text-cyan-500',
    'text-amber-500',
    'text-emerald-500',
    'text-rose-500',
    'text-violet-500',
    'text-sky-400',
    'text-orange-400',
];

const CLASS_COLORS: Record<string, string> = {
    known: 'text-[var(--arc-success)] border-[var(--arc-success)]',
    unknown: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    classified: 'text-[var(--arc-warning)] border-[var(--arc-warning)]',
    redacted: 'text-[var(--arc-danger)] border-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    partial: 'text-orange-400 border-orange-400',
    rumored: 'text-blue-400 border-blue-400',
    discovered: 'text-emerald-400 border-emerald-400',
};

const RELIABILITY_COLORS: Record<string, string> = {
    confirmed: 'text-[var(--arc-success)]',
    probable: 'text-cyan-400',
    suspected: 'text-[var(--arc-warning)]',
    unverified: 'text-[var(--arc-text-muted)]',
    disinformation: 'text-[var(--arc-danger)]',
};

const AUTOPLAY_INTERVAL = 4000;

/*  main component  */

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

    // Phase transition boundaries (index where new phase starts)
    const phaseBoundaries = useMemo(() => {
        if (!data) return [];
        const boundaries: number[] = [];
        let offset = 0;
        for (const phase of data.phases) {
            if (offset > 0) boundaries.push(offset);
            offset += phase.events.length;
        }
        return boundaries;
    }, [data]);

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

    const openEventDossier = (event: ApiEntity) => {
        openWindow({
            type: 'entity-dossier',
            title: `${event.name} — DOSSIER`,
            icon: 'EV',
            props: { key: `entity-${universeId}-${event.slug}`, universeId, entitySlug: event.slug },
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

    // Cross-references: events sharing participants with current
    const crossRefs = useMemo(() => {
        if (!currentEvent) return [];
        const curParticipantIds = new Set(
            getParticipants(currentEvent).map((p) => p.entity?.id).filter(Boolean),
        );
        if (curParticipantIds.size === 0) return [];
        return allEvents
            .filter((e) => e.id !== currentEvent.id)
            .map((e) => {
                const eParts = getParticipants(e);
                const shared = eParts.filter((p) => p.entity?.id && curParticipantIds.has(p.entity.id));
                return { event: e, sharedCount: shared.length };
            })
            .filter((x) => x.sharedCount > 0)
            .sort((a, b) => b.sharedCount - a.sharedCount);
    }, [allEvents, currentEvent]);

    /*  loading / error / empty states  */

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
                <div className="mt-1 flex items-center gap-3">
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {data.phases.length} PHASE{data.phases.length !== 1 ? 'S' : ''}
                    </span>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {totalEvents} EVENT{totalEvents !== 1 ? 'S' : ''}
                    </span>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {roster.length} SUBJECT{roster.length !== 1 ? 'S' : ''}
                    </span>
                </div>
            </div>

            {/* Slider Track Area */}
            <div className="border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-4 pt-4 pb-3">
                {/* Phase segments bar */}
                <div className="flex items-center gap-0.5 mb-1">
                    {data.phases.map((phase, idx) => (
                        <div
                            key={phase.name}
                            className="flex-1 flex flex-col items-center gap-0.5"
                            style={{ flex: phase.events.length }}
                        >
                            <div
                                className={cn('h-1 w-full rounded-full transition-opacity', PHASE_BG_COLORS[idx % PHASE_BG_COLORS.length])}
                                title={phase.name}
                            />
                            <span className={cn('arc-mono text-[7px] font-bold tracking-[0.1em] truncate max-w-full', PHASE_TEXT_COLORS[idx % PHASE_TEXT_COLORS.length])}>
                                {phase.name.toUpperCase()}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Track */}
                <div
                    ref={trackRef}
                    className="relative h-10 cursor-pointer select-none mt-1"
                    onClick={handleTrackClick}
                >
                    {/* Track baseline */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--arc-border)]" />

                    {/* Progress fill */}
                    <div
                        className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--arc-accent)] transition-[width]"
                        style={{ width: `${pct}%`, transitionDuration: isDragging ? '0ms' : '200ms' }}
                    />

                    {/* Phase transition dashed lines */}
                    {phaseBoundaries.map((bIdx) => {
                        const bPct = totalEvents > 1 ? (bIdx / (totalEvents - 1)) * 100 : 0;
                        return (
                            <div
                                key={`phase-b-${bIdx}`}
                                className="absolute top-0 bottom-0 w-px border-l border-dashed border-[var(--arc-border-strong)]/40"
                                style={{ left: `${bPct}%` }}
                            />
                        );
                    })}

                    {/* Event markers — colour-coded by threat level */}
                    {allEvents.map((event, idx) => {
                        const x = totalEvents > 1 ? (idx / (totalEvents - 1)) * 100 : 50;
                        const isActive = idx === currentIdx;
                        const isPast = idx < currentIdx;
                        const threatVal = getAttr(event, 'threat-level');
                        const eventTypeVal = getAttr(event, 'event-type');
                        const markerBorder = threatVal ? (THREAT_MARKER[threatVal] ?? 'border-[var(--arc-border-strong)]') : 'border-[var(--arc-border-strong)]';
                        const markerDot = threatVal ? (SEVERITY_DOT[threatVal] ?? 'bg-[var(--arc-surface)]') : undefined;

                        return (
                            <button
                                key={event.id}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
                                style={{ left: `${x}%` }}
                                onClick={(e) => { e.stopPropagation(); setIsPlaying(false); goTo(idx); }}
                                title={event.name}
                            >
                                {isActive ? (
                                    /* Active marker: show event type icon or large dot */
                                    <div className={cn(
                                        'flex items-center justify-center rounded-full size-6 border-2 shadow-[0_0_8px_var(--arc-accent)]',
                                        markerBorder,
                                        eventTypeVal && EVENT_TYPE_COLORS[eventTypeVal]
                                            ? EVENT_TYPE_COLORS[eventTypeVal]
                                            : 'bg-[var(--arc-accent)] text-white',
                                    )}>
                                        {eventTypeVal && EVENT_TYPE_ICON[eventTypeVal]
                                            ? EVENT_TYPE_ICON[eventTypeVal]
                                            : <div className="size-2 rounded-full bg-current" />
                                        }
                                    </div>
                                ) : (
                                    <div className={cn(
                                        'rounded-full transition-all border',
                                        isPast ? 'size-2.5' : 'size-2',
                                        markerBorder,
                                        markerDot
                                            ? markerDot
                                            : isPast
                                                ? 'bg-[var(--arc-accent)]/40'
                                                : 'bg-[var(--arc-surface)]',
                                        isPast && 'opacity-70',
                                    )} />
                                )}
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
                            <span className={cn(
                                'arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold',
                                PHASE_BG_COLORS[currentPhase.idx % PHASE_BG_COLORS.length],
                                PHASE_TEXT_COLORS[currentPhase.idx % PHASE_TEXT_COLORS.length],
                            )}>
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
                        <EventCard
                            event={currentEvent}
                            allEvents={allEvents}
                            currentIdx={currentIdx}
                            crossRefs={crossRefs}
                            universeId={universeId}
                            onOpenEntity={openEntity}
                            onOpenDossier={openEventDossier}
                            onNavigate={(idx) => { setIsPlaying(false); goTo(idx); }}
                        />
                    )}
                </div>

                {/* Right sidebar: Entity roster */}
                {roster.length > 0 && (
                    <RosterSidebar
                        roster={roster}
                        activeEntityIds={activeEntityIds}
                        universeId={universeId}
                        onOpenEntity={openEntity}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-1.5">
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    TEMPORAL RECORD #{data.incident.id.toString().padStart(4, '0')}
                </span>
                <div className="flex items-center gap-3">
                    {currentEvent && getAttr(currentEvent, 'year') && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {getAttr(currentEvent, 'year')}
                        </span>
                    )}
                    {currentEvent && getAttr(currentEvent, 'date') && (
                        <span className="arc-mono text-[9px] font-bold text-[var(--arc-accent)]">
                            {getAttr(currentEvent, 'date')}
                        </span>
                    )}
                    {currentEvent && getAttr(currentEvent, 'time') && getAttr(currentEvent, 'time') !== 'unknown' && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {getAttr(currentEvent, 'time')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/*  Event Card (main content panel)  */

function EventCard({
    event,
    allEvents,
    currentIdx,
    crossRefs,
    universeId,
    onOpenEntity,
    onOpenDossier,
    onNavigate,
}: {
    event: ApiEntity;
    allEvents: ApiEntity[];
    currentIdx: number;
    crossRefs: Array<{ event: ApiEntity; sharedCount: number }>;
    universeId: number;
    onOpenEntity: (entity: ApiEntitySummary) => void;
    onOpenDossier: (event: ApiEntity) => void;
    onNavigate: (idx: number) => void;
}) {
    const dateVal = getAttr(event, 'date');
    const yearVal = getAttr(event, 'year');
    const timeVal = getAttr(event, 'time');
    const durationVal = getAttr(event, 'duration');
    const phaseVal = getAttr(event, 'phase');
    const outcomeVal = getAttr(event, 'outcome');
    const casualtiesVal = getAttr(event, 'casualties');
    const significanceVal = getAttr(event, 'significance');
    const threatVal = getAttr(event, 'threat-level');
    const eventTypeVal = getAttr(event, 'event-type');
    const participants = getParticipants(event);
    const location = getLocation(event);
    const narrativeSection = (event.sections ?? []).find((s: any) => s.slug === 'narrative' || s.slug === 'narrative-reconstruction');
    const narrativeContent = narrativeSection?.content ?? event.content;

    const isCritical = significanceVal === 'critical' || significanceVal === 'extinction-level';

    const dataRows: Array<{ label: string; value: string }> = [];
    if (yearVal) dataRows.push({ label: 'YEAR', value: yearVal });
    if (dateVal) dataRows.push({ label: 'DATE', value: dateVal });
    if (timeVal) dataRows.push({ label: 'TIME', value: timeVal === 'unknown' ? 'UNKNOWN' : timeVal });
    if (durationVal) dataRows.push({ label: 'DURATION', value: durationVal });
    if (phaseVal) dataRows.push({ label: 'PHASE', value: phaseVal.toUpperCase() });
    if (outcomeVal) dataRows.push({ label: 'OUTCOME', value: outcomeVal });

    return (
        <div className="relative space-y-4 arc-animate-window-open" key={event.id}>
            {/* CLASSIFIED stamp for critical events */}
            {isCritical && (
                <div className="pointer-events-none absolute right-4 top-4 z-10 rotate-[-12deg] select-none">
                    <div className="arc-mono rounded border-2 border-[var(--arc-danger)]/40 px-3 py-1 text-[11px] font-black tracking-[0.3em] text-[var(--arc-danger)]/25">
                        CLASSIFIED
                    </div>
                </div>
            )}

            {/* Top row: type / threat badges + OPEN DOSSIER button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {eventTypeVal && (
                        <span className={cn('arc-mono flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', EVENT_TYPE_COLORS[eventTypeVal] ?? 'text-[var(--arc-text-muted)] bg-[var(--arc-text-muted)]/10')}>
                            {EVENT_TYPE_ICON[eventTypeVal]}
                            {eventTypeVal}
                        </span>
                    )}
                    {threatVal && (
                        <span className={cn('arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[threatVal] ?? SEVERITY_COLORS.moderate)}>
                            THREAT: {threatVal}
                        </span>
                    )}
                    {significanceVal && (
                        <span className={cn('arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[significanceVal] ?? SEVERITY_COLORS.medium)}>
                            {significanceVal}
                        </span>
                    )}
                </div>
                <button
                    className="flex items-center gap-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1 text-[9px] font-bold transition-colors hover:border-[var(--arc-accent)] hover:text-[var(--arc-accent)]"
                    onClick={() => onOpenDossier(event)}
                >
                    <ExternalLink className="size-2.5" />
                    <span className="arc-mono tracking-[0.1em]">OPEN DOSSIER</span>
                </button>
            </div>

            {/* Event name & description */}
            <div>
                <h2 className="text-lg font-bold text-[var(--arc-text)]">
                    {event.name}
                </h2>

                {event.short_description && (
                    <p className="mt-1 text-sm leading-relaxed text-[var(--arc-text-muted)]">
                        {event.short_description}
                    </p>
                )}
            </div>

            {/* Structured EVENT DATA table */}
            {dataRows.length > 0 && (
                <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-2.5 py-1.5">
                        <FileText className="size-2.5 text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                            EVENT DATA
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-[var(--arc-border)]">
                        {dataRows.map((row) => (
                            <div key={row.label} className="flex items-baseline gap-2 bg-[var(--arc-surface)] px-2.5 py-1.5">
                                <span className="arc-mono text-[9px] font-bold text-[var(--arc-text-muted)] shrink-0 w-16">
                                    {row.label}
                                </span>
                                <span className="text-[10px] font-medium text-[var(--arc-text)]">
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Casualties alert */}
            {casualtiesVal && (
                <div className="flex items-center gap-1.5 rounded border border-[var(--arc-danger)]/20 bg-[var(--arc-danger)]/5 px-2.5 py-1.5">
                    <AlertCircle className="size-3 shrink-0 text-[var(--arc-danger)]" />
                    <span className="arc-mono text-[9px] font-bold text-[var(--arc-danger)]">
                        CASUALTIES: {casualtiesVal}
                    </span>
                </div>
            )}

            {/* Narrative */}
            {narrativeContent && (
                <div className="rounded border border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/5 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="size-3 text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                            TEMPORAL NARRATIVE
                        </span>
                    </div>
                    <div
                        className="text-sm leading-relaxed text-[var(--arc-text)] prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: narrativeContent }}
                    />
                </div>
            )}

            {/* Location */}
            {location && (
                <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <MapPin className="size-3 text-emerald-400" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            LOCATION
                        </span>
                    </div>
                    <EntityQuickPreview universeId={universeId} entitySlug={location.slug} entityName={location.name} side="right">
                        <button
                            className="flex items-center gap-2 text-left transition-colors hover:text-[var(--arc-accent)]"
                            onClick={() => onOpenEntity(location)}
                        >
                            <TypeIcon entityType={location.entity_type} size="sm" />
                            <span className="text-sm font-medium text-[var(--arc-text)]">{location.name}</span>
                            <span className="arc-mono text-[9px] text-[var(--arc-accent)]">→ DOSSIER</span>
                        </button>
                    </EntityQuickPreview>
                </div>
            )}

            {/* Participants */}
            {participants.length > 0 && (
                <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Users className="size-3 text-[var(--arc-warning)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            PARTICIPANTS
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]" />
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {participants.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {participants.map((p, idx) => (
                            <div key={p.entity?.id ?? idx} className="flex items-start gap-2 rounded bg-[var(--arc-surface-alt)] px-2.5 py-2">
                                {p.entity ? (
                                    <EntityQuickPreview universeId={universeId} entitySlug={p.entity.slug} entityName={p.entity.name} side="right">
                                        <button
                                            className="flex items-center gap-1.5 text-left transition-colors hover:text-[var(--arc-accent)]"
                                            onClick={() => p.entity && onOpenEntity(p.entity)}
                                        >
                                            <TypeIcon entityType={p.entity.entity_type} size="sm" />
                                            <span className="text-xs font-medium text-[var(--arc-text)]">{p.entity.name}</span>
                                        </button>
                                    </EntityQuickPreview>
                                ) : (
                                    <span className="text-xs font-medium text-[var(--arc-text-muted)]">Unknown</span>
                                )}
                                <div className="flex flex-1 flex-wrap items-center gap-2 ml-auto">
                                    {p.description && (
                                        <span className="arc-mono rounded bg-[var(--arc-accent)]/8 px-1.5 py-0.5 text-[9px] font-bold text-[var(--arc-accent)]">
                                            {p.description}
                                        </span>
                                    )}
                                    {p.status && (
                                        <span className={cn(
                                            'arc-mono rounded px-1.5 py-0.5 text-[9px] font-bold',
                                            p.status.toLowerCase().includes('killed') || p.status.toLowerCase().includes('dead') || p.status.toLowerCase().includes('fatal')
                                                ? 'bg-[var(--arc-danger)]/10 text-[var(--arc-danger)]'
                                                : p.status.toLowerCase().includes('survived') || p.status.toLowerCase().includes('escaped')
                                                    ? 'bg-[var(--arc-success)]/10 text-[var(--arc-success)]'
                                                    : p.status.toLowerCase().includes('mutated')
                                                        ? 'bg-violet-500/10 text-violet-400'
                                                        : p.status.toLowerCase().includes('destroyed')
                                                            ? 'bg-[var(--arc-danger)]/10 text-[var(--arc-danger)]'
                                                            : 'bg-[var(--arc-text-muted)]/10 text-[var(--arc-text-muted)]',
                                        )}>
                                            {p.status}
                                        </span>
                                    )}
                                </div>
                                {p.context && (
                                    <p className="text-[10px] text-[var(--arc-text-muted)] mt-0.5 basis-full">
                                        {p.context}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Intelligence Records */}
            {event.intelligence_records && event.intelligence_records.length > 0 && (
                <IntelligenceSection records={event.intelligence_records} universeId={universeId} onOpenEntity={onOpenEntity} />
            )}

            {/* Cross-References */}
            {crossRefs.length > 0 && (
                <CrossReferencesSection crossRefs={crossRefs} allEvents={allEvents} onNavigate={onNavigate} />
            )}

            {/* Sequential navigation */}
            <div className="flex items-center justify-between border-t border-[var(--arc-border)] pt-3">
                <button
                    className={cn(
                        'flex items-center gap-1 rounded border border-[var(--arc-border)] px-2.5 py-1.5 text-[9px] font-bold transition-colors',
                        currentIdx > 0 ? 'hover:border-[var(--arc-accent)] hover:text-[var(--arc-accent)]' : 'opacity-30 cursor-not-allowed',
                    )}
                    onClick={() => onNavigate(currentIdx - 1)}
                    disabled={currentIdx <= 0}
                >
                    <ChevronLeft className="size-3" />
                    <span className="arc-mono tracking-[0.1em]">PREV EVENT</span>
                </button>
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    {currentIdx + 1} / {allEvents.length}
                </span>
                <button
                    className={cn(
                        'flex items-center gap-1 rounded border border-[var(--arc-border)] px-2.5 py-1.5 text-[9px] font-bold transition-colors',
                        currentIdx < allEvents.length - 1 ? 'hover:border-[var(--arc-accent)] hover:text-[var(--arc-accent)]' : 'opacity-30 cursor-not-allowed',
                    )}
                    onClick={() => onNavigate(currentIdx + 1)}
                    disabled={currentIdx >= allEvents.length - 1}
                >
                    <span className="arc-mono tracking-[0.1em]">NEXT EVENT</span>
                    <ChevronRight className="size-3" />
                </button>
            </div>
        </div>
    );
}

/*  Roster Sidebar  */

function RosterSidebar({
    roster,
    activeEntityIds,
    universeId,
    onOpenEntity,
}: {
    roster: ApiEntitySummary[];
    activeEntityIds: Set<number>;
    universeId: number;
    onOpenEntity: (entity: ApiEntitySummary) => void;
}) {
    // Group roster by entity type
    const grouped = useMemo(() => {
        const map = new Map<string, ApiEntitySummary[]>();
        for (const entity of roster) {
            const typeName = entity.entity_type?.name ?? 'Other';
            if (!map.has(typeName)) map.set(typeName, []);
            map.get(typeName)!.push(entity);
        }
        // Sort groups: active entities first within each group
        return Array.from(map.entries()).sort((a, b) => {
            const aActive = a[1].some((e) => activeEntityIds.has(e.id));
            const bActive = b[1].some((e) => activeEntityIds.has(e.id));
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            return a[0].localeCompare(b[0]);
        });
    }, [roster, activeEntityIds]);

    return (
        <div className="w-[200px] shrink-0 border-l border-[var(--arc-border)] bg-[var(--arc-surface-alt)] overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <Users className="size-2.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                        ENTITY ROSTER
                    </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                        {activeEntityIds.size} ACTIVE
                    </span>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                        {roster.length} TOTAL
                    </span>
                </div>
            </div>

            <div className="p-1.5 space-y-2">
                {grouped.map(([typeName, entities]) => {
                    const groupHasActive = entities.some((e) => activeEntityIds.has(e.id));
                    return (
                        <div key={typeName}>
                            <div className="flex items-center gap-1 px-1.5 py-1">
                                <span className={cn(
                                    'arc-mono text-[8px] font-bold tracking-[0.1em]',
                                    groupHasActive ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]',
                                )}>
                                    {typeName.toUpperCase()}
                                </span>
                                <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">({entities.length})</span>
                            </div>
                            <div className="space-y-0.5">
                                {entities.map((entity) => {
                                    const isActive = activeEntityIds.has(entity.id);
                                    return (
                                        <EntityQuickPreview
                                            key={entity.id}
                                            universeId={universeId}
                                            entitySlug={entity.slug}
                                            entityName={entity.name}
                                            side="left"
                                        >
                                            <button
                                                className={cn(
                                                    'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left transition-all',
                                                    isActive
                                                        ? 'bg-[var(--arc-accent)]/10 border border-[var(--arc-accent)]/30'
                                                        : 'border border-transparent opacity-40 hover:opacity-70',
                                                )}
                                                onClick={() => onOpenEntity(entity)}
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
                                        </EntityQuickPreview>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/*  Cross-References Section  */

function CrossReferencesSection({
    crossRefs,
    allEvents,
    onNavigate,
}: {
    crossRefs: Array<{ event: ApiEntity; sharedCount: number }>;
    allEvents: ApiEntity[];
    onNavigate: (idx: number) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
            <button
                className="flex w-full items-center gap-1.5 text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <ChevronRight className={cn('size-2.5 text-[var(--arc-text-muted)] transition-transform', isOpen && 'rotate-90')} />
                <Link2 className="size-3 text-cyan-400" />
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                    CROSS-REFERENCES
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    {crossRefs.length} LINKED EVENT{crossRefs.length !== 1 ? 'S' : ''}
                </span>
            </button>

            {isOpen && (
                <div className="mt-2 space-y-1">
                    {crossRefs.map((ref) => {
                        const refIdx = allEvents.findIndex((e) => e.id === ref.event.id);
                        const refDate = getAttr(ref.event, 'date');
                        const refType = getAttr(ref.event, 'event-type');
                        return (
                            <button
                                key={ref.event.id}
                                className="flex w-full items-center gap-2 rounded bg-[var(--arc-bg)] border border-[var(--arc-border)] px-2.5 py-2 text-left transition-colors hover:border-[var(--arc-accent)]"
                                onClick={() => refIdx >= 0 && onNavigate(refIdx)}
                            >
                                {refType && EVENT_TYPE_ICON[refType] && (
                                    <span className={cn('shrink-0', EVENT_TYPE_COLORS[refType])}>
                                        {EVENT_TYPE_ICON[refType]}
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-medium text-[var(--arc-text)] truncate">
                                        {ref.event.name}
                                    </div>
                                    {refDate && (
                                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{refDate}</span>
                                    )}
                                </div>
                                <span className="arc-mono shrink-0 rounded bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400">
                                    {ref.sharedCount} SHARED
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/*  Intelligence Section  */

function IntelligenceSection({
    records,
    universeId,
    onOpenEntity,
}: {
    records: ApiEntityIntelligenceRecord[];
    universeId: number;
    onOpenEntity: (entity: ApiEntitySummary) => void;
}) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <Eye className="size-3 text-[var(--arc-warning)]" />
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                    INTELLIGENCE REVEALED
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    {records.length} RECORD{records.length !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="space-y-1.5">
                {records.map((rec) => {
                    const isOpen = expandedId === rec.id;
                    const isDeclassified = !!rec.fictional_date_declassified;
                    return (
                        <div
                            key={rec.id}
                            className={cn(
                                'rounded border bg-[var(--arc-bg)] transition-all',
                                isDeclassified ? 'border-[var(--arc-success)]/30' : 'border-[var(--arc-border)]',
                            )}
                        >
                            <button
                                className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                                onClick={() => setExpandedId(isOpen ? null : rec.id)}
                            >
                                <ChevronRight
                                    className={cn('size-2.5 text-[var(--arc-text-muted)] transition-transform', isOpen && 'rotate-90')}
                                />
                                <span className={cn(
                                    'rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase',
                                    CLASS_COLORS[rec.classification] ?? CLASS_COLORS.unknown,
                                )}>
                                    {rec.classification}
                                </span>
                                {isDeclassified && (
                                    <span className="arc-mono rounded bg-[var(--arc-success)]/10 px-1 py-0.5 text-[7px] font-bold text-[var(--arc-success)]">
                                        DECLASSIFIED
                                    </span>
                                )}
                                {rec.observer && (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--arc-text)]">
                                        <TypeIcon entityType={rec.observer.entity_type} size="sm" />
                                        {rec.observer.name}
                                    </span>
                                )}
                                {rec.subject && (
                                    <>
                                        <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">RE:</span>
                                        <span className="text-[10px] text-[var(--arc-text)]">{rec.subject.name}</span>
                                    </>
                                )}
                            </button>

                            {isOpen && (
                                <div className="border-t border-[var(--arc-border)] px-2.5 py-2 space-y-2">
                                    {rec.intelligence_summary && (
                                        <p className="text-xs leading-relaxed text-[var(--arc-text)]">
                                            {rec.intelligence_summary}
                                        </p>
                                    )}

                                    {rec.redacted_details && (
                                        <div className="relative flex items-start gap-1.5 rounded bg-[var(--arc-danger)]/5 border border-[var(--arc-danger)]/20 px-2 py-1.5 overflow-hidden">
                                            <div className="pointer-events-none absolute inset-0 arc-scanlines opacity-20" />
                                            <EyeOff className="size-3 shrink-0 text-[var(--arc-danger)] mt-0.5" />
                                            <p className="text-[10px] font-mono text-[var(--arc-danger)]">
                                                {rec.redacted_details}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {rec.discovered_during && (
                                            <div className="text-[9px]">
                                                <span className="arc-mono font-bold text-[var(--arc-text-muted)]">DURING: </span>
                                                <span className="text-[var(--arc-text)]">{rec.discovered_during}</span>
                                            </div>
                                        )}
                                        {rec.source && (
                                            <div className="text-[9px]">
                                                <span className="arc-mono font-bold text-[var(--arc-text-muted)]">SOURCE: </span>
                                                <span className="text-[var(--arc-text)]">{rec.source}</span>
                                            </div>
                                        )}
                                        {rec.reliability && (
                                            <div className="text-[9px]">
                                                <span className="arc-mono font-bold text-[var(--arc-text-muted)]">RELIABILITY: </span>
                                                <span className={cn('font-bold uppercase', RELIABILITY_COLORS[rec.reliability])}>
                                                    {rec.reliability}
                                                </span>
                                            </div>
                                        )}
                                        {rec.fictional_date_learned && (
                                            <div className="text-[9px]">
                                                <span className="arc-mono font-bold text-[var(--arc-text-muted)]">LEARNED: </span>
                                                <span className="text-[var(--arc-text)]">{rec.fictional_date_learned}</span>
                                            </div>
                                        )}
                                        {rec.fictional_date_declassified && (
                                            <div className="text-[9px]">
                                                <span className="arc-mono font-bold text-[var(--arc-success)]">DECLASSIFIED: </span>
                                                <span className="text-[var(--arc-text)]">{rec.fictional_date_declassified}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Clickable observer/subject */}
                                    <div className="flex gap-3 pt-1 border-t border-[var(--arc-border)]">
                                        {rec.observer && (
                                            <EntityQuickPreview universeId={universeId} entitySlug={rec.observer.slug} entityName={rec.observer.name} side="right">
                                                <button
                                                    className="flex items-center gap-1 text-[9px] transition-colors hover:text-[var(--arc-accent)]"
                                                    onClick={() => onOpenEntity(rec.observer!)}
                                                >
                                                    <TypeIcon entityType={rec.observer.entity_type} size="sm" />
                                                    <span className="arc-mono font-bold text-[var(--arc-text-muted)]">OBSERVER:</span>
                                                    <span className="font-medium text-[var(--arc-text)]">{rec.observer.name}</span>
                                                </button>
                                            </EntityQuickPreview>
                                        )}
                                        {rec.subject && (
                                            <EntityQuickPreview universeId={universeId} entitySlug={rec.subject.slug} entityName={rec.subject.name} side="right">
                                                <button
                                                    className="flex items-center gap-1 text-[9px] transition-colors hover:text-[var(--arc-accent)]"
                                                    onClick={() => onOpenEntity(rec.subject!)}
                                                >
                                                    <TypeIcon entityType={rec.subject.entity_type} size="sm" />
                                                    <span className="arc-mono font-bold text-[var(--arc-text-muted)]">SUBJECT:</span>
                                                    <span className="font-medium text-[var(--arc-text)]">{rec.subject.name}</span>
                                                </button>
                                            </EntityQuickPreview>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
