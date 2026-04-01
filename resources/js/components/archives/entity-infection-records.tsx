import { Activity, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityInfectionRecord } from '@/types/api';

type Props = {
    records: ApiEntityInfectionRecord[];
    universeId: number;
};

const STATUS_COLORS: Record<string, string> = {
    active: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    cured: 'text-[var(--arc-success)] border-[var(--arc-success)]',
    dormant: 'text-[var(--arc-warning)] border-[var(--arc-warning)]',
    fatal: 'text-[var(--arc-danger)] border-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    mutated: 'text-purple-400 border-purple-400',
    partial: 'text-orange-400 border-orange-400',
    unknown: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
};

export function EntityInfectionRecords({ records, universeId }: Props) {
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
                <Activity className="size-3.5 text-[var(--arc-danger)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    PATHOGEN EXPOSURE LOG
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
                                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_COLORS[rec.status] ?? STATUS_COLORS.unknown)}>
                                    {rec.status}
                                </span>
                                <span className="text-xs font-medium text-[var(--arc-text)]">
                                    {rec.pathogen?.name ?? rec.pathogen_name ?? 'Unknown Pathogen'}
                                </span>
                                {rec.fictional_date_infected && (
                                    <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                                        {rec.fictional_date_infected}
                                    </span>
                                )}
                            </button>

                            <div className="arc-collapse" data-open={isExpanded}>
                                <div className="arc-collapse-inner">
                                <div className="border-t border-[var(--arc-border)] px-3 py-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        {rec.infection_method && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">METHOD</span>
                                                <p className="text-[var(--arc-text)]">{rec.infection_method}</p>
                                            </div>
                                        )}
                                        {rec.severity && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">SEVERITY</span>
                                                <p className="text-[var(--arc-text)]">{rec.severity}</p>
                                            </div>
                                        )}
                                        {(rec.cure?.name ?? rec.cure_name) && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">CURE</span>
                                                <p className="text-[var(--arc-text)]">
                                                    {rec.cure ? (
                                                        <button
                                                            type="button"
                                                            className="text-[var(--arc-accent)] hover:underline"
                                                            onClick={() => openEntity(rec.cure!.slug, rec.cure!.name, rec.cure!.entity_type?.icon)}
                                                        >
                                                            {rec.cure.name}
                                                        </button>
                                                    ) : (
                                                        rec.cure_name
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        {rec.cure_method && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">CURE METHOD</span>
                                                <p className="text-[var(--arc-text)]">{rec.cure_method}</p>
                                            </div>
                                        )}
                                        {rec.fictional_date_cured && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DATE CURED</span>
                                                <p className="text-[var(--arc-text)]">{rec.fictional_date_cured}</p>
                                            </div>
                                        )}
                                    </div>

                                    {rec.pathogen && (
                                        <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--arc-border)] pt-2">
                                            <TypeIcon entityType={rec.pathogen.entity_type} size="sm" />
                                            <button
                                                type="button"
                                                className="text-[10px] font-medium text-[var(--arc-accent)] hover:underline"
                                                onClick={() => openEntity(rec.pathogen!.slug, rec.pathogen!.name, rec.pathogen!.entity_type?.icon)}
                                            >
                                                {rec.pathogen.name} → VIEW DOSSIER
                                            </button>
                                        </div>
                                    )}

                                    {rec.symptoms_exhibited && rec.symptoms_exhibited.length > 0 && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">SYMPTOMS</span>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {rec.symptoms_exhibited.map((s, i) => (
                                                    <span key={i} className="rounded bg-[var(--arc-danger)]/10 px-1.5 py-0.5 text-[9px] text-[var(--arc-danger)]">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {rec.side_effects && rec.side_effects.length > 0 && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">SIDE EFFECTS</span>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {rec.side_effects.map((s, i) => (
                                                    <span key={i} className="rounded bg-[var(--arc-warning)]/10 px-1.5 py-0.5 text-[9px] text-[var(--arc-warning)]">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {rec.notes && (
                                        <p className="mt-2 border-t border-[var(--arc-border)] pt-2 text-[10px] text-[var(--arc-text-muted)]">
                                            {rec.notes}
                                        </p>
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
