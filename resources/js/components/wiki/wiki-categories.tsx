import { Link } from '@inertiajs/react';
import { ChevronRight, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type { ApiCategory } from '@/types/api';

//  Module-level caches 
// Keyed by universeId so multiple entity pages in the same SPA session reuse the
// already-fetched category list.
const _resolvedCache = new Map<number, ApiCategory[]>();
const _inflightCache = new Map<number, Promise<ApiCategory[]>>();

function flattenCategories(cats: ApiCategory[]): ApiCategory[] {
    return cats.flatMap((c) => [c, ...flattenCategories(c.children ?? [])]);
}

function loadCategories(universeId: number): Promise<ApiCategory[]> {
    if (_resolvedCache.has(universeId)) {
        return Promise.resolve(_resolvedCache.get(universeId)!);
    }
    if (!_inflightCache.has(universeId)) {
        const p = api
            .fetchCategories(universeId)
            .then((res) => {
                // fetchCategories returns { data: ApiCategory[] } (paginated envelope)
                const flat = flattenCategories((res as any).data ?? []);
                _resolvedCache.set(universeId, flat);
                return flat;
            })
            .catch(() => {
                // Remove from inflight so the next mount can retry
                _inflightCache.delete(universeId);
                return [] as ApiCategory[];
            });
        _inflightCache.set(universeId, p);
    }
    return _inflightCache.get(universeId)!;
}

//  Component 

type Props = {
    categories: ApiCategory[];
    universeId: number;
    universeSlug: string;
};

export function WikiCategories({ categories, universeId, universeSlug }: Props) {
    // Map of id → enriched category (with entities_count from API)
    const [enrichedMap, setEnrichedMap] = useState<Map<number, ApiCategory>>(() => {
        // Hydrate from module cache synchronously if already available
        const cached = _resolvedCache.get(universeId);
        return cached ? new Map(cached.map((c) => [c.id, c])) : new Map();
    });
    const [loading, setLoading] = useState(!_resolvedCache.has(universeId));

    useEffect(() => {
        if (_resolvedCache.has(universeId)) {
            const flat = _resolvedCache.get(universeId)!;
            setEnrichedMap(new Map(flat.map((c) => [c.id, c])));
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        loadCategories(universeId).then((flat) => {
            if (!cancelled) {
                setEnrichedMap(new Map(flat.map((c) => [c.id, c])));
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [universeId]);

    if (!categories || categories.length === 0) return null;

    return (
        <div className="mb-8 mt-6 scroll-mt-20" id="section-categories">
            {/* Wikipedia / Fandom-style categories box */}
            <div className="rounded-lg border border-blue-100 bg-linear-to-b from-blue-50/60 to-white overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-blue-100 px-4 py-2.5 bg-blue-50/80">
                    <Folder className="size-4 text-blue-500 shrink-0" />
                    <h2 className="text-sm font-semibold text-slate-700 flex-1">
                        <a href="#section-categories" className="hover:text-blue-600 transition-colors">
                            Categories
                        </a>
                    </h2>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {categories.length}
                    </span>
                    {loading && <Loader2 className="size-3.5 animate-spin text-blue-400 shrink-0" />}
                </div>

                {/* Category chips */}
                <div className="px-4 py-3 flex flex-wrap gap-2">
                    {categories.map((cat) => {
                        const rich = enrichedMap.get(cat.id) ?? cat;
                        const parent = cat.parent_id ? enrichedMap.get(cat.parent_id) : null;
                        const count = rich.entities_count;

                        return (
                            <Link
                                key={cat.id}
                                href={`/w/${universeSlug}/category/${cat.slug}`}
                                title={cat.description ?? cat.name}
                                className="group inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:shadow hover:no-underline"
                            >
                                {/* Parent breadcrumb */}
                                {parent && (
                                    <span className="flex items-center gap-0.5 font-normal text-slate-400 group-hover:text-blue-400">
                                        {parent.name}
                                        <ChevronRight className="size-2.5" />
                                    </span>
                                )}
                                <FolderOpen className="size-3 text-blue-400 group-hover:text-blue-500 shrink-0" />
                                <span>{cat.name}</span>
                                {/* Entity count badge */}
                                {count !== undefined && (
                                    <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-400 transition-colors group-hover:bg-blue-100 group-hover:text-blue-500">
                                        {count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
