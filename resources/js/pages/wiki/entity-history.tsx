import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ChevronDown, ChevronRight, Clock, FileEdit, History, Loader2, Plus, RotateCcw, Trash2, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiRevision, ApiSidebarTree } from '@/types/api';
import type { ApiImage } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string; is_locked?: boolean; settings?: Record<string, unknown> | null; images?: ApiImage[] };
    entity: {
        id: number;
        name: string;
        slug: string;
        short_description?: string | null;
        is_locked?: boolean;
        entity_type?: { slug: string; name: string } | null;
    };
    revisions: ApiRevision[];
    sidebarTree: ApiSidebarTree;
};

const ACTION_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    created: { label: 'Created', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    updated: { label: 'Updated', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    deleted: { label: 'Deleted', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const MODEL_LABELS: Record<string, string> = {
    Entity: 'Entity',
    EntitySection: 'Section',
};

const DIFF_EXCLUDE = new Set([
    'id', 'created_at', 'updated_at', 'deleted_at',
    'universe_id', 'entity_id', 'revisionable_type', 'revisionable_id',
]);

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && value.length > 200) return value.slice(0, 200) + '…';
    return String(value);
}

/** Returns true if rolling back this revision is a supported operation */
function isRollbackSupported(action: string, modelType: string): boolean {
    if (action === 'updated' && (modelType === 'Entity' || modelType === 'EntitySection')) return true;
    if (action === 'deleted' && modelType === 'EntitySection') return true;
    if (action === 'created' && modelType === 'EntitySection') return true;
    return false;
}

function RevisionDiffTable({ oldValues, newValues }: {
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
}) {
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
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                        <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Field</th>
                        <th className="border-b border-l border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-red-500">Before</th>
                        <th className="border-b border-l border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">After</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(({ key, old: oldVal, new: newVal }) => (
                        <tr key={key} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-300">{key}</td>
                            <td className="border-l border-slate-100 dark:border-slate-800 px-3 py-2 font-mono text-red-600 dark:text-red-400 align-top">
                                {formatValue(oldVal)}
                            </td>
                            <td className="border-l border-slate-100 dark:border-slate-800 px-3 py-2 font-mono text-emerald-700 dark:text-emerald-400 align-top">
                                {formatValue(newVal)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RevisionRow({
    revision,
    universeId,
    entityId,
    entitySlug,
    universeSlug,
    canRollback,
}: {
    revision: ApiRevision;
    universeId: number;
    entityId: number;
    entitySlug: string;
    universeSlug: string;
    canRollback: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [rolling, setRolling] = useState(false);

    const actionCfg = ACTION_CONFIG[revision.action] ?? ACTION_CONFIG.updated;
    const modelLabel = MODEL_LABELS[revision.model_type] ?? revision.model_type;
    const hasDiff =
        (revision.old_values && Object.keys(revision.old_values).length > 0) ||
        (revision.new_values && Object.keys(revision.new_values).length > 0);
    const showRollback = canRollback && isRollbackSupported(revision.action, revision.model_type);
    const date = new Date(revision.created_at);

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
            toast.success('Rolled back. Redirecting to entity page…');
            router.visit(`/w/${universeSlug}/${entitySlug}`);
        } catch (err: any) {
            toast.error(err?.message ?? 'Rollback failed.');
            setRolling(false);
        }
    }

    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm transition-shadow hover:shadow-md">
            {/* Row header */}
            <div
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-xs select-none"
                onClick={() => hasDiff && setExpanded((v) => !v)}
                role={hasDiff ? 'button' : undefined}
                tabIndex={hasDiff ? 0 : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' && hasDiff) setExpanded((v) => !v); }}
                aria-expanded={hasDiff ? expanded : undefined}
            >
                {/* Action badge */}
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${actionCfg.color}`}>
                    {revision.action === 'created' && <Plus className="size-2.5" />}
                    {revision.action === 'updated' && <FileEdit className="size-2.5" />}
                    {revision.action === 'deleted' && <Trash2 className="size-2.5" />}
                    {actionCfg.label}
                </span>

                {/* Model label */}
                <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">{modelLabel}</span>

                {/* Timestamp */}
                <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Clock className="size-3" />
                    <time dateTime={revision.created_at}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </time>
                </span>

                {/* User */}
                {revision.user ? (
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <User className="size-3" />
                        {revision.user.name}
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600 italic text-[10px]">system</span>
                )}

                {/* Fields count */}
                {hasDiff && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {Object.keys({ ...(revision.old_values ?? {}), ...(revision.new_values ?? {}) }).filter(k => !DIFF_EXCLUDE.has(k)).length} field{Object.keys({ ...(revision.old_values ?? {}), ...(revision.new_values ?? {}) }).filter(k => !DIFF_EXCLUDE.has(k)).length !== 1 ? 's' : ''}
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {/* Rollback button */}
                    {showRollback && (
                        <button
                            type="button"
                            disabled={rolling}
                            onClick={handleRollback}
                            onBlur={() => setConfirming(false)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                confirming
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
                            }`}
                        >
                            {rolling ? (
                                <Loader2 className="size-3 animate-spin" />
                            ) : (
                                <RotateCcw className="size-3" />
                            )}
                            {confirming ? 'Confirm revert?' : 'Revert'}
                        </button>
                    )}

                    {/* Expand chevron */}
                    {hasDiff && (
                        <span className="text-slate-300 dark:text-slate-600">
                            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </span>
                    )}
                </div>
            </div>

            {/* Expandable diff */}
            {expanded && hasDiff && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-4 pb-4 pt-1">
                    <RevisionDiffTable oldValues={revision.old_values} newValues={revision.new_values} />
                </div>
            )}
        </div>
    );
}

function groupByDate(revisions: ApiRevision[]) {
    const groups: Record<string, ApiRevision[]> = {};
    for (const rev of revisions) {
        const date = rev.created_at.slice(0, 10);
        if (!groups[date]) groups[date] = [];
        groups[date].push(rev);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatGroupDate(isoDate: string): string {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

export default function EntityHistoryPage({ universe, entity, revisions, sidebarTree }: Props) {
    const { can } = useAuth();
    const canRollback = can('entities.rollback');
    const grouped = useMemo(() => groupByDate(revisions), [revisions]);

    const breadcrumbs = [
        { title: 'Wiki', href: '/w' },
        { title: universe.name, href: `/w/${universe.slug}` },
        ...(entity.entity_type ? [{ title: entity.entity_type.name, href: `/w/${universe.slug}/type/${entity.entity_type.slug}` }] : []),
        { title: entity.name, href: `/w/${universe.slug}/${entity.slug}` },
        { title: 'History' },
    ];

    return (
        <WikiLayout breadcrumbs={breadcrumbs} sidebarTree={sidebarTree} universe={universe}>
            <Head title={`${entity.name}  History`}>
                <meta name="description" content={`Revision history for ${entity.name} in the ${universe.name} universe.`} />
            </Head>

            {/* Page header */}
            <div className="mb-6">
                <Link
                    href={`/w/${universe.slug}/${entity.slug}`}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to {entity.name}
                </Link>

                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <History className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Revision History</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{entity.name}</p>
                    </div>
                    <span className="ml-auto rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 shadow-sm">
                        {revisions.length} record{revisions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {canRollback && (
                    <p className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                        <strong>Admin mode:</strong> You can revert individual changes. Click <strong>Revert</strong> on any revision, then confirm. Rollbacks are recorded and traceable.
                    </p>
                )}
            </div>

            {/* Revision list */}
            {revisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 py-16 text-center shadow-sm">
                    <History className="size-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-500 dark:text-slate-400">No revision records yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Changes will appear here once the entity is edited.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(([date, entries]) => (
                        <div key={date}>
                            {/* Date separator */}
                            <div className="mb-2 flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    {formatGroupDate(date)}
                                </span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                            </div>

                            <div className="space-y-1.5">
                                {entries.map((rev) => (
                                    <RevisionRow
                                        key={rev.id}
                                        revision={rev}
                                        universeId={universe.id}
                                        entityId={entity.id}
                                        entitySlug={entity.slug}
                                        universeSlug={universe.slug}
                                        canRollback={canRollback}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </WikiLayout>
    );
}
