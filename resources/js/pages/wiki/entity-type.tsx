import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import { WikiPagination } from '@/components/wiki/wiki-pagination';
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
            universe={universe}
        >
            <Head title={entityType.name + " - " + universe.name}>
                <meta name="description" content={entityType.description ?? `Browse all ${entityType.name} entities in ${universe.name}.`} />
                <link rel="canonical" href={`/w/${universe.slug}/type/${entityType.slug}`} />
            </Head>

            <div className="mb-4 flex items-center gap-3">
                <TypeIcon entityType={entityType} size="lg" />
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{entityType.name}</h1>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{entities.meta.total} entities</span>
                </div>
            </div>

            {entityType.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{entityType.description}</p>
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
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
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
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-14 px-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No entities found.</p>
                </div>
            )}

            <WikiPagination meta={entities.meta} links={entities.links} />
        </WikiLayout>
    );
}
