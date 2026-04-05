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
    Scan,
    ShieldAlert,
    Sparkles,
    Sword,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EntityQuickPreview } from '@/components/archives/entity-quick-preview';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, ApiEntityIntelligenceRecord, ApiEntitySummary, ApiReconstructionResponse } from '@/types/api';

type Props = {
    universeId: number;
    incidentSlug: string;
    initialEventSlug?: string;
};

/*  helpers  */

function getAttr(entity: ApiEntity, slug: string): string | null {
    const attr = entity.attributes?.find((a: any) => a.definition?.slug === slug);
    return attr?.value ?? null;
}

function getParticipants(entity: ApiEntity): Array<{ entity: ApiEntitySummary; description: string | null; context: string | null; status: string | null }> {
    return (entity.incoming_relations ?? [])
        .filter((r: any) => r.relation_type?.slug === 'participated-in')
        .map((r: any) => ({
            entity: r.from_entity,
            description: r.description,
            context: r.context,
            status: r.status,
        }));
}

function getLocation(entity: ApiEntity): ApiEntitySummary | null {
    const rel = (entity.outgoing_relations ?? []).find((r: any) => r.relation_type?.slug === 'located-at');
    return rel?.to_entity ?? null;
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

const THREAT_BORDER: Record<string, string> = {
    none: 'border-l-[var(--arc-border)]',
    low: 'border-l-[var(--arc-text-muted)]',
    moderate: 'border-l-[var(--arc-warning)]',
    high: 'border-l-orange-400',
    severe: 'border-l-orange-500',
    critical: 'border-l-[var(--arc-danger)]',
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

const PHASE_COLORS = [
    'border-[var(--arc-accent)]',
    'border-cyan-500',
    'border-amber-500',
    'border-emerald-500',
    'border-rose-500',
    'border-violet-500',
    'border-sky-400',
    'border-orange-400',
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

/*  main component  */

export function EventReconstruction({ universeId, incidentSlug, initialEventSlug }: Props) {
    const [data, setData] = useState<ApiReconstructionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(initialEventSlug ?? null);
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.fetchEntityReconstruction(universeId, incidentSlug)
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
                if (!initialEventSlug && res.data.phases.length > 0 && res.data.phases[0].events.length > 0) {
                    setSelectedSlug(res.data.phases[0].events[0].slug);
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load reconstruction');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [universeId, incidentSlug]);

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

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                <div className="text-center">
                    <div className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        RECONSTRUCTING EVENTS
                    </div>
                    <div className="arc-mono mt-1 text-[9px] text-[var(--arc-text-muted)]">
                        CROSS-REFERENCING INTELLIGENCE DATA...
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
                    {error || 'RECONSTRUCTION FAILED'}
                </span>
            </div>
        );
    }

    const allEvents = data.phases.flatMap((p) => p.events);
    const selectedEvent = allEvents.find((e) => e.slug === selectedSlug) ?? null;
    const selectedIdx = allEvents.findIndex((e) => e.slug === selectedSlug);

    const togglePhase = (phaseName: string) => {
        setCollapsedPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseName)) next.delete(phaseName);
            else next.add(phaseName);
            return next;
        });
    };

    const goTo = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, allEvents.length - 1));
        setSelectedSlug(allEvents[clamped].slug);
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        EVENT RECONSTRUCTION
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        #{data.incident.id.toString().padStart(4, '0')}
                    </span>
                </div>
                <h1 className="mt-1.5 text-base font-bold text-[var(--arc-text)]">
                    {data.incident.name}
                </h1>
                <div className="mt-1 flex items-center gap-3">
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {data.phases.length} PHASE{data.phases.length !== 1 ? 'S' : ''}
                    </span>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {allEvents.length} EVENT{allEvents.length !== 1 ? 'S' : ''}
                    </span>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                        {data.entities.length} SUBJECT{data.entities.length !== 1 ? 'S' : ''}
                    </span>
                </div>
            </div>

            {/* Body: split left/right */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Phase-grouped event chain */}
                <div className="w-[340px] shrink-0 overflow-y-auto border-r border-[var(--arc-border)] bg-[var(--arc-bg)]">
                    {data.phases.map((phase, phaseIdx) => {
                        const isCollapsed = collapsedPhases.has(phase.name);
                        const phaseColor = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
                        return (
                            <div key={phase.name}>
                                {/* Phase header */}
                                <button
                                    className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-2 text-left"
                                    onClick={() => togglePhase(phase.name)}
                                >
                                    <ChevronRight
                                        className={cn('size-3 text-[var(--arc-text-muted)] transition-transform', !isCollapsed && 'rotate-90')}
                                    />
                                    <div className={cn('h-3 w-1 rounded-full', phaseColor.replace('border-', 'bg-'))} />
                                    <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-text)]">
                                        {phase.name.toUpperCase()}
                                    </span>
                                    <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                                        {phase.events.length}
                                    </span>
                                </button>

                                {/* Events */}
                                {!isCollapsed && (
                                    <div className="relative">
                                        {/* Vertical line */}
                                        <div className={cn('absolute left-[19px] top-0 bottom-0 w-0.5', phaseColor.replace('border-', 'bg-'), 'opacity-20')} />

                                        {phase.events.map((event) => {
                                            const isSelected = event.slug === selectedSlug;
                                            const dateVal = getAttr(event, 'date');
                                            const timeVal = getAttr(event, 'time');
                                            const sigVal = getAttr(event, 'significance');
                                            const threatVal = getAttr(event, 'threat-level');
                                            const eventTypeVal = getAttr(event, 'event-type');
                                            const participants = getParticipants(event);
                                            return (
                                                <button
                                                    key={event.id}
                                                    className={cn(
                                                        'relative flex w-full gap-3 px-3 py-2.5 text-left transition-colors border-l-2',
                                                        threatVal ? (THREAT_BORDER[threatVal] ?? 'border-l-[var(--arc-border)]') : 'border-l-transparent',
                                                        isSelected
                                                            ? 'bg-[var(--arc-accent)]/8 border-r-2 border-r-[var(--arc-accent)]'
                                                            : 'hover:bg-[var(--arc-surface-hover)]',
                                                    )}
                                                    onClick={() => setSelectedSlug(event.slug)}
                                                >
                                                    {/* Node */}
                                                    <div className="relative z-10 flex size-5 shrink-0 items-center justify-center">
                                                        {eventTypeVal && EVENT_TYPE_ICON[eventTypeVal] ? (
                                                            <div className={cn('flex items-center justify-center rounded-full size-5', isSelected ? EVENT_TYPE_COLORS[eventTypeVal] : 'text-[var(--arc-text-muted)]')}>
                                                                {EVENT_TYPE_ICON[eventTypeVal]}
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className={cn(
                                                                    'size-2.5 rounded-full border-2',
                                                                    isSelected
                                                                        ? 'border-[var(--arc-accent)] bg-[var(--arc-accent)]'
                                                                        : 'border-[var(--arc-border-strong)] bg-[var(--arc-surface)]',
                                                                )}
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {dateVal && (
                                                                <span className="arc-mono text-[9px] font-bold text-[var(--arc-accent)]">
                                                                    {dateVal}
                                                                </span>
                                                            )}
                                                            {timeVal && timeVal !== 'unknown' && (
                                                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                                    {timeVal}
                                                                </span>
                                                            )}
                                                            {sigVal && (
                                                                <span className={cn('arc-mono rounded-none px-1 py-0.5 text-[8px] font-bold uppercase', SEVERITY_COLORS[sigVal] ?? SEVERITY_COLORS.medium)}>
                                                                    {sigVal}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 text-xs font-medium text-[var(--arc-text)] truncate">
                                                            {event.name}
                                                        </div>
                                                        <div className="mt-0.5 flex items-center gap-2">
                                                            {eventTypeVal && (
                                                                <span className={cn('arc-mono flex items-center gap-0.5 rounded-none px-1 py-0.5 text-[8px] font-bold uppercase', EVENT_TYPE_COLORS[eventTypeVal] ?? 'text-[var(--arc-text-muted)]')}>
                                                                    {eventTypeVal}
                                                                </span>
                                                            )}
                                                            {participants.length > 0 && (
                                                                <span className="flex items-center gap-0.5 text-[9px] text-[var(--arc-text-muted)]">
                                                                    <Users className="size-2.5" />
                                                                    {participants.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* RIGHT: Event detail panel */}
                <div className="flex-1 overflow-y-auto bg-[var(--arc-bg)]">
                    {selectedEvent ? (
                        <EventDetailPanel
                            event={selectedEvent}
                            allEvents={allEvents}
                            currentIdx={selectedIdx}
                            universeId={universeId}
                            onOpenEntity={openEntity}
                            onOpenDossier={openEventDossier}
                            onNavigate={goTo}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2">
                            <Sparkles className="size-6 text-[var(--arc-text-muted)]/40" />
                            <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                SELECT AN EVENT TO RECONSTRUCT
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-1.5">
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    RECONSTRUCTION #{data.incident.id.toString().padStart(4, '0')}
                </span>
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    CLASSIFICATION: ACTIVE
                </span>
            </div>
        </div>
    );
}

/*  Event Detail Panel  */

function EventDetailPanel({
    event,
    allEvents,
    currentIdx,
    universeId,
    onOpenEntity,
    onOpenDossier,
    onNavigate,
}: {
    event: ApiEntity;
    allEvents: ApiEntity[];
    currentIdx: number;
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

    const participantIds = useMemo(() => new Set(participants.map((p) => p.entity?.id).filter(Boolean)), [participants]);
    const crossRefs = useMemo(() => {
        if (participantIds.size === 0) return [];
        return allEvents
            .filter((e) => e.id !== event.id)
            .map((e) => {
                const eParts = getParticipants(e);
                const shared = eParts.filter((p) => p.entity?.id && participantIds.has(p.entity.id));
                return { event: e, sharedCount: shared.length };
            })
            .filter((x) => x.sharedCount > 0)
            .sort((a, b) => b.sharedCount - a.sharedCount);
    }, [allEvents, event.id, participantIds]);

    const isCritical = significanceVal === 'critical' || significanceVal === 'extinction-level';

    const dataRows: Array<{ label: string; value: string }> = [];
    if (yearVal) dataRows.push({ label: 'YEAR', value: yearVal });
    if (dateVal) dataRows.push({ label: 'DATE', value: dateVal });
    if (timeVal) dataRows.push({ label: 'TIME', value: timeVal === 'unknown' ? 'UNKNOWN' : timeVal });
    if (durationVal) dataRows.push({ label: 'DURATION', value: durationVal });
    if (phaseVal) dataRows.push({ label: 'PHASE', value: phaseVal.toUpperCase() });
    if (outcomeVal) dataRows.push({ label: 'OUTCOME', value: outcomeVal });

    return (
        <div className="relative p-4 space-y-4 arc-animate-window-open" key={event.id}>
            {/* CLASSIFIED stamp for critical events */}
            {/* {isCritical && (
                <div className="pointer-events-none absolute right-6 top-6 z-10 rotate-[-12deg] select-none">
                    <div className="arc-mono rounded-none border-2 border-[var(--arc-danger)]/40 px-3 py-1 text-[11px] font-black tracking-[0.3em] text-[var(--arc-danger)]/25">
                        CLASSIFIED
                    </div>
                </div>
            )} */}

            {/* Event header block */}
            <div>
                {/* Top row: type badge + open dossier */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {eventTypeVal && (
                            <span className={cn('arc-mono flex items-center gap-1 rounded-none px-1.5 py-0.5 text-[9px] font-bold uppercase', EVENT_TYPE_COLORS[eventTypeVal] ?? 'text-[var(--arc-text-muted)] bg-[var(--arc-text-muted)]/10')}>
                                {EVENT_TYPE_ICON[eventTypeVal]}
                                {eventTypeVal}
                            </span>
                        )}
                        {threatVal && (
                            <span className={cn('arc-mono rounded-none px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[threatVal] ?? SEVERITY_COLORS.moderate)}>
                                THREAT: {threatVal}
                            </span>
                        )}
                        {significanceVal && (
                            <span className={cn('arc-mono rounded-none px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_COLORS[significanceVal] ?? SEVERITY_COLORS.medium)}>
                                {significanceVal}
                            </span>
                        )}
                    </div>
                    
                    {isCritical && (
                        <div className="arc-mono border-2 border-[var(--arc-danger)] px-3 py-1 text-[11px] font-black tracking-[0.3em] text-[var(--arc-danger)]">
                            CLASSIFIED
                        </div>
                    )}
                    <button
                        className="flex items-center gap-1 rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1 text-[9px] font-bold transition-colors hover:border-[var(--arc-accent)] hover:text-[var(--arc-accent)]"
                        onClick={() => onOpenDossier(event)}
                    >
                        <ExternalLink className="size-2.5" />
                        <span className="arc-mono tracking-[0.1em]">OPEN DOSSIER</span>
                    </button>
                </div>

                <h2 className="text-lg font-bold text-[var(--arc-text)]">
                    {event.name}
                </h2>

                {event.short_description && (
                    <p className="mt-1 text-sm leading-relaxed text-[var(--arc-text-muted)]">
                        {event.short_description}
                    </p>
                )}

                {/* Structured event data table */}
                {dataRows.length > 0 && (
                    <div className="mt-3 rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] overflow-hidden">
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

                {casualtiesVal && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-none border border-[var(--arc-danger)]/20 bg-[var(--arc-danger)]/5 px-2.5 py-1.5">
                        <AlertCircle className="size-3 shrink-0 text-[var(--arc-danger)]" />
                        <span className="arc-mono text-[9px] font-bold text-[var(--arc-danger)]">
                            CASUALTIES: {casualtiesVal}
                        </span>
                    </div>
                )}

                {/* Narrative block */}
                {narrativeContent && (
                    <div className="mt-3 rounded-none border border-[var(--arc-accent)]/20 bg-[var(--arc-accent)]/5 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="size-3 text-[var(--arc-accent)]" />
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                NARRATIVE RECONSTRUCTION
                            </span>
                        </div>
                        <div
                            className="text-sm leading-relaxed text-[var(--arc-text)] prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: narrativeContent }}
                        />
                    </div>
                )}
            </div>

            {/* Location */}
            {location && (
                <div className="rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
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
                            <span className="text-sm font-medium text-[var(--arc-text)]">
                                {location.name}
                            </span>
                            <span className="arc-mono text-[9px] text-[var(--arc-accent)]">→ DOSSIER</span>
                        </button>
                    </EntityQuickPreview>
                </div>
            )}

            {/* Participants */}
            {participants.length > 0 && (
                <div className="rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Users className="size-3 text-[var(--arc-warning)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            INVOLVED PERSONNEL
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]" />
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {participants.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {participants.map((p, idx) => (
                            <div
                                key={p.entity?.id ?? idx}
                                className="flex items-start gap-2 rounded-none bg-[var(--arc-surface-alt)] px-2.5 py-2"
                            >
                                {p.entity ? (
                                    <EntityQuickPreview universeId={universeId} entitySlug={p.entity.slug} entityName={p.entity.name} side="right">
                                        <button
                                            className="flex items-center gap-1.5 text-left transition-colors hover:text-[var(--arc-accent)]"
                                            onClick={() => p.entity && onOpenEntity(p.entity)}
                                        >
                                            <TypeIcon entityType={p.entity.entity_type} size="sm" />
                                            <span className="text-xs font-medium text-[var(--arc-text)]">
                                                {p.entity.name}
                                            </span>
                                        </button>
                                    </EntityQuickPreview>
                                ) : (
                                    <span className="text-xs font-medium text-[var(--arc-text-muted)]">Unknown</span>
                                )}
                                <div className="flex flex-1 flex-wrap items-center gap-2 ml-auto">
                                    {p.description && (
                                        <span className="arc-mono rounded-none bg-[var(--arc-accent)]/8 px-1.5 py-0.5 text-[9px] font-bold text-[var(--arc-accent)]">
                                            {p.description}
                                        </span>
                                    )}
                                    {p.status && (
                                        <span className={cn(
                                            'arc-mono rounded-none px-1.5 py-0.5 text-[9px] font-bold',
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

            {/* Sequential Navigation */}
            <div className="flex items-center justify-between border-t border-[var(--arc-border)] pt-3">
                <button
                    className={cn(
                        'flex items-center gap-1 rounded-none border border-[var(--arc-border)] px-2.5 py-1.5 text-[9px] font-bold transition-colors',
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
                        'flex items-center gap-1 rounded-none border border-[var(--arc-border)] px-2.5 py-1.5 text-[9px] font-bold transition-colors',
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
        <div className="rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
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
                                className="flex w-full items-center gap-2 rounded-none bg-[var(--arc-bg)] border border-[var(--arc-border)] px-2.5 py-2 text-left transition-colors hover:border-[var(--arc-accent)]"
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
                                <span className="arc-mono shrink-0 rounded-none bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400">
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
        <div className="rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <Eye className="size-3 text-[var(--arc-warning)]" />
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                    INTELLIGENCE DISCOVERED
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
                                'rounded-none border bg-[var(--arc-bg)] transition-all',
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
                                    'rounded-none border px-1.5 py-0.5 text-[8px] font-bold uppercase',
                                    CLASS_COLORS[rec.classification] ?? CLASS_COLORS.unknown,
                                )}>
                                    {rec.classification}
                                </span>
                                {isDeclassified && (
                                    <span className="arc-mono rounded-none bg-[var(--arc-success)]/10 px-1 py-0.5 text-[7px] font-bold text-[var(--arc-success)]">
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
                                        <div className="relative flex items-start gap-1.5 rounded-none bg-[var(--arc-danger)]/5 border border-[var(--arc-danger)]/20 px-2 py-1.5 overflow-hidden">
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
