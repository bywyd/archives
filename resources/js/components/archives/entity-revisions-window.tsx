// ============================================================
// Entity Revisions Window
// Displays revision history for an entity and its sections
// in the Archives dossier aesthetic.
// ============================================================

import { AlertCircle, ChevronDown, ChevronRight, Clock, FileEdit, Loader2, Plus, RotateCcw, Trash2, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { ApiRevision } from '@/types/api';

type Props = {
    universeId: number;
    entityId: number;
    entityName: string;
    onRollback?: () => void;
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    created: {
        label: 'CREATED',
        icon: <Plus className="size-2.5" />,
        color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20',
    },
    updated: {
        label: 'UPDATED',
        icon: <FileEdit className="size-2.5" />,
        color: 'text-[var(--arc-accent)] bg-[var(--arc-accent)]/10 border-[var(--arc-accent)]/20',
    },
    deleted: {
        label: 'DELETED',
        icon: <Trash2 className="size-2.5" />,
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
};

const MODEL_TYPE_LABELS: Record<string, string> = {
    Entity: 'ENTITY',
    EntitySection: 'SECTION',
};

// Omit noisy internal fields from diff display
const DIFF_EXCLUDE = new Set([
    'id', 'created_at', 'updated_at', 'deleted_at',
    'universe_id', 'entity_id', 'revisionable_type', 'revisionable_id',
]);

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && value.length > 120) return value.slice(0, 120) + '…';
    return String(value);
}

function RevisionDiff({ oldValues, newValues }: { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }) {
    const entries = useMemo(() => {
        const changed: { key: string; old: unknown; new: unknown }[] = [];
        const keys = new Set([
            ...Object.keys(oldValues ?? {}),
            ...Object.keys(newValues ?? {}),
        ]);

        for (const key of keys) {
            if (DIFF_EXCLUDE.has(key)) continue;
            const oldVal = (oldValues ?? {})[key];
            const newVal = (newValues ?? {})[key];
            if (oldVal !== newVal) {
                changed.push({ key, old: oldVal, new: newVal });
            }
        }
        return changed;
    }, [oldValues, newValues]);

    if (entries.length === 0) return null;

    return (
        <div className="mt-2 space-y-1">
            {entries.map(({ key, old: oldVal, new: newVal }) => (
                <div key={key} className="rounded border border-[var(--arc-border)] bg-[var(--arc-bg)] text-[10px]">
                    <div className="border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-0.5">
                        <span className="arc-mono font-semibold text-[var(--arc-accent)]">{key}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-[var(--arc-border)]">
                        <div className="p-1.5 text-red-400">
                            <div className="arc-mono mb-0.5 text-[8px] font-bold tracking-widest text-red-400/60">BEFORE</div>
                            <div className="font-mono leading-relaxed">{formatValue(oldVal)}</div>
                        </div>
                        <div className="p-1.5 text-emerald-500">
                            <div className="arc-mono mb-0.5 text-[8px] font-bold tracking-widest text-emerald-500/60">AFTER</div>
                            <div className="font-mono leading-relaxed">{formatValue(newVal)}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Rollback is supported for these action + model_type combos */
function isRollbackSupported(action: string, modelType: string): boolean {
    if (action === 'updated' && (modelType === 'Entity' || modelType === 'EntitySection')) return true;
    if (action === 'deleted' && modelType === 'EntitySection') return true;
    if (action === 'created' && modelType === 'EntitySection') return true;
    return false;
}

function RevisionEntry({
    revision,
    universeId,
    entityId,
    canRollback,
    onRollbackSuccess,
}: {
    revision: ApiRevision & { model_type: string };
    universeId: number;
    entityId: number;
    canRollback: boolean;
    onRollbackSuccess: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [rolling, setRolling] = useState(false);
    const config = ACTION_CONFIG[revision.action] ?? ACTION_CONFIG.updated;
    const modelLabel = MODEL_TYPE_LABELS[revision.model_type] ?? revision.model_type.toUpperCase();
    const hasDiff = (revision.old_values && Object.keys(revision.old_values).length > 0) ||
        (revision.new_values && Object.keys(revision.new_values).length > 0);
    const date = new Date(revision.created_at);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const showRollback = canRollback && isRollbackSupported(revision.action, revision.model_type);

    async function handleRollback(e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setRolling(true);
        setConfirming(false);
        try {
            await api.rollbackEntityRevision(universeId, entityId, revision.id);
            toast.success('Revision rolled back. Reopen the dossier to see updated data.');
            onRollbackSuccess();
        } catch (err: any) {
            toast.error(err?.message ?? 'Rollback failed.');
        } finally {
            setRolling(false);
        }
    }

    return (
        <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] transition-colors hover:border-[var(--arc-border-strong)]">
            <button
                type="button"
                className="flex w-full items-start gap-2.5 p-2.5 text-left"
                onClick={() => hasDiff && setExpanded((v) => !v)}
                disabled={!hasDiff}
            >
                {/* Action badge */}
                <span className={cn('mt-0.5 flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 arc-mono text-[9px] font-bold tracking-wider', config.color)}>
                    {config.icon}
                    {config.label}
                </span>

                {/* Meta */}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="arc-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--arc-text-muted)]">
                            {modelLabel}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--arc-text-muted)]">
                            <Clock className="size-2.5" />
                            <span className="arc-mono">{dateStr} · {timeStr}</span>
                        </span>
                        {revision.user && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--arc-text-muted)]">
                                <User className="size-2.5" />
                                <span>{revision.user.name}</span>
                            </span>
                        )}
                        {!revision.user && (
                            <span className="arc-mono text-[9px] italic text-[var(--arc-text-faint)]">system</span>
                        )}
                    </div>
                </div>

                {/* Rollback button */}
                {showRollback && (
                    <button
                        type="button"
                        disabled={rolling}
                        onClick={handleRollback}
                        onBlur={() => setConfirming(false)}
                        className={cn(
                            'mt-0.5 flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 arc-mono text-[9px] font-bold tracking-wider transition-colors',
                            confirming
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                : 'border-[var(--arc-border)] bg-transparent text-[var(--arc-text-faint)] hover:border-[var(--arc-accent)]/40 hover:text-[var(--arc-accent)]',
                        )}
                    >
                        {rolling ? (
                            <Loader2 className="size-2.5 animate-spin" />
                        ) : (
                            <RotateCcw className="size-2.5" />
                        )}
                        {confirming ? 'CONFIRM?' : 'REVERT'}
                    </button>
                )}

                {/* Expand indicator */}
                {hasDiff && (
                    <span className="mt-0.5 shrink-0 text-[var(--arc-text-faint)]">
                        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    </span>
                )}
            </button>

            {expanded && hasDiff && (
                <div className="border-t border-[var(--arc-border)] px-2.5 pb-2.5 pt-2">
                    <RevisionDiff oldValues={revision.old_values} newValues={revision.new_values} />
                </div>
            )}
        </div>
    );
}

// Group revisions by date (YYYY-MM-DD)
function groupByDate(revisions: (ApiRevision & { model_type: string })[]) {
    const groups: Record<string, (ApiRevision & { model_type: string })[]> = {};
    for (const rev of revisions) {
        const date = rev.created_at.slice(0, 10);
        if (!groups[date]) groups[date] = [];
        groups[date].push(rev);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatGroupDate(isoDate: string): string {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    }).toUpperCase();
}

type ApiRevisionWithModelType = ApiRevision & { model_type: string };

export function EntityRevisionsWindow({ universeId, entityId, entityName, onRollback }: Props) {
    const [revisions, setRevisions] = useState<ApiRevisionWithModelType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { can } = useAuth();
    const canRollback = can('entities.rollback');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.fetchEntityRevisions(universeId, entityId)
            .then((res) => {
                if (!cancelled) setRevisions(res.data as ApiRevisionWithModelType[]);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load revisions');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [universeId, entityId]);

    const grouped = useMemo(() => groupByDate(revisions), [revisions]);

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--arc-bg)]">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] tracking-[0.3em] text-[var(--arc-accent)]">LOADING CHANGELOG</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-7 text-[var(--arc-danger)]" />
                <p className="text-sm font-medium text-[var(--arc-danger)]">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[var(--arc-bg)]">
            {/*  Header  */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded bg-[var(--arc-accent)]/10">
                        <FileEdit className="size-3 text-[var(--arc-accent)]" />
                    </div>
                    <div>
                        <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">CHANGELOG</span>
                        <span className="arc-mono ml-2 text-[9px] text-[var(--arc-text-muted)]">{entityName.toUpperCase()}</span>
                    </div>
                </div>
                <span className="arc-mono text-[9px] text-[var(--arc-text-faint)]">
                    {revisions.length} RECORD{revisions.length !== 1 ? 'S' : ''}
                </span>
            </div>

            {/*  Body  */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {revisions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                        <FileEdit className="size-8 text-[var(--arc-text-faint)]" />
                        <p className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">NO REVISION RECORDS FOUND</p>
                        <p className="text-xs text-[var(--arc-text-faint)]">Changes will appear here once the entity is modified.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {grouped.map(([date, entries]) => (
                            <div key={date}>
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                                    <span className="arc-mono text-[9px] font-semibold tracking-[0.2em] text-[var(--arc-text-faint)]">
                                        {formatGroupDate(date)}
                                    </span>
                                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                                </div>
                                <div className="space-y-1.5">
                                    {entries.map((rev) => (
                                        <RevisionEntry
                                            key={rev.id}
                                            revision={rev}
                                            universeId={universeId}
                                            entityId={entityId}
                                            canRollback={canRollback}
                                            onRollbackSuccess={() => onRollback?.()}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
