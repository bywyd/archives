import { Head, Link } from '@inertiajs/react';
import { Folder } from 'lucide-react';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiCategory, ApiEntitySummary, ApiSidebarTree, PaginatedResponse } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string };
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
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
                    <Folder className="size-4 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{category.name}</h1>
                    {category.description && (
                        <p className="text-xs text-slate-500">{category.description}</p>
                    )}
                </div>
            </div>

            {/* Subcategories */}
            {category.children && category.children.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">Subcategories</h2>
                    <div className="flex flex-wrap gap-2">
                        {category.children.map((child) => (
                            <Link
                                key={child.id}
                                href={`/w/${universe.slug}/category/${child.slug}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                            >
                                {child.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Entities */}
            <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">Entities ({entities.meta.total})</h2>
            <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {entities.data.map((e) => (
                    <WikiEntityCard key={e.id} entity={e} universeSlug={universe.slug} />
                ))}
            </div>

            {entities.data.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                    <p className="text-sm text-slate-500">No entities in this category.</p>
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
