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
            className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
            <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                <GitMerge className="size-5 text-slate-400 shrink-0" />
                <a href="#section-relations" className="hover:text-blue-600 transition-colors">Relations</a>
            </h2>

            {outgoing.length > 0 && (
                <div className="mb-4">
                    <h3 className="mb-2 text-xs font-semibold text-slate-500">Outgoing</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-[0.8125rem]">
                            <thead>
                                <tr>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Relation</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Entity</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Status</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Description</th>
                                    {onDelete && <th className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {outgoing.map((r) => (
                                    <tr key={r.id} className="transition-colors hover:bg-blue-50/50">
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle font-medium">{r.relation_type?.name ?? ''}</td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle">
                                            <EntityHoverLink
                                                slug={r.to_entity.slug}
                                                universeSlug={universeSlug}
                                                href={`/w/${universeSlug}/${r.to_entity.slug}`}
                                            >
                                                {r.to_entity.name}
                                            </EntityHoverLink>
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle">
                                            {r.status && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap">{r.status}</span>}
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-500">{r.description ?? ''}</td>
                                        {onDelete && <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle"><RelationDeleteBtn onDelete={() => onDelete(r.id)} /></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {incoming.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-semibold text-slate-500">Incoming</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-[0.8125rem]">
                            <thead>
                                <tr>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Entity</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Relation</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Status</th>
                                    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">Description</th>
                                    {onDelete && <th className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {incoming.map((r) => (
                                    <tr key={r.id} className="transition-colors hover:bg-blue-50/50">
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle">
                                            <EntityHoverLink
                                                slug={r.from_entity.slug}
                                                universeSlug={universeSlug}
                                                href={`/w/${universeSlug}/${r.from_entity.slug}`}
                                            >
                                                {r.from_entity.name}
                                            </EntityHoverLink>
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle font-medium">{r.relation_type?.inverse_name ?? r.relation_type?.name ?? ''}</td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle">
                                            {r.status && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap">{r.status}</span>}
                                        </td>
                                        <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-500">{r.description ?? ''}</td>
                                        {onDelete && <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle"><RelationDeleteBtn onDelete={() => onDelete(r.id)} /></td>}
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
