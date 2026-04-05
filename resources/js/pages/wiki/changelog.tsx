import { Head, Link, router } from '@inertiajs/react';
import { Clock, FileEdit, History, Layers, Plus, RotateCcw, Trash2, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import WikiLayout from '@/layouts/wiki-layout';
import { useAuth } from '@/hooks/use-auth';
import * as api from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';

type RevisionItem = {
    id: number;
    action: string;
    model_type: string;
    entity_id: number | null;
    universe_id: number | null;
    entity_name: string | null;
    entity_slug: string | null;
    universe_slug: string | null;
    user_name: string | null;
    created_at: string;
    changes_count: number;
};

type LaravelPaginator<T> = PaginatedResponse<T> & {
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    revisions: LaravelPaginator<RevisionItem>;
};

const ACTION_CONFIG: Record<string, { label: string; color: string; dot: string; Icon: React.ElementType }> = {
    created: { label: 'Created', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400', Icon: Plus },
    updated: { label: 'Updated', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-400', Icon: FileEdit },
    deleted: { label: 'Deleted', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-400', Icon: Trash2 },
};

const MODEL_LABELS: Record<string, string> = {
    Entity: 'Entity',
    EntitySection: 'Section',
};

const FILTER_OPTIONS = [
    { value: '', label: 'All actions' },
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'deleted', label: 'Deleted' },
];

function groupByDate(items: RevisionItem[]): [string, RevisionItem[]][] {
    const groups: Record<string, RevisionItem[]> = {};
    for (const item of items) {
        const date = item.created_at.slice(0, 10);
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatGroupDate(isoDate: string): string {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

function RevisionRow({ rev, canRestore }: { rev: RevisionItem; canRestore: boolean }) {
    const [confirming, setConfirming] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const cfg = ACTION_CONFIG[rev.action] ?? { label: rev.action, color: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-400', Icon: FileEdit };
    const modelLabel = MODEL_LABELS[rev.model_type] ?? rev.model_type;
    const date = new Date(rev.created_at);
    const showRestore = canRestore && rev.action === 'deleted' && rev.model_type === 'Entity' && rev.entity_id && rev.universe_id;

    async function handleRestore(e: React.MouseEvent) {
        e.preventDefault();
        if (!confirming) { setConfirming(true); return; }
        if (!rev.entity_id || !rev.universe_id || !rev.universe_slug) return;
        setRestoring(true);
        setConfirming(false);
        try {
            const result = await api.restoreEntity(rev.universe_id, rev.entity_id);
            toast.success(`Restored: ${result.entity.name}`);
            router.visit(`/w/${rev.universe_slug}/${result.entity.slug}`);
        } catch {
            toast.error('Failed to restore entity.');
            setRestoring(false);
        }
    }

    return (
        <div className="flex items-start gap-3">
            {/* Timeline dot */}
            <div className="relative mt-3 flex shrink-0 flex-col items-center">
                <div className={`size-2 rounded-full ring-2 ring-white ${cfg.dot}`} />
            </div>

            {/* Card */}
            <div className="mb-1.5 flex flex-1 min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-sm transition-shadow hover:shadow-md">
                {/* Action badge */}
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                    <cfg.Icon className="size-2.5" />
                    {cfg.label}
                </span>

                {/* Model type */}
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {modelLabel}
                </span>

                {/* Entity link or name */}
                {rev.entity_name && rev.entity_slug && rev.universe_slug ? (
                    <Link
                        href={`/w/${rev.universe_slug}/${rev.entity_slug}`}
                        className="min-w-0 truncate font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                    >
                        {rev.entity_name}
                    </Link>
                ) : rev.entity_name ? (
                    <span className="min-w-0 truncate font-semibold text-slate-700">{rev.entity_name}</span>
                ) : null}

                {/* Fields changed */}
                {rev.changes_count > 0 && (
                    <span className="shrink-0 text-[10px] text-slate-400">
                        {rev.changes_count} field{rev.changes_count !== 1 ? 's' : ''}
                    </span>
                )}

                {/* Right-side meta */}
                <div className="ml-auto flex shrink-0 items-center gap-3 text-[10px] text-slate-400">
                    {rev.user_name && (
                        <span className="flex items-center gap-1">
                            <User className="size-2.5" />
                            {rev.user_name}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        <time dateTime={rev.created_at}>
                            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </time>
                    </span>

                    {showRestore && (
                        <button
                            type="button"
                            disabled={restoring}
                            onClick={handleRestore}
                            onBlur={() => setConfirming(false)}
                            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold transition-colors disabled:opacity-50 ${
                                confirming
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                            title="Restore this entity"
                        >
                            <RotateCcw className="size-2.5" />
                            {confirming ? 'Confirm?' : restoring ? 'Restoring…' : 'Restore'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChangelogPage({ revisions }: Props) {
    const { can } = useAuth();
    const canRestore = can('entities.rollback');
    const [actionFilter, setActionFilter] = useState('');

    const filtered = useMemo(
        () => actionFilter ? revisions.data.filter((r) => r.action === actionFilter) : revisions.data,
        [revisions.data, actionFilter],
    );

    const grouped = useMemo(() => groupByDate(filtered), [filtered]);

    const total = revisions.total ?? revisions.meta?.total ?? revisions.data.length;

    

    
    const totalPages = revisions.last_page ?? revisions.meta?.last_page ?? 1;
    const currentPage = revisions.current_page ?? revisions.meta?.current_page ?? 1;
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <WikiLayout breadcrumbs={[{ title: 'Wiki', href: '/w' }, { title: 'Changelog' }]} wide>
            <Head title="Changelog">
                <meta name="description" content="Recent changes and updates to the Archives wiki." />
            </Head>

            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <History className="size-4 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Changelog</h1>
                    <p className="text-xs text-slate-500">Recent changes across all universes</p>
                </div>
                <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                    {total.toLocaleString()} record{total !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Filter bar */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                <Layers className="size-3.5 shrink-0 text-slate-400" />
                <div className="flex gap-1.5">
                    {FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setActionFilter(opt.value)}
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                actionFilter === opt.value
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {actionFilter && (
                    <span className="text-[11px] text-slate-400">
                        Showing {filtered.length} of {revisions.data.length} on this page
                    </span>
                )}
            </div>

            {/* Revision list grouped by date */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-14 px-6 text-center">
                    <History className="size-8 text-slate-300" />
                    <p className="font-medium text-slate-500">No revisions found</p>
                    {actionFilter && (
                        <p className="text-xs text-slate-400">Try removing the filter to see all changes.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(([date, entries]) => (
                        <div key={date}>
                            {/* Date separator */}
                            <div className="mb-3 flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                    {formatGroupDate(date)}
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            {/* Timeline connector + rows */}
                            <div className="relative pl-3.5">
                                {/* Vertical line */}
                                <div className="absolute left-4 top-3 bottom-3 w-px bg-slate-200" />

                                <div>
                                    {entries.map((rev) => (
                                        <RevisionRow key={rev.id} rev={rev} canRestore={canRestore} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {(revisions.last_page ?? revisions.meta?.last_page ?? 1) > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                    {revisions.prev_page_url && (
                        <Link
                            href={revisions.prev_page_url}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow"
                        >
                            Previous
                        </Link>
                    )}
                    {/* <span className="text-xs text-slate-500">
                        Page {revisions.current_page ?? revisions.meta?.current_page} of {revisions.last_page ?? revisions.meta?.last_page}
                    </span> */}

                    {/* rendering page numbers with navigation */}
                    <div className="flex items-center gap-1">
                        {pageNumbers.map((page) => (
                            <Link
                                key={page}
                                href={`${window.location.pathname}?page=${page}`}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                                    page === currentPage
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                                }`}
                            >
                                {page}
                            </Link>
                        ))}
                    </div>
                    

                    {revisions.next_page_url && (
                        <Link
                            href={revisions.next_page_url}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow"
                        >
                            Next
                        </Link>
                    )}
                </div>
            )}
        </WikiLayout>
    );
}
