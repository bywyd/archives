import { Eye, EyeOff, ChevronRight, Shield, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityIntelligenceRecord } from '@/types/api';

type Props = {
    records: ApiEntityIntelligenceRecord[];
    universeId: number;
};

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
    suspected: 'text-[var(--arc-warning)]',
    unverified: 'text-[var(--arc-text-muted)]',
    disinformation: 'text-[var(--arc-danger)]',
};

export function EntityIntelligenceRecords({ records, universeId }: Props) {
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
                <Eye className="size-3.5 text-[var(--arc-warning)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    INTELLIGENCE DOSSIER
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
                                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', CLASS_COLORS[rec.classification] ?? CLASS_COLORS.unknown)}>
                                    {rec.classification}
                                </span>
                                {rec.observer && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--arc-text)]">
                                        <TypeIcon entityType={rec.observer.entity_type} size="sm" />
                                        {rec.observer.name}
                                    </span>
                                )}
                                {rec.subject && (
                                    <>
                                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">RE:</span>
                                        <span className="flex items-center gap-1 text-xs text-[var(--arc-text-muted)]">
                                            <TypeIcon entityType={rec.subject.entity_type} size="sm" />
                                            {rec.subject.name}
                                        </span>
                                    </>
                                )}
                                {rec.fictional_date_learned && (
                                    <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                                        {rec.fictional_date_learned}
                                    </span>
                                )}
                            </button>

                            <div className="arc-collapse" data-open={isOpen}>
                                <div className="arc-collapse-inner">
                                <div className="border-t border-[var(--arc-border)] px-3 py-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        {rec.discovered_during && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DISCOVERED DURING</span>
                                                <p className="text-[var(--arc-text)]">{rec.discovered_during}</p>
                                            </div>
                                        )}
                                        {rec.source && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">SOURCE</span>
                                                <p className="text-[var(--arc-text)]">{rec.source}</p>
                                            </div>
                                        )}
                                        {rec.reliability && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">RELIABILITY</span>
                                                <p className={cn('font-semibold uppercase', RELIABILITY_COLORS[rec.reliability] ?? '')}>
                                                    {rec.reliability}
                                                </p>
                                            </div>
                                        )}
                                        {rec.fictional_date_declassified && (
                                            <div>
                                                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DECLASSIFIED</span>
                                                <p className="text-[var(--arc-text)]">{rec.fictional_date_declassified}</p>
                                            </div>
                                        )}
                                    </div>

                                    {rec.intelligence_summary && (
                                        <div className="mt-2">
                                            <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">INTELLIGENCE SUMMARY</span>
                                            <p className="mt-0.5 text-[var(--arc-text-muted)]">{rec.intelligence_summary}</p>
                                        </div>
                                    )}

                                    {rec.redacted_details && (
                                        <div className="mt-2">
                                            <span className="arc-mono flex items-center gap-1 text-[9px] font-semibold text-[var(--arc-danger)]">
                                                <EyeOff className="size-3" />
                                                REDACTED / UNKNOWN DETAILS
                                            </span>
                                            <p className="mt-0.5 text-[var(--arc-danger)]/70 italic">{rec.redacted_details}</p>
                                        </div>
                                    )}

                                    <div className="mt-2 flex gap-2">
                                        {rec.observer && (
                                            <button
                                                className="flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                onClick={(e) => { e.stopPropagation(); openEntity(rec.observer!.slug, rec.observer!.name, rec.observer!.entity_type?.icon); }}
                                            >
                                                <Shield className="size-3" />
                                                <span className="arc-mono text-[9px]">OBSERVER DOSSIER →</span>
                                            </button>
                                        )}
                                        {rec.subject && (
                                            <button
                                                className="flex items-center gap-1 text-[var(--arc-accent)] underline-offset-2 hover:underline"
                                                onClick={(e) => { e.stopPropagation(); openEntity(rec.subject!.slug, rec.subject!.name, rec.subject!.entity_type?.icon); }}
                                            >
                                                <AlertTriangle className="size-3" />
                                                <span className="arc-mono text-[9px]">SUBJECT DOSSIER →</span>
                                            </button>
                                        )}
                                    </div>
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
