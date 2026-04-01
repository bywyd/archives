import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import { TypeIcon } from '@/components/archives/type-icon';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiEntitySummary, ApiMetaEntityType, ApiSidebarTree, ApiUniverse, PaginatedResponse } from '@/types/api';

type Props = {
    universe: ApiUniverse;
    sidebarTree: ApiSidebarTree;
    entityType: ApiMetaEntityType & { entities_count?: number };
    entities: PaginatedResponse<ApiEntitySummary>;
};

export default function EntityTypePage({ universe, sidebarTree, entityType, entities }: Props) {
    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                { title: entityType.name },
            ]}
            sidebarTree={sidebarTree}
            universe={{ id: universe.id, name: universe.name, slug: universe.slug }}
        >
            <Head title={entityType.name + " - " + universe.name}>
                <meta name="description" content={entityType.description ?? `Browse all ${entityType.name} entities in ${universe.name}.`} />
                <link rel="canonical" href={`/w/${universe.slug}/type/${entityType.slug}`} />
            </Head>

            <div className="mb-4 flex items-center gap-3">
                <TypeIcon entityType={entityType} size="lg" />
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{entityType.name}</h1>
                    <span className="text-xs text-slate-400">{entities.meta.total} entities</span>
                </div>
            </div>

            {entityType.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-500">{entityType.description}</p>
            )}

            {/* Search within type */}
            <div className="mb-6">
                <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`Search ${entityType.name}...`}
                        defaultValue={new URLSearchParams(window.location.search).get('search') ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            const timeout = setTimeout(() => {
                                router.get(
                                    `/w/${universe.slug}/type/${entityType.slug}`,
                                    { search: val || undefined },
                                    { preserveState: true, replace: true },
                                );
                            }, 300);
                            return () => clearTimeout(timeout);
                        }}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                    />
                </div>
            </div>

            {/* Entity grid */}
            <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {entities.data.map((e) => (
                    <WikiEntityCard key={e.id} entity={e} universeSlug={universe.slug} />
                ))}
            </div>

            {entities.data.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                    <p className="text-sm text-slate-500">No entities found.</p>
                </div>
            )}

            {/* Pagination */}
            {entities.meta.last_page > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                    {entities.links.prev && (
                        <Link href={entities.links.prev} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Previous</Link>
                    )}
                    <span className="text-xs text-slate-500">
                        Page {entities.meta.current_page} of {entities.meta.last_page}
                    </span>
                    {entities.links.next && (
                        <Link href={entities.links.next} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Next</Link>
                    )}
                </div>
            )}
        </WikiLayout>
    );
}
