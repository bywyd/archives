import { Skull, ChevronRight, Heart } from 'lucide-react';
import { useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityDeathRecord } from '@/types/api';

type Props = {
    records: ApiEntityDeathRecord[];
    universeId: number;
};

const DEATH_TYPE_COLORS: Record<string, string> = {
    killed: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    sacrificed: 'text-amber-400 border-amber-400',
    executed: 'text-[var(--arc-danger)] border-[var(--arc-danger)] bg-[var(--arc-danger)]/10',
    suicide: 'text-purple-400 border-purple-400',
    accidental: 'text-orange-400 border-orange-400',
    presumed: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    'mutation-death': 'text-purple-500 border-purple-500',
    disintegrated: 'text-red-500 border-red-500 bg-red-500/10',
};

const DEATH_TYPE_LABELS: Record<string, string> = {
    killed: 'KILLED',
    sacrificed: 'SACRIFICED',
    executed: 'EXECUTED',
    suicide: 'SUICIDE',
    accidental: 'ACCIDENTAL',
    presumed: 'PRESUMED DEAD',
    'mutation-death': 'MUTATION DEATH',
    disintegrated: 'DISINTEGRATED',
};

const REVIVAL_LABELS: Record<string, string> = {
    'viral-reanimation': 'Viral Reanimation',
    'consciousness-transfer': 'Consciousness Transfer',
    cloning: 'Cloning',
    megamycete: 'Megamycete Reconstruction',
    'flask-reassembly': 'Flask Reassembly',
    resurrection: 'Resurrection',
};

export function EntityDeathRecords({ records, universeId }: Props) {
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
                <Skull className="size-3.5 text-[var(--arc-danger)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    DEATH & REVIVAL LOG
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {records.length} RECORD{records.length !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="arc-stagger space-y-1">
                {records.map((rec) => {
                    const isOpen = expanded === rec.id;
                    return (
                        <div
                            key={rec.id}
                            className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] transition-colors"
                        >
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-left"
                                onClick={() => setExpanded(isOpen ? null : rec.id)}
                            >
                                <ChevronRight className="arc-chevron size-3 text-[var(--arc-text-muted)]" data-open={isOpen} />
                                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', DEATH_TYPE_COLORS[rec.death_type] ?? DEATH_TYPE_COLORS.killed)}>
                                    {DEATH_TYPE_LABELS[rec.death_type] ?? rec.death_type}
                                </span>
                                {rec.is_revived && (
                                    <span className="flex items-center gap-0.5 rounded border border-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                                        <Heart className="size-2.5" />
                                        REVIVED
                                    </span>
                                )}
                                {rec.cause_of_death && (
                                    <span className="truncate text-xs text-[var(--arc-text-muted)]">
                                        {rec.cause_of_death}
                                    </span>
                                )}
                                {rec.fictional_date && (
                                    <span className="arc-mono ml-auto shrink-0 text-[9px] text-[var(--arc-text-muted)]">
                                        {rec.fictional_date}
                                    </span>
                                )}
                            </button>

                            <div className="arc-collapse" data-open={isOpen}>
                                <div className="arc-collapse-inner">
                                <div className="border-t border-[var(--arc-border)] px-3 py-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        {rec.killer && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">KILLED BY</span>
                                                <button
                                                    className="mt-0.5 flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                    onClick={(e) => { e.stopPropagation(); openEntity(rec.killer!.slug, rec.killer!.name, rec.killer!.entity_type?.icon); }}
                                                >
                                                    <TypeIcon entityType={rec.killer.entity_type} size="sm" />
                                                    <span>{rec.killer.name}</span>
                                                </button>
                                            </div>
                                        )}
                                        {rec.incident && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DURING INCIDENT</span>
                                                <button
                                                    className="mt-0.5 flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                    onClick={(e) => { e.stopPropagation(); openEntity(rec.incident!.slug, rec.incident!.name, rec.incident!.entity_type?.icon); }}
                                                >
                                                    <TypeIcon entityType={rec.incident.entity_type} size="sm" />
                                                    <span>{rec.incident.name}</span>
                                                </button>
                                            </div>
                                        )}
                                        {rec.location && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">LOCATION</span>
                                                <button
                                                    className="mt-0.5 flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                    onClick={(e) => { e.stopPropagation(); openEntity(rec.location!.slug, rec.location!.name, rec.location!.entity_type?.icon); }}
                                                >
                                                    <TypeIcon entityType={rec.location.entity_type} size="sm" />
                                                    <span>{rec.location.name}</span>
                                                </button>
                                            </div>
                                        )}
                                        {!rec.is_confirmed && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-warning)]">⚠ UNCONFIRMED</span>
                                                <p className="text-[var(--arc-warning)]">Death has not been officially confirmed</p>
                                            </div>
                                        )}
                                    </div>

                                    {rec.circumstances && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">CIRCUMSTANCES</span>
                                            <p className="mt-0.5 text-[var(--arc-text-muted)]">{rec.circumstances}</p>
                                        </div>
                                    )}

                                    {rec.is_revived && (
                                        <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                                            <span className="arc-mono flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                                <Heart className="size-3" />
                                                REVIVAL RECORD
                                            </span>
                                            <div className="mt-1 grid grid-cols-2 gap-2">
                                                {rec.revival_method && (
                                                    <div>
                                                        <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">METHOD</span>
                                                        <p className="text-emerald-300">{REVIVAL_LABELS[rec.revival_method] ?? rec.revival_method}</p>
                                                    </div>
                                                )}
                                                {rec.fictional_date_revived && (
                                                    <div>
                                                        <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DATE REVIVED</span>
                                                        <p className="text-[var(--arc-text)]">{rec.fictional_date_revived}</p>
                                                    </div>
                                                )}
                                                {rec.revived_by && (
                                                    <div>
                                                        <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">REVIVED BY</span>
                                                        <button
                                                            className="mt-0.5 flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                            onClick={(e) => { e.stopPropagation(); openEntity(rec.revived_by!.slug, rec.revived_by!.name, rec.revived_by!.entity_type?.icon); }}
                                                        >
                                                            <TypeIcon entityType={rec.revived_by.entity_type} size="sm" />
                                                            <span>{rec.revived_by.name}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {rec.revival_circumstances && (
                                                <div className="mt-1">
                                                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">REVIVAL DETAILS</span>
                                                    <p className="mt-0.5 text-[var(--arc-text-muted)]">{rec.revival_circumstances}</p>
                                                </div>
                                            )}
                                            {rec.body_modifications && rec.body_modifications.length > 0 && (
                                                <div className="mt-1">
                                                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">POST-REVIVAL MODIFICATIONS</span>
                                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                                        {rec.body_modifications.map((mod, i) => (
                                                            <span key={i} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-300">
                                                                {mod}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
