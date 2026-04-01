import { ChevronRight, EyeOff, Radio, Signal, User } from 'lucide-react';
import { useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityTransmissionRecord, ApiEntityTransmissionRelation } from '@/types/api';

type Props = {
    participants: ApiEntityTransmissionRelation[];
    records: ApiEntityTransmissionRecord[];
    universeId: number;
};

const ROLE_COLORS: Record<string, string> = {
    speaker: 'text-[var(--arc-accent)] border-[var(--arc-accent)]',
    listener: 'text-sky-400 border-sky-400',
    interceptor: 'text-amber-400 border-amber-400',
    location: 'text-emerald-400 border-emerald-400',
    mentioned: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    moderator: 'text-purple-400 border-purple-400',
};

const ROLE_LABELS: Record<string, string> = {
    speaker: 'SPEAKER',
    listener: 'LISTENER',
    interceptor: 'INTERCEPTOR',
    location: 'LOCATION',
    mentioned: 'MENTIONED',
    moderator: 'MODERATOR',
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
    dialogue: '',
    narration: 'italic text-[var(--arc-text-muted)]',
    action: 'italic text-amber-300/80',
    static: 'text-[var(--arc-text-muted)] line-through decoration-dotted',
    system: 'arc-mono text-[var(--arc-accent)]/70',
    redacted: 'bg-[var(--arc-danger)]/10 text-[var(--arc-danger)]',
};

const TONE_INDICATORS: Record<string, { label: string; color: string }> = {
    calm: { label: 'CALM', color: 'text-sky-300' },
    urgent: { label: 'URGENT', color: 'text-amber-400' },
    panicked: { label: 'PANICKED', color: 'text-[var(--arc-danger)]' },
    whispered: { label: 'WHISPERED', color: 'text-[var(--arc-text-muted)]' },
    screaming: { label: 'SCREAMING', color: 'text-[var(--arc-danger)] font-bold' },
    cold: { label: 'COLD', color: 'text-sky-400' },
    sarcastic: { label: 'SARCASTIC', color: 'text-purple-300' },
};

// Assign consistent speaker colors from a palette
const SPEAKER_PALETTE = [
    'text-[var(--arc-accent)]',
    'text-sky-400',
    'text-amber-400',
    'text-emerald-400',
    'text-purple-400',
    'text-rose-400',
    'text-teal-400',
    'text-orange-400',
];

export function EntityTransmissionLog({ participants, records, universeId }: Props) {
    const [showParticipants, setShowParticipants] = useState(false);
    const { openWindow } = useWindowStore();

    const openEntity = (slug: string, name: string, icon?: string | null) => {
        openWindow({
            type: 'entity-dossier',
            title: `${name}  DOSSIER`,
            icon: icon ?? 'EN',
            props: { key: `entity-${universeId}-${slug}`, universeId, entitySlug: slug },
        });
    };

    // Build a speaker color map
    const speakerColorMap = new Map<number | string, string>();
    let colorIdx = 0;
    for (const rec of records) {
        const key = rec.speaker_entity_id ?? rec.speaker_label ?? '_unknown';
        if (!speakerColorMap.has(key)) {
            speakerColorMap.set(key, SPEAKER_PALETTE[colorIdx % SPEAKER_PALETTE.length]);
            colorIdx++;
        }
    }

    const getSpeakerColor = (rec: ApiEntityTransmissionRecord) => {
        const key = rec.speaker_entity_id ?? rec.speaker_label ?? '_unknown';
        return speakerColorMap.get(key) ?? 'text-[var(--arc-text-muted)]';
    };

    const getSpeakerName = (rec: ApiEntityTransmissionRecord) => {
        if (rec.speaker) return rec.speaker.name;
        if (rec.speaker_label) return rec.speaker_label;
        return 'Unknown';
    };

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Radio className="size-3.5 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    TRANSMISSION LOG
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {records.length} LINE{records.length !== 1 ? 'S' : ''}
                </span>
            </div>

            {/* Participants roster (collapsible) */}
            {participants.length > 0 && (
                <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
                    <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left"
                        onClick={() => setShowParticipants(!showParticipants)}
                    >
                        <ChevronRight className="arc-chevron size-3 text-[var(--arc-text-muted)]" data-open={showParticipants} />
                        <Signal className="size-3 text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-wider text-[var(--arc-accent)]">
                            PARTICIPANTS
                        </span>
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            ({participants.length})
                        </span>
                    </button>
                    <div className="arc-collapse" data-open={showParticipants}>
                        <div className="arc-collapse-inner">
                        <div className="border-t border-[var(--arc-border)] px-3 py-2">
                            <div className="grid gap-1.5">
                                {participants.map((p) => (
                                    <div key={p.id} className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase',
                                                ROLE_COLORS[p.role] ?? 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
                                            )}
                                        >
                                            {ROLE_LABELS[p.role] ?? p.role}
                                        </span>
                                        {p.participant ? (
                                            <button
                                                className="flex items-center gap-1 text-xs text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                onClick={() =>
                                                    openEntity(
                                                        p.participant!.slug,
                                                        p.participant!.name,
                                                        p.participant!.entity_type?.icon,
                                                    )
                                                }
                                            >
                                                <TypeIcon entityType={p.participant.entity_type} size="sm" />
                                                <span>{p.participant.name}</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-[var(--arc-text-muted)]">Unknown</span>
                                        )}
                                        {p.callsign && (
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                [{p.callsign}]
                                            </span>
                                        )}
                                        {p.channel && (
                                            <span className="arc-mono text-[9px] text-sky-400/70">
                                                CH: {p.channel}
                                            </span>
                                        )}
                                        {!p.is_present && (
                                            <span className="text-[8px] italic text-[var(--arc-text-muted)]">
                                                (not present)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transmission content */}
            <div className="space-y-0.5 rounded border border-[var(--arc-border)] bg-[var(--arc-bg)] p-2">
                {records.map((rec) => {
                    const color = getSpeakerColor(rec);

                    if (rec.content_type === 'narration' || rec.content_type === 'action') {
                        return (
                            <div key={rec.id} className="px-2 py-1">
                                {rec.fictional_timestamp && (
                                    <span className="arc-mono mr-2 text-[8px] text-[var(--arc-text-muted)]">
                                        [{rec.fictional_timestamp}]
                                    </span>
                                )}
                                <span className={cn('text-xs', CONTENT_TYPE_STYLES[rec.content_type])}>
                                    {rec.content_type === 'action' ? `* ${rec.content} *` : rec.content}
                                </span>
                            </div>
                        );
                    }

                    if (rec.content_type === 'static') {
                        return (
                            <div key={rec.id} className="flex items-center gap-2 px-2 py-1">
                                <Signal className="size-3 text-[var(--arc-text-muted)]" />
                                <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                     static 
                                </span>
                                {rec.notes && (
                                    <span className="text-[9px] italic text-[var(--arc-text-muted)]">
                                        {rec.notes}
                                    </span>
                                )}
                            </div>
                        );
                    }

                    if (rec.content_type === 'system') {
                        return (
                            <div key={rec.id} className="px-2 py-1 text-center">
                                <span className="arc-mono text-[9px] text-[var(--arc-accent)]/60">
                                    [{rec.content}]
                                </span>
                            </div>
                        );
                    }

                    if (rec.is_redacted) {
                        return (
                            <div key={rec.id} className="flex items-center gap-2 rounded bg-[var(--arc-danger)]/5 px-2 py-1.5">
                                <EyeOff className="size-3 shrink-0 text-[var(--arc-danger)]" />
                                <span className="arc-mono text-[9px] font-bold text-[var(--arc-danger)]">
                                    [REDACTED]
                                </span>
                                {rec.redacted_reason && (
                                    <span className="text-[9px] italic text-[var(--arc-danger)]/60">
                                        {rec.redacted_reason}
                                    </span>
                                )}
                            </div>
                        );
                    }

                    // Default: dialogue
                    return (
                        <div key={rec.id} className="group flex gap-2 rounded px-2 py-1 hover:bg-[var(--arc-surface)]/50">
                            <div className="flex shrink-0 items-baseline gap-1.5">
                                {rec.fictional_timestamp && (
                                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                        [{rec.fictional_timestamp}]
                                    </span>
                                )}
                                {rec.speaker ? (
                                    <button
                                        className={cn('arc-mono text-[10px] font-bold underline-offset-2 hover:underline', color)}
                                        onClick={() =>
                                            openEntity(
                                                rec.speaker!.slug,
                                                rec.speaker!.name,
                                                rec.speaker!.entity_type?.icon,
                                            )
                                        }
                                    >
                                        {getSpeakerName(rec)}:
                                    </button>
                                ) : (
                                    <span className={cn('arc-mono text-[10px] font-bold', color)}>
                                        <User className="mr-0.5 inline size-2.5" />
                                        {getSpeakerName(rec)}:
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-xs text-[var(--arc-text)]">{rec.content}</span>
                                {rec.tone && TONE_INDICATORS[rec.tone] && (
                                    <span
                                        className={cn(
                                            'ml-1.5 arc-mono text-[8px]',
                                            TONE_INDICATORS[rec.tone].color,
                                        )}
                                    >
                                        [{TONE_INDICATORS[rec.tone].label}]
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
