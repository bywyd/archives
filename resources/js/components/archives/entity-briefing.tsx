import { useEffect, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    FileSearch,
    Lock,
    MessageSquare,
    Shield,
    Star,
    Tag,
    Target,
    Users,
    Zap,
} from 'lucide-react';
import { fetchEntityBriefing } from '@/lib/api';
import type { ApiEntityBriefing } from '@/types/api';

type Props = {
    universeId: number;
    entitySlug: string;
};

//
// Small layout helpers
//

function SectionHeader({ icon, label, accent = false }: { icon: React.ReactNode; label: string; accent?: boolean }) {
    return (
        <div className="mb-2.5 flex items-center gap-2">
            <span className={accent ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]'}>
                {icon}
            </span>
            <span
                className={`arc-mono text-[9px] font-bold tracking-[0.2em] ${
                    accent ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]'
                }`}
            >
                {label}
            </span>
            <div className="h-px flex-1 bg-[var(--arc-border)]" />
        </div>
    );
}

function TypeBadge({ name, color }: { name: string; color: string | null }) {
    const c = color ?? '#6B7280';
    return (
        <span
            className="arc-mono inline-flex items-center rounded-none px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
            style={{ color: c, backgroundColor: `${c}18`, borderWidth: 1, borderColor: `${c}30` }}
        >
            {name}
        </span>
    );
}

function StatusChip({ name, color }: { name: string; color: string | null }) {
    const c = color ?? '#6B7280';
    return (
        <span
            className="arc-mono inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase"
            style={{ color: c, backgroundColor: `${c}18`, borderWidth: 1, borderColor: `${c}30` }}
        >
            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: c }} />
            {name}
        </span>
    );
}

function PowerBar({ level, max = 10 }: { level: number; max?: number }) {
    const pct = Math.min(100, Math.round((level / max) * 100));
    const barColor =
        pct >= 80 ? '#ef4444' :
        pct >= 60 ? '#f97316' :
        pct >= 40 ? '#eab308' :
        '#22c55e';

    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-sm bg-[var(--arc-surface-alt)] overflow-hidden">
                <div
                    className="h-full rounded-sm transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <span className="arc-mono text-[10px] font-bold" style={{ color: barColor }}>
                {level} / {max}
            </span>
        </div>
    );
}

function Chip({ label }: { label: string }) {
    return (
        <span className="arc-mono inline-block rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[9px] text-[var(--arc-text-muted)] tracking-wide">
            {label}
        </span>
    );
}

//
// Main component
//

export function EntityBriefing({ universeId, entitySlug }: Props) {
    const [briefing, setBriefing] = useState<ApiEntityBriefing | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchEntityBriefing(universeId, entitySlug)
            .then((res) => setBriefing(res.data))
            .catch((err) => setError((err as Error).message || 'Failed to load briefing.'))
            .finally(() => setLoading(false));
    }, [universeId, entitySlug]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center gap-2 arc-mono text-[10px] tracking-widest uppercase text-[var(--arc-text-muted)]">
                <span className="inline-block size-1.5 animate-pulse bg-[var(--arc-accent)]/50" />
                Compiling dossier…
            </div>
        );
    }

    if (error || !briefing) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400">
                <AlertTriangle className="size-5" />
                <p className="arc-mono text-[10px] tracking-wider">{error ?? 'Unknown error.'}</p>
            </div>
        );
    }

    const { subject, threat_assessment, network, history, classification, notable_quotes, generated_at } = briefing;

    const threatColors: Record<string, string> = {
        critical: '#dc2626', extreme: '#f97316', high: '#ef4444',
        medium: '#eab308', moderate: '#eab308', low: '#22c55e', none: '#6b7280',
    };
    const threatColor = threat_assessment.peak_threat_level
        ? (threatColors[threat_assessment.peak_threat_level.toLowerCase()] ?? '#6b7280')
        : '#6b7280';

    const infectionColors: Record<string, string> = {
        active: '#ef4444', chronic: '#f97316', dormant: '#eab308',
        cured: '#22c55e', recovered: '#22c55e', unknown: '#6b7280',
    };
    const infectionColor = threat_assessment.active_infection?.status
        ? (infectionColors[threat_assessment.active_infection.status.toLowerCase()] ?? '#6b7280')
        : '#6b7280';

    const genDate = new Date(generated_at);
    const genLabel = genDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
        + ' '
        + genDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex h-full flex-col font-sans">
            {/* Dossier header */}
            <div
                className="shrink-0 border-b border-[var(--arc-border)] px-5 py-4"
                style={{ borderTopWidth: 2, borderTopColor: subject.type?.color ?? 'var(--arc-accent)' }}
            >
                <div className="mb-1.5 flex items-center gap-2">
                    <FileSearch className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] font-bold tracking-[0.25em] text-[var(--arc-accent)]">
                        ENTITY DOSSIER - AUTO-BRIEFING
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{genLabel}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold leading-tight text-[var(--arc-text)]">
                            {subject.name}
                        </h1>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {subject.type && (
                                <TypeBadge name={subject.type.name} color={subject.type.color} />
                            )}
                            {subject.status && (
                                <StatusChip name={subject.status.name} color={subject.status.color} />
                            )}
                            {subject.is_featured && (
                                <span className="arc-mono inline-flex items-center gap-1 rounded-none border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-400">
                                    <Star className="size-2.5" />
                                    FEATURED
                                </span>
                            )}
                            {subject.is_locked && (
                                <span className="arc-mono inline-flex items-center gap-1 rounded-none border border-[var(--arc-classified)]/30 bg-[var(--arc-classified)]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--arc-classified)]">
                                    <Lock className="size-2.5" />
                                    CLASSIFIED
                                </span>
                            )}
                        </div>
                        {subject.aliases.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)] tracking-wider">AKA</span>
                                {subject.aliases.map((a, i) => (
                                    <span
                                        key={i}
                                        className="arc-mono inline-block rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[9px] text-[var(--arc-text-muted)] tracking-wide"
                                        title={a.context ?? undefined}
                                    >
                                        {a.alias}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-5 p-5">

                {/* SUBJECT */}
                <section>
                    <SectionHeader icon={<Shield className="size-3.5" />} label="SUBJECT PROFILE" accent />
                    <p className="text-[12px] leading-relaxed text-[var(--arc-text)]">
                        {subject.description ?? (
                            <span className="arc-mono italic text-[var(--arc-text-muted)]">No description on file.</span>
                        )}
                    </p>
                </section>

                {/* THREAT ASSESSMENT */}
                <section>
                    <SectionHeader icon={<Zap className="size-3.5" />} label="THREAT ASSESSMENT" />
                    <div className="space-y-2.5">
                        {/* Power */}
                        {threat_assessment.top_power ? (
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">PRIMARY POWER</span>
                                        <p className="text-[12px] font-semibold text-[var(--arc-text)]">
                                            {threat_assessment.top_power.name}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                            {threat_assessment.top_power.category && (
                                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{threat_assessment.top_power.category}</span>
                                            )}
                                            {threat_assessment.top_power.source && (
                                                <span className="arc-mono rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1 py-px text-[8px] text-[var(--arc-text-muted)] tracking-wide">
                                                    {threat_assessment.top_power.source}
                                                </span>
                                            )}
                                            {threat_assessment.top_power.fictional_date_acquired && (
                                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                    acq. {threat_assessment.top_power.fictional_date_acquired}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {threat_assessment.top_power.status && (
                                        <span className="arc-mono shrink-0 rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[9px] text-[var(--arc-text-muted)] tracking-wider uppercase">
                                            {threat_assessment.top_power.status}
                                        </span>
                                    )}
                                </div>
                                <PowerBar level={threat_assessment.top_power.level} max={threat_assessment.top_power.max_level} />
                                {threat_assessment.top_power.description && (
                                    <p className="arc-mono mt-2 text-[10px] italic text-[var(--arc-text-muted)] leading-relaxed">
                                        {threat_assessment.top_power.description}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="arc-mono text-[10px] italic text-[var(--arc-text-muted)]">No power profile on record.</p>
                        )}

                        {/* Infection */}
                        {threat_assessment.active_infection && (
                            <div
                                className="border p-2.5"
                                style={{
                                    borderColor: `${infectionColor}30`,
                                    backgroundColor: `${infectionColor}08`,
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">ACTIVE INFECTION</span>
                                        <p className="text-[12px] font-medium text-[var(--arc-text)]">
                                            {threat_assessment.active_infection.pathogen ?? 'Unknown Pathogen'}
                                        </p>
                                        {threat_assessment.active_infection.infection_method && (
                                            <span className="arc-mono mt-0.5 inline-block rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1 py-px text-[8px] text-[var(--arc-text-muted)] tracking-wide uppercase">
                                                via {threat_assessment.active_infection.infection_method}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {threat_assessment.active_infection.status && (
                                            <span className="arc-mono rounded-none px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                                                style={{ color: infectionColor, backgroundColor: `${infectionColor}18`, borderWidth: 1, borderColor: `${infectionColor}30` }}>
                                                {threat_assessment.active_infection.status}
                                            </span>
                                        )}
                                        {threat_assessment.active_infection.severity && (
                                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                                {threat_assessment.active_infection.severity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {threat_assessment.active_infection.symptoms_exhibited.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {threat_assessment.active_infection.symptoms_exhibited.map((s, i) => (
                                            <span key={i} className="arc-mono inline-block rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[8px] text-[var(--arc-text-muted)] tracking-wide">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mutations */}
                        {threat_assessment.mutation_stage_count > 0 && (
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)]">
                                <div className="flex items-center justify-between p-2.5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">MUTATION STAGES</span>
                                        <span className="arc-mono text-[13px] font-bold text-[var(--arc-text)]">{threat_assessment.mutation_stage_count}</span>
                                    </div>
                                    {threat_assessment.peak_threat_level && (
                                        <div className="text-right">
                                            <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">PEAK THREAT</span>
                                            <p className="arc-mono text-[11px] font-bold uppercase" style={{ color: threatColor }}>
                                                {threat_assessment.peak_threat_level}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {threat_assessment.mutations.length > 0 && (
                                    <div className="border-t border-[var(--arc-border)] divide-y divide-[var(--arc-border)]">
                                        {threat_assessment.mutations.map((m, i) => {
                                            const mColor = threatColors[m.threat_level?.toLowerCase() ?? ''] ?? '#6b7280';
                                            return (
                                                <div key={i} className="px-2.5 py-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="arc-mono text-[9px] font-bold text-[var(--arc-text-muted)]">S{m.stage_number}</span>
                                                            {m.name && (
                                                                <span className="text-[11px] font-medium text-[var(--arc-text)]">{m.name}</span>
                                                            )}
                                                        </div>
                                                        {m.threat_level && (
                                                            <span className="arc-mono rounded-none px-1 py-px text-[8px] font-bold tracking-wider uppercase"
                                                                style={{ color: mColor, backgroundColor: `${mColor}18`, borderWidth: 1, borderColor: `${mColor}30` }}>
                                                                {m.threat_level}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {m.abilities_gained.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            {m.abilities_gained.map((ab, j) => (
                                                                <span key={j} className="arc-mono inline-block rounded-none border border-emerald-500/20 bg-emerald-500/5 px-1 py-px text-[8px] text-emerald-400 tracking-wide">+{ab}</span>
                                                            ))}
                                                            {m.abilities_lost.map((ab, j) => (
                                                                <span key={j} className="arc-mono inline-block rounded-none border border-red-500/20 bg-red-500/5 px-1 py-px text-[8px] text-red-400 tracking-wide">−{ab}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {m.physical_changes.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {m.physical_changes.map((ch, j) => (
                                                                <span key={j} className="arc-mono inline-block rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1 py-px text-[8px] text-[var(--arc-text-muted)] tracking-wide">{ch}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {!threat_assessment.top_power && !threat_assessment.active_infection && threat_assessment.mutation_stage_count === 0 && (
                            <p className="arc-mono text-[10px] italic text-[var(--arc-text-muted)]">No threat indicators on record.</p>
                        )}
                    </div>
                </section>

                {/* NETWORK */}
                <section>
                    <SectionHeader icon={<Users className="size-3.5" />} label="NETWORK" />
                    <div className="space-y-2.5">
                        {/* Relation counts */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2.5 text-center">
                                <div className="arc-mono text-[18px] font-bold text-[var(--arc-accent)]">
                                    {network.outgoing_relations}
                                </div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">OUTGOING LINKS</div>
                            </div>
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] p-2.5 text-center">
                                <div className="arc-mono text-[18px] font-bold text-[var(--arc-accent)]">
                                    {network.incoming_relations}
                                </div>
                                <div className="arc-mono text-[8px] tracking-wider text-[var(--arc-text-muted)]">INCOMING LINKS</div>
                            </div>
                        </div>

                        {/* Affiliations */}
                        {network.active_affiliations.length > 0 && (
                            <div>
                                <p className="arc-mono mb-1.5 text-[9px] tracking-wider text-[var(--arc-text-muted)]">ACTIVE AFFILIATIONS</p>
                                <div className="space-y-1">
                                    {network.active_affiliations.map((a, i) => (
                                        <div key={i} className="border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2.5 py-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-[12px] font-medium text-[var(--arc-text)]">
                                                        {a.organization ?? '-'}
                                                    </span>
                                                    {a.role && (
                                                        <span className="ml-2 arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                                            {a.role}
                                                        </span>
                                                    )}
                                                    {a.rank && (
                                                        <span className="ml-1.5 arc-mono text-[9px] text-[var(--arc-text-muted)]">[{a.rank}]</span>
                                                    )}
                                                </div>
                                                {a.status && (
                                                    <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)] uppercase shrink-0">
                                                        {a.status}
                                                    </span>
                                                )}
                                            </div>
                                            {(a.fictional_start || a.fictional_end) && (
                                                <p className="arc-mono mt-0.5 text-[9px] text-[var(--arc-text-muted)]">
                                                    {a.fictional_start ?? '?'}{a.fictional_end ? ` → ${a.fictional_end}` : ' → present'}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timelines */}
                        {network.timelines.length > 0 && (
                            <div>
                                <p className="arc-mono mb-1.5 text-[9px] tracking-wider text-[var(--arc-text-muted)]">TIMELINE MEMBERSHIPS</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {network.timelines.map((t, i) => (
                                        <Chip key={i} label={t} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {network.outgoing_relations === 0 && network.incoming_relations === 0 && network.active_affiliations.length === 0 && (
                            <p className="arc-mono text-[10px] italic text-[var(--arc-text-muted)]">No network connections on record.</p>
                        )}
                    </div>
                </section>

                {/* HISTORY */}
                <section>
                    <SectionHeader icon={<Activity className="size-3.5" />} label="HISTORICAL RECORDS" />
                    <div className="space-y-2.5">
                        {/* Deaths */}
                        {history.deaths.length > 0 && (
                            <div>
                                <p className="arc-mono mb-1.5 text-[9px] tracking-wider text-[var(--arc-text-muted)]">DEATH RECORDS</p>
                                <div className="space-y-1">
                                    {history.deaths.map((d, i) => (
                                        <div key={i} className="border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2.5 py-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[12px] text-[var(--arc-text)]">
                                                        {d.cause ?? 'Cause unknown'}
                                                    </span>
                                                    {d.fictional_date && (
                                                        <span className="ml-2 arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                                            {d.fictional_date}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {d.death_type && (
                                                        <span className="arc-mono rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1 py-0.5 text-[8px] tracking-wider text-[var(--arc-text-muted)] uppercase">
                                                            {d.death_type}
                                                        </span>
                                                    )}
                                                    {d.confirmed && (
                                                        <span className="arc-mono rounded-none border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-red-400">
                                                            CONFIRMED
                                                        </span>
                                                    )}
                                                    {d.revived && (
                                                        <span className="arc-mono rounded-none border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-emerald-400">
                                                            REVIVED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {d.circumstances && (
                                                <p className="arc-mono mt-1 text-[10px] italic text-[var(--arc-text-muted)] leading-relaxed">{d.circumstances}</p>
                                            )}
                                            {d.revived && d.revival_method && (
                                                <p className="arc-mono mt-0.5 text-[9px] text-[var(--arc-text-muted)]">
                                                    Revival: {d.revival_method}{d.revival_circumstances ? ` - ${d.revival_circumstances}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Consciousness */}
                        {history.latest_consciousness && (
                            <div className="border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">CONSCIOUSNESS STATUS</span>
                                    <div className="flex items-center gap-1.5">
                                        {history.latest_consciousness.status && (
                                            <span className="arc-mono text-[10px] font-bold uppercase text-[var(--arc-text)]">
                                                {history.latest_consciousness.status}
                                            </span>
                                        )}
                                        {history.latest_consciousness.transfer_method && (
                                            <span className="arc-mono rounded-none border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1 py-px text-[8px] text-[var(--arc-text-muted)] tracking-wide">
                                                {history.latest_consciousness.transfer_method}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {history.latest_consciousness.vessel && (
                                    <p className="arc-mono mt-0.5 text-[9px] text-[var(--arc-text-muted)]">
                                        Vessel: {history.latest_consciousness.vessel}
                                    </p>
                                )}
                                {history.latest_consciousness.description && (
                                    <p className="arc-mono mt-1 text-[10px] italic text-[var(--arc-text-muted)] leading-relaxed">
                                        {history.latest_consciousness.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Intelligence records */}
                        {history.intelligence_record_count > 0 && (
                            <div className="flex items-center justify-between border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2.5 py-1.5">
                                <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">INTELLIGENCE RECORDS</span>
                                <span className="arc-mono text-[14px] font-bold text-[var(--arc-accent)]">
                                    {history.intelligence_record_count}
                                </span>
                            </div>
                        )}

                        {history.deaths.length === 0 && !history.latest_consciousness && history.intelligence_record_count === 0 && (
                            <p className="arc-mono text-[10px] italic text-[var(--arc-text-muted)]">No historical records on file.</p>
                        )}
                    </div>
                </section>

                {/* CLASSIFICATION */}
                <section>
                    <SectionHeader icon={<Tag className="size-3.5" />} label="CLASSIFICATION" />
                    <div className="space-y-2">
                        {classification.tags.length > 0 && (
                            <div>
                                <p className="arc-mono mb-1.5 text-[9px] tracking-wider text-[var(--arc-text-muted)]">TAGS</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {classification.tags.map((t, i) => <Chip key={i} label={t} />)}
                                </div>
                            </div>
                        )}
                        {classification.categories.length > 0 && (
                            <div>
                                <p className="arc-mono mb-1.5 text-[9px] tracking-wider text-[var(--arc-text-muted)]">CATEGORIES</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {classification.categories.map((c, i) => <Chip key={i} label={c} />)}
                                </div>
                            </div>
                        )}
                        {classification.media_source_count > 0 && (
                            <div className="flex items-center justify-between border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2.5 py-1.5">
                                <span className="arc-mono text-[9px] tracking-wider text-[var(--arc-text-muted)]">MEDIA SOURCES</span>
                                <span className="arc-mono text-[14px] font-bold text-[var(--arc-accent)]">
                                    {classification.media_source_count}
                                </span>
                            </div>
                        )}
                        {classification.tags.length === 0 && classification.categories.length === 0 && classification.media_source_count === 0 && (
                            <p className="arc-mono text-[10px] italic text-[var(--arc-text-muted)]">No classification data on file.</p>
                        )}
                    </div>
                </section>

                {/* NOTABLE QUOTES */}
                {notable_quotes.length > 0 && (
                    <section>
                        <SectionHeader icon={<MessageSquare className="size-3.5" />} label="NOTABLE QUOTES" />
                        <div className="space-y-2.5">
                            {notable_quotes.map((q, i) => (
                                <div
                                    key={i}
                                    className="border-l-2 border-[var(--arc-accent)]/30 bg-[var(--arc-surface)] p-3"
                                >
                                    {q.is_featured && (
                                        <div className="mb-1.5 flex items-center gap-1">
                                            <Star className="size-2.5 text-amber-400" />
                                            <span className="arc-mono text-[8px] tracking-wider text-amber-400">FEATURED</span>
                                        </div>
                                    )}
                                    <p className="text-[12px] leading-relaxed text-[var(--arc-text)]">
                                        &ldquo;{q.content}&rdquo;
                                    </p>
                                    {q.context && (
                                        <p className="arc-mono mt-1.5 text-[10px] italic text-[var(--arc-text-muted)]">
                                            {q.context}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="border-t border-[var(--arc-border)] pt-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="size-3 text-[var(--arc-text-muted)]" />
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)] tracking-wider">
                            AUTO-GENERATED · {genLabel} · CACHED 30m
                        </span>
                        <div className="h-px flex-1 bg-[var(--arc-border)]" />
                        <Target className="size-3 text-[var(--arc-text-muted)]" />
                    </div>
                </div>

            </div>
        </div>
    );
}
