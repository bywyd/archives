import { Head, Link } from '@inertiajs/react';
import { Folder } from 'lucide-react';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import { WikiPagination } from '@/components/wiki/wiki-pagination';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiCategory, ApiEntitySummary, ApiImage, ApiSidebarTree, PaginatedResponse } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string; settings?: Record<string, unknown> | null; images?: ApiImage[] };
    category: ApiCategory;
    entities: PaginatedResponse<ApiEntitySummary>;
    sidebarTree: ApiSidebarTree;
};

export default function CategoryPage({ universe, category, entities, sidebarTree }: Props) {
    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                { title: 'Categories', href: `/w/${universe.slug}` },
                { title: category.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
        >
            <Head title={category.name + " - " + universe.name}>
                <meta name="description" content={category.description ?? `Browse entities in category: ${category.name}.`} />
                <link rel="canonical" href={`/w/${universe.slug}/category/${category.slug}`} />
            </Head>

            <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Folder className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{category.name}</h1>
                    {category.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{category.description}</p>
                    )}
                </div>
            </div>

            {/* Subcategories */}
            {category.children && category.children.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b-2 border-blue-100 dark:border-blue-900/40 mb-4 flex items-center gap-2">Subcategories</h2>
                    <div className="flex flex-wrap gap-2">
                        {category.children.map((child) => (
                            <Link
                                key={child.id}
                                href={`/w/${universe.slug}/category/${child.slug}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 whitespace-nowrap transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 dark:hover:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            >
                                {child.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Entities */}
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b-2 border-blue-100 dark:border-blue-900/40 mb-4 flex items-center gap-2">Entities ({entities.meta.total})</h2>
            <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {entities.data.map((e) => (
                    <WikiEntityCard key={e.id} entity={e} universeSlug={universe.slug} />
                ))}
            </div>

            {entities.data.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-14 px-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No entities in this category.</p>
                </div>
            )}

            <WikiPagination meta={entities.meta} links={entities.links} />
        </WikiLayout>
    );
}
