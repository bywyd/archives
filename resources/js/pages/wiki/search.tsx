import { Head, Link, router } from '@inertiajs/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiEntitySummary, ApiMetaEntityType, PaginatedResponse } from '@/types/api';

type Props = {
    query: string;
    selectedUniverse: string | null;
    selectedType: string | null;
    results: PaginatedResponse<ApiEntitySummary & { universe?: { id: number; name: string; slug: string } }> | null;
    universes: { id: number; name: string; slug: string }[];
    entityTypes: ApiMetaEntityType[];
};

export default function SearchPage({ query: initialQuery, selectedUniverse, selectedType, results, universes, entityTypes }: Props) {
    const [q, setQ] = useState(initialQuery);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (q) params.q = q;
        if (selectedUniverse) params.universe = selectedUniverse;
        if (selectedType) params.type = selectedType;
        router.get('/w/search', params);
    }

    function handleFilterChange(key: string, value: string) {
        const params: Record<string, string> = {};
        if (q) params.q = q;
        if (selectedUniverse) params.universe = selectedUniverse;
        if (selectedType) params.type = selectedType;
        if (value) {
            params[key] = value;
        } else {
            delete params[key];
        }
        router.get('/w/search', params);
    }

    return (
        <WikiLayout breadcrumbs={[{ title: 'Wiki', href: '/w' }, { title: 'Search' }]} wide>
            <Head title={q ? `Search: ${q}` : 'Search'} />

            <h1 className="mb-5 text-xl font-bold text-slate-900">Search</h1>

            {/* Search form */}
            <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        name="q"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search entities..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                    />
                </div>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:translate-y-px text-xs">Search</button>
            </form>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-slate-400" />
                <select
                    value={selectedUniverse ?? ''}
                    onChange={(e) => handleFilterChange('universe', e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none"
                >
                    <option value="">All Universes</option>
                    {universes.map((u) => (
                        <option key={u.id} value={u.slug}>{u.name}</option>
                    ))}
                </select>
                <select
                    value={selectedType ?? ''}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none"
                >
                    <option value="">All Types</option>
                    {entityTypes.map((t) => (
                        <option key={t.id} value={t.slug}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* Results */}
            {results ? (
                <>
                    <p className="mb-4 text-xs text-slate-500">
                        {results.meta.total} result{results.meta.total !== 1 ? 's' : ''} for &ldquo;{initialQuery}&rdquo;
                    </p>
                    <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {results.data.map((e) => (
                            <WikiEntityCard
                                key={e.id}
                                entity={e}
                                universeSlug={e.universe?.slug ?? ''}
                            />
                        ))}
                    </div>

                    {results.data.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                            <Search className="mx-auto mb-3 size-8 text-slate-400" />
                            <p className="text-sm text-slate-500">No results found. Try a different search term.</p>
                        </div>
                    )}

                    {results.meta.last_page > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            {results.links.prev && (
                                <Link href={results.links.prev} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Previous</Link>
                            )}
                            <span className="text-xs text-slate-500">
                                Page {results.meta.current_page} of {results.meta.last_page}
                            </span>
                            {results.links.next && (
                                <Link href={results.links.next} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow text-xs">Next</Link>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 px-6">
                    <Search className="mx-auto mb-3 size-8 text-slate-400" />
                    <p className="text-sm text-slate-500">
                        Enter a search term to find entities across all universes.
                    </p>
                </div>
            )}
        </WikiLayout>
    );
}
