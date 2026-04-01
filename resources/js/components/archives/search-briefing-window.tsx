import { AlertTriangle, FileSearch, Shield, Target } from 'lucide-react';
import type { ApiAdvancedSearchBriefing } from '@/types/api';

type Props = {
    briefing: ApiAdvancedSearchBriefing;
    queryRaw: string;
};

export function SearchBriefingWindow({ briefing, queryRaw }: Props) {
    const classColor =
        briefing.classification === 'HIGH CONFIDENCE'
            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
            : briefing.classification === 'MODERATE CONFIDENCE'
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
              : briefing.classification === 'NO DATA'
                ? 'text-red-400 border-red-500/30 bg-red-500/5'
                : 'text-[var(--arc-text-muted)] border-[var(--arc-border)] bg-[var(--arc-surface-alt)]';

    return (
        <div className="flex h-full flex-col">
            {/* Classification Header */}
            <div className="border-b border-[var(--arc-border)] p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Shield className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        INTELLIGENCE BRIEFING
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className={`arc-mono rounded border px-2 py-0.5 text-[9px] font-bold tracking-wider ${classColor}`}>
                        {briefing.classification}
                    </span>
                </div>
                <p className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                    QUERY: &quot;{queryRaw}&quot;
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Header Block */}
                <div className="border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                    <pre className="arc-mono whitespace-pre-wrap p-4 text-[11px] leading-relaxed text-[var(--arc-text)]">
                        {briefing.header}
                    </pre>
                </div>

                {/* Narrative */}
                {briefing.narrative && (
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <FileSearch className="size-3.5 text-[var(--arc-accent)]" />
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                SITUATION REPORT
                            </span>
                            <div className="h-px flex-1 bg-[var(--arc-border)]" />
                        </div>
                        <pre className="arc-mono whitespace-pre-wrap border-l-2 border-[var(--arc-accent)]/20 pl-3 text-[11px] leading-relaxed text-[var(--arc-text)]">
                            {briefing.narrative}
                        </pre>
                    </div>
                )}

                {/* Key Records */}
                {briefing.key_records.length > 0 && (
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <AlertTriangle className="size-3.5 text-amber-500" />
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-amber-500">
                                CRITICAL RECORDS
                            </span>
                            <div className="h-px flex-1 bg-[var(--arc-border)]" />
                        </div>
                        <div className="space-y-1.5">
                            {briefing.key_records.map((record, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2 border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2"
                                >
                                    <span className="arc-mono mt-0.5 shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-amber-500">
                                        {record.type}
                                    </span>
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-medium text-[var(--arc-text)]">
                                            {record.entity}
                                        </span>
                                        <span className="text-[11px] text-[var(--arc-text-muted)]">
                                            {'  '}{record.summary}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Query Metrics */}
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Target className="size-3.5 text-[var(--arc-text-muted)]" />
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            QUERY METRICS
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'MATCHES', value: briefing.query_metrics.total_matches },
                            { label: 'TOP SCORE', value: briefing.query_metrics.top_score },
                            { label: 'SIGNALS', value: briefing.query_metrics.signals_searched },
                            { label: 'KEYWORDS', value: briefing.query_metrics.keywords_detected },
                            { label: 'INTENT', value: (briefing.query_metrics.intent ?? 'GENERAL').toUpperCase() },
                            { label: 'ACTION CTX', value: briefing.query_metrics.action_context ? 'YES' : 'NO' },
                        ].map((m) => (
                            <div
                                key={m.label}
                                className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2 text-center"
                            >
                                <div className="arc-mono text-[14px] font-bold text-[var(--arc-accent)]">
                                    {m.value}
                                </div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">
                                    {m.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
