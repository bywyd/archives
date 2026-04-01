import { Link } from '@inertiajs/react';
import { ChevronRight, Loader2, Tag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import type { ApiEntityTiny, ApiTag } from '@/types/api';

//  Module-level cache 
// Keyed by "universeId:entityId" so navigating between entities gets fresh data
// but the same entity never re-fetches within a session.
type GroupedRelated = Record<string, { tag: ApiTag; entities: ApiEntityTiny[] }>;
const _cache = new Map<string, GroupedRelated>();
const _inflight = new Map<string, Promise<GroupedRelated>>();

function cacheKey(universeId: number, entityId: number) {
    return `${universeId}:${entityId}`;
}

function loadRelated(universeId: number, entityId: number): Promise<GroupedRelated> {
    const key = cacheKey(universeId, entityId);
    if (_cache.has(key)) return Promise.resolve(_cache.get(key)!);
    if (!_inflight.has(key)) {
        const p = api
            .fetchEntityRelatedByTag(universeId, entityId)
            .then((res) => {
                const data = res.data ?? {};
                _cache.set(key, data);
                return data;
            })
            .catch(() => {
                _inflight.delete(key);
                return {} as GroupedRelated;
            });
        _inflight.set(key, p);
    }
    return _inflight.get(key)!;
}

//  Sub-components 

function EntityChip({
    entity,
    universeSlug,
}: {
    entity: ApiEntityTiny;
    universeSlug: string;
}) {
    const img = entity.profile_image;
    const typeColor = entity.entity_type?.color;

    return (
        <Link
            href={`/w/${universeSlug}/${entity.slug}`}
            className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:shadow hover:no-underline"
            title={entity.entity_type?.name}
        >
            {/* Thumbnail or initial avatar */}
            <div className="relative shrink-0 size-7 overflow-hidden rounded-sm bg-slate-100">
                {img ? (
                    <img
                        src={img.thumbnail_url ?? img.url}
                        alt={img.alt_text ?? entity.name}
                        className="size-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="flex size-full items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: typeColor ?? '#94a3b8' }}
                    >
                        {entity.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-800 transition-colors group-hover:text-blue-700 leading-tight">
                    {entity.name}
                </div>
                {entity.entity_type && (
                    <div
                        className="truncate text-[10px] leading-none mt-0.5"
                        style={{ color: typeColor ?? '#94a3b8' }}
                    >
                        {entity.entity_type.name}
                    </div>
                )}
            </div>

            <ChevronRight className="size-3 shrink-0 text-slate-300 transition-colors group-hover:text-blue-400" />
        </Link>
    );
}

function TagGroup({
    tagSlug,
    group,
    universeSlug,
}: {
    tagSlug: string;
    group: { tag: ApiTag; entities: ApiEntityTiny[] };
    universeSlug: string;
}) {
    const { tag, entities } = group;
    const [expanded, setExpanded] = useState(true);

    return (
        <div>
            {/* Tag row header */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-2 py-1.5 text-left"
                aria-expanded={expanded}
            >
                <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={
                        tag.color
                            ? {
                                  borderColor: tag.color,
                                  color: tag.color,
                                  backgroundColor: tag.color + '15',
                              }
                            : {
                                  borderColor: '#e2e8f0',
                                  color: '#64748b',
                                  backgroundColor: '#f8fafc',
                              }
                    }
                >
                    <Tag className="size-2.5" />
                    {tag.name}
                </span>
                <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-400">
                    {entities.length}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 select-none">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>

            {expanded && (
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {entities.map((e) => (
                        <EntityChip key={e.id} entity={e} universeSlug={universeSlug} />
                    ))}
                </div>
            )}
        </div>
    );
}

//  Main component 

type Props = {
    universeId: number;
    universeSlug: string;
    entityId: number;
    /** Tags the entity already has (from SSR payload) used to decide visibility */
    hasTags: boolean;
};

export function WikiTaggedEntities({ universeId, universeSlug, entityId, hasTags }: Props) {
    const key = cacheKey(universeId, entityId);

    const [groups, setGroups] = useState<GroupedRelated>(() => _cache.get(key) ?? {});
    const [loading, setLoading] = useState(!_cache.has(key) && hasTags);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!hasTags) return;
        if (_cache.has(key)) {
            setGroups(_cache.get(key)!);
            setLoading(false);
            return;
        }
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        loadRelated(universeId, entityId).then((data) => {
            setGroups(data);
            setLoading(false);
        });
    }, [universeId, entityId, key, hasTags]);

    const tagSlugs = Object.keys(groups);

    // Nothing to show and not loading
    if (!hasTags) return null;
    if (!loading && tagSlugs.length === 0) return null;

    return (
        <div className="mb-8 mt-2 scroll-mt-20" id="section-related-tags">
            {/* Section header */}
            <div className="flex items-center gap-2 border-b-2 border-blue-100 pb-2 mb-4">
                <Tag className="size-4 text-blue-500 shrink-0" />
                <h2 className="flex-1 text-xl font-semibold text-slate-900">
                    <a href="#section-related-tags" className="hover:text-blue-600 transition-colors">
                        Related Entities by Tag
                    </a>
                </h2>
                {loading && <Loader2 className="size-4 animate-spin text-blue-400 shrink-0" />}
            </div>

            {loading && tagSlugs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading related entities…
                </div>
            ) : (
                <div className="space-y-4">
                    {tagSlugs.map((slug) => (
                        <TagGroup
                            key={slug}
                            tagSlug={slug}
                            group={groups[slug]}
                            universeSlug={universeSlug}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
