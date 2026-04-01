import { Head, Link, router } from '@inertiajs/react';
import { History, RotateCcw } from 'lucide-react';
import { useState } from 'react';
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

type Props = {
    revisions: PaginatedResponse<RevisionItem>;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'text-green-700 bg-green-50 border-green-200' },
    updated: { label: 'Updated', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    deleted: { label: 'Deleted', color: 'text-red-700 bg-red-50 border-red-200' },
};

export default function ChangelogPage({ revisions }: Props) {
    const { can } = useAuth();
    const [restoringId, setRestoringId] = useState<number | null>(null);

    async function handleRestore(rev: RevisionItem) {
        if (!rev.entity_id || !rev.universe_id || !rev.universe_slug) return;
        setRestoringId(rev.id);
        try {
            const result = await api.restoreEntity(rev.universe_id, rev.entity_id);
            toast.success(`Restored: ${result.entity.name}`);
            router.visit(`/w/${rev.universe_slug}/${result.entity.slug}`);
        } catch {
            toast.error('Failed to restore entity.');
            setRestoringId(null);
        }
    }

    return (
        <WikiLayout breadcrumbs={[{ title: 'Wiki', href: '/w' }, { title: 'Changelog' }]} wide>
            <Head title="Changelog">
                <meta name="description" content="Recent changes and updates to the Archives wiki." />
            </Head>

            <div className="mb-6 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                    <History className="size-4 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Changelog</h1>
            </div>

            <div className="space-y-1.5">
                {revisions.data.map((rev) => {
                    const actionConfig = ACTION_LABELS[rev.action] ?? { label: rev.action, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                    const date = new Date(rev.created_at);

                    return (
                        <div
                            key={rev.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-sm transition-all duration-150 hover:shadow-md"
                        >
                            <span className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${actionConfig.color}`}>
                                {actionConfig.label}
                            </span>

                            <span className="shrink-0 text-slate-400">{rev.model_type}</span>

                            {rev.entity_name && rev.entity_slug && rev.universe_slug ? (
                                <Link
                                    href={`/w/${rev.universe_slug}/${rev.entity_slug}`}
                                    className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors truncate font-medium"
                                >
                                    {rev.entity_name}
                                </Link>
                            ) : rev.entity_name ? (
                                <span className="truncate font-medium text-slate-900">{rev.entity_name}</span>
                            ) : null}

                            {rev.changes_count > 0 && (
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-400">
                                    {rev.changes_count} field{rev.changes_count !== 1 ? 's' : ''}
                                </span>
                            )}

                            <span className="ml-auto shrink-0 text-slate-400">
                                {rev.user_name && <>{rev.user_name} &middot; </>}
                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {rev.action === 'deleted' && rev.model_type === 'Entity' && rev.entity_id && rev.universe_id && can('entities.rollback') && (
                                <button
                                    onClick={() => handleRestore(rev)}
                                    disabled={restoringId === rev.id}
                                    className="ml-2 inline-flex shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                                    title="Restore this entity"
                                >
                                    <RotateCcw className="size-2.5" />
                                    {restoringId === rev.id ? 'Restoring…' : 'Restore'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {revisions.data.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                    <History className="mx-auto mb-3 size-8 text-slate-400" />
                    <p className="text-sm text-slate-500">No revisions yet.</p>
                </div>
            )}

            {/* Pagination */}
            {revisions.last_page > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                    {revisions.links.prev && (
                        <Link href={revisions.links.prev} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Previous</Link>
                    )}
                    <span className="text-xs text-slate-500">
                        Page {revisions.current_page} of {revisions.last_page}
                    </span>
                    {revisions.links.next && (
                        <Link href={revisions.links.next} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Next</Link>
                    )}
                </div>
            )}
        </WikiLayout>
    );
}
