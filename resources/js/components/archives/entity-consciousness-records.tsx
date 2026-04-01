import { Brain, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityConsciousnessRecord } from '@/types/api';

type Props = {
    records: ApiEntityConsciousnessRecord[];
    universeId: number;
};

const STATUS_COLORS: Record<string, string> = {
    active: 'text-[var(--arc-success)] border-[var(--arc-success)]',
    transferred: 'text-[var(--arc-accent)] border-[var(--arc-accent)]',
    dormant: 'text-[var(--arc-warning)] border-[var(--arc-warning)]',
    fragmented: 'text-purple-400 border-purple-400',
    merged: 'text-blue-400 border-blue-400',
    destroyed: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    digital: 'text-cyan-400 border-cyan-400',
    shared: 'text-orange-400 border-orange-400',
};

const METHOD_LABELS: Record<string, string> = {
    ritual: 'Occult Ritual',
    technology: 'Technological Transfer',
    parasitic: 'Parasitic Takeover',
    viral: 'Viral Integration',
    psychic: 'Psychic Imprint',
    forced: 'Forced Transfer',
    voluntary: 'Voluntary Transfer',
};

export function EntityConsciousnessRecords({ records, universeId }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);
    const { openWindow } = useWindowStore();

    const openEntity = (slug: string, name: string, icon?: string | null) => {
        openWindow({
            type: 'entity-dossier',
            title: `${name}  DOSSIER`,
            icon: icon ?? 'EN',
            props: { key: `entity-${universeId}-${slug}`, universeId, entitySlug: slug },
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Brain className="size-3.5 text-purple-400" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    CONSCIOUSNESS STATUS LOG
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {records.length} RECORD{records.length !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="arc-stagger space-y-1">
                {records.map((rec) => {
                    const isExpanded = expanded === rec.id;
                    return (
                        <div
                            key={rec.id}
                            className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] transition-colors"
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 px-3 py-2 text-left"
                                onClick={() => setExpanded(isExpanded ? null : rec.id)}
                            >
                                <ChevronRight className="arc-chevron size-3 text-[var(--arc-text-muted)]" data-open={isExpanded} />
                                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_COLORS[rec.status] ?? 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]')}>
                                    {rec.status}
                                </span>
                                <span className="text-xs font-medium text-[var(--arc-text)]">
                                    {rec.vessel?.name ? `→ ${rec.vessel.name}` : 'Original Vessel'}
                                </span>
                                {rec.fictional_date_start && (
                                    <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                                        {rec.fictional_date_start}
                                        {rec.fictional_date_end && `  ${rec.fictional_date_end}`}
                                    </span>
                                )}
                            </button>

                            <div className="arc-collapse" data-open={isExpanded}>
                                <div className="arc-collapse-inner">
                                <div className="border-t border-[var(--arc-border)] px-3 py-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        {rec.transfer_method && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">TRANSFER METHOD</span>
                                                <p className="text-[var(--arc-text)]">{METHOD_LABELS[rec.transfer_method] ?? rec.transfer_method}</p>
                                            </div>
                                        )}
                                        {rec.vessel_status && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">VESSEL STATUS</span>
                                                <p className="uppercase text-[var(--arc-text)]">{rec.vessel_status}</p>
                                            </div>
                                        )}
                                        {rec.vessel && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">VESSEL</span>
                                                <button
                                                    type="button"
                                                    className="mt-0.5 flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                    onClick={() => openEntity(rec.vessel!.slug, rec.vessel!.name, rec.vessel!.entity_type?.icon)}
                                                >
                                                    <TypeIcon entityType={rec.vessel.entity_type} size="sm" />
                                                    {rec.vessel.name}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {rec.description && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DESCRIPTION</span>
                                            <p className="mt-0.5 text-[var(--arc-text-muted)]">{rec.description}</p>
                                        </div>
                                    )}
                                    {rec.side_effects && rec.side_effects.length > 0 && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">SIDE EFFECTS</span>
                                            <ul className="mt-0.5 list-inside list-disc text-[var(--arc-text-muted)]">
                                                {rec.side_effects.map((effect, i) => (
                                                    <li key={i}>{effect}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {rec.notes && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">NOTES</span>
                                            <p className="mt-0.5 text-[var(--arc-text-muted)]">{rec.notes}</p>
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
