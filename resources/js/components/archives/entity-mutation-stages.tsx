import { Dna } from 'lucide-react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityMutationStage } from '@/types/api';

type Props = {
    stages: ApiEntityMutationStage[];
    universeId: number;
};

export function EntityMutationStages({ stages, universeId }: Props) {
    const { openWindow } = useWindowStore();

    const openEntity = (slug: string, name: string, icon?: string | null) => {
        openWindow({
            type: 'entity-dossier',
            title: `${name}  DOSSIER`,
            icon: icon ?? 'EN',
            props: { key: `entity-${universeId}-${slug}`, universeId, entitySlug: slug },
        });
    };

    const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Dna className="size-3.5 text-purple-400" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    MUTATION STAGES
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {sorted.length} STAGE{sorted.length !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="relative space-y-0">
                {/* Vertical connector line */}
                {sorted.length > 1 && (
                    <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-purple-400/20" />
                )}

                {sorted.map((stage) => (
                    <div key={stage.id} className="relative flex gap-3 pb-3">
                        {/* Stage number node */}
                        <div className="relative z-10 flex size-10 shrink-0 items-center justify-center">
                            <div className="flex size-7 items-center justify-center rounded-full border-2 border-purple-400 bg-[var(--arc-surface)] text-[10px] font-bold text-purple-400">
                                {stage.stage_number}
                            </div>
                        </div>

                        {/* Card */}
                        <div className="flex-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[var(--arc-text)]">
                                    {stage.name}
                                </span>
                                {stage.threat_level != null && (
                                    <ThreatMeter level={stage.threat_level} />
                                )}
                                {stage.is_reversible && (
                                    <span className="arc-mono rounded bg-[var(--arc-success)]/10 px-1 py-0.5 text-[8px] font-bold text-[var(--arc-success)]">
                                        REVERSIBLE
                                    </span>
                                )}
                            </div>

                            {stage.description && (
                                <p className="mt-1 text-[11px] text-[var(--arc-text-muted)]">
                                    {stage.description}
                                </p>
                            )}

                            {stage.trigger && (
                                <div className="mt-1.5">
                                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">TRIGGER: </span>
                                    <span className="text-[10px] text-[var(--arc-text)]">{stage.trigger}</span>
                                </div>
                            )}

                            <div className="mt-2 flex flex-wrap gap-3">
                                {stage.abilities_gained && stage.abilities_gained.length > 0 && (
                                    <div>
                                        <span className="arc-mono text-[9px] font-semibold text-[var(--arc-success)]">+GAINED</span>
                                        <div className="mt-0.5 flex flex-wrap gap-1">
                                            {stage.abilities_gained.map((a, i) => (
                                                <span key={i} className="rounded bg-[var(--arc-success)]/10 px-1.5 py-0.5 text-[9px] text-[var(--arc-success)]">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {stage.abilities_lost && stage.abilities_lost.length > 0 && (
                                    <div>
                                        <span className="arc-mono text-[9px] font-semibold text-[var(--arc-danger)]">-LOST</span>
                                        <div className="mt-0.5 flex flex-wrap gap-1">
                                            {stage.abilities_lost.map((a, i) => (
                                                <span key={i} className="rounded bg-[var(--arc-danger)]/10 px-1.5 py-0.5 text-[9px] text-[var(--arc-danger)]">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {stage.physical_changes && stage.physical_changes.length > 0 && (
                                <div className="mt-2">
                                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">PHYSICAL CHANGES</span>
                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                        {stage.physical_changes.map((c, i) => (
                                            <span key={i} className="rounded bg-purple-400/10 px-1.5 py-0.5 text-[9px] text-purple-400">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stage.trigger_entity && (
                                <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--arc-border)] pt-1.5">
                                    <TypeIcon entityType={stage.trigger_entity.entity_type} size="sm" />
                                    <button
                                        type="button"
                                        className="text-[10px] font-medium text-[var(--arc-accent)] hover:underline"
                                        onClick={() => openEntity(stage.trigger_entity!.slug, stage.trigger_entity!.name, stage.trigger_entity!.entity_type?.icon)}
                                    >
                                        {stage.trigger_entity.name} → VIEW DOSSIER
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ThreatMeter({ level }: { level: number }) {
    return (
        <div className="flex items-center gap-1">
            <span className="arc-mono text-[8px] font-semibold text-[var(--arc-text-muted)]">THREAT</span>
            <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-2 w-1 rounded-sm',
                            i < level
                                ? level >= 8 ? 'bg-[var(--arc-danger)]' : level >= 5 ? 'bg-[var(--arc-warning)]' : 'bg-[var(--arc-success)]'
                                : 'bg-[var(--arc-border)]',
                        )}
                    />
                ))}
            </div>
            <span className="arc-mono text-[8px] font-bold text-[var(--arc-text-muted)]">{level}/10</span>
        </div>
    );
}
