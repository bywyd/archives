import { GitMerge, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EntityHoverLink } from '@/components/shared/entity-preview-card';
import type { ApiEntityRelation } from '@/types/api';

type Props = {
    outgoing: ApiEntityRelation[];
    incoming: ApiEntityRelation[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
};

function RelationDeleteBtn({ onDelete }: { onDelete: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <button
            onClick={async () => { setBusy(true); try { await onDelete(); } catch {} finally { setBusy(false); } }}
            disabled={busy}
            className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
            title="Delete relation"
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
    );
}

export function WikiRelations({ outgoing, incoming, universeSlug, onDelete }: Props) {
    if (outgoing.length === 0 && incoming.length === 0) return null;

    return (
        <div className="mb-8 scroll-mt-20" id="section-relations">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b-2 border-blue-100 dark:border-blue-900/40 mb-4 flex items-center gap-2">
                <GitMerge className="size-5 text-slate-400 dark:text-slate-500 shrink-0" />
                <a href="#section-relations" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Relations</a>
            </h2>

            {outgoing.length > 0 && (
                <div className="mb-4">
                    <h3 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Outgoing</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[0.8125rem]">
                            <thead>
                                <tr>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Relation</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Entity</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Status</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Description</th>
                                    {onDelete && <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {outgoing.map((r) => (
                                    <tr key={r.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle font-medium">{r.relation_type?.name ?? ''}</td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle">
                                            <EntityHoverLink
                                                slug={r.to_entity.slug}
                                                universeSlug={universeSlug}
                                                href={`/w/${universeSlug}/${r.to_entity.slug}`}
                                            >
                                                {r.to_entity.name}
                                            </EntityHoverLink>
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle">
                                            {r.status && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 whitespace-nowrap">{r.status}</span>}
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle text-slate-500 dark:text-slate-400">{r.description ?? ''}</td>
                                        {onDelete && <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle"><RelationDeleteBtn onDelete={() => onDelete(r.id)} /></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {incoming.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Incoming</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[0.8125rem]">
                            <thead>
                                <tr>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Entity</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Relation</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Status</th>
                                    <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Description</th>
                                    {onDelete && <th className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {incoming.map((r) => (
                                    <tr key={r.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle">
                                            <EntityHoverLink
                                                slug={r.from_entity.slug}
                                                universeSlug={universeSlug}
                                                href={`/w/${universeSlug}/${r.from_entity.slug}`}
                                            >
                                                {r.from_entity.name}
                                            </EntityHoverLink>
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle font-medium">{r.relation_type?.inverse_name ?? r.relation_type?.name ?? ''}</td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle">
                                            {r.status && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 whitespace-nowrap">{r.status}</span>}
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle text-slate-500 dark:text-slate-400">{r.description ?? ''}</td>
                                        {onDelete && <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 align-middle"><RelationDeleteBtn onDelete={() => onDelete(r.id)} /></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
