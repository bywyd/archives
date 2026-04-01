import { Head, Link } from '@inertiajs/react';
import { BookOpen, ChevronRight, Clock, Film, Folder, Globe, Star, TrendingUp } from 'lucide-react';
import { TypeIcon } from '@/components/archives/type-icon';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import { useUniverseTheme } from '@/hooks/use-universe-theme';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiCategory, ApiEntitySummary, ApiMediaSource, ApiMetaEntityType, ApiSidebarTree, ApiTimeline, ApiUniverse } from '@/types/api';

type Props = {
    universe: ApiUniverse & { entities_count: number; timelines_count: number; media_sources_count?: number };
    sidebarTree: ApiSidebarTree;
    entityTypes: (ApiMetaEntityType & { entities_count: number })[];
    featuredEntities: ApiEntitySummary[];
    recentEntities: ApiEntitySummary[];
    timelines: (ApiTimeline & { entities_count?: number; events_count?: number })[];
    mediaSources: (ApiMediaSource & { entities_count?: number })[];
    categories: ApiCategory[];
};

export default function UniversePage({
    universe,
    sidebarTree,
    entityTypes,
    featuredEntities,
    recentEntities,
    timelines,
    mediaSources,
    categories,
}: Props) {
    const { themeColor, iconUrl, bannerUrl } = useUniverseTheme(universe);

    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
        >
            <Head title={universe.name}>
                <meta name="description" content={universe?.description ?? `Explore the ${universe?.name} universe.`} />
                <meta property="og:title" content={`${universe?.name}`} />
                <meta property="og:description" content={universe?.description ?? `Explore the ${universe?.name} universe.`} />
                <link rel="canonical" href={`/w/${universe?.slug}`} />
            </Head>

            {/*  Universe Hero  */}
            {bannerUrl ? (
                <div className="-mx-6 -mt-10 mb-8">
                    <div className="relative h-64 overflow-hidden rounded-b-3xl sm:h-72 shadow-sm">
                        <img
                            src={bannerUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                            style={{ filter: 'brightness(0.85)' }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 50%, transparent 100%)',
                            }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-5 px-8 pb-8">
                            {iconUrl && (
                                <img
                                    src={iconUrl}
                                    alt=""
                                    className="hidden size-16 rounded-2xl border-2 border-white/20 bg-slate-900/50 object-contain shadow-xl backdrop-blur-md sm:block"
                                    style={{ backgroundColor: themeColor ? `${themeColor}44` : 'rgba(255,255,255,0.1)' }}
                                />
                            )}
                            <div className="text-white">
                                <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-md">{universe.name}</h1>
                                {universe.description && (
                                    <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm font-medium text-slate-200 drop-shadow">
                                        {universe.description}
                                    </p>
                                )}
                            </div>
                            {/* stats */}
                            <div className="ml-auto hidden items-center gap-6 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 sm:flex z-999">
                                
                                <div className="flex items-center gap-1">
                                    <BookOpen className="size-4" />
                                    {universe.entities_count} {universe.entities_count === 1 ? 'Entity' : 'Entities'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="size-4" />
                                    {universe.timelines_count} {universe.timelines_count === 1 ? 'Timeline' : 'Timelines'}
                                </div>
                                {universe.media_sources_count != null && (
                                    <div className="flex items-center gap-1">
                                        <Film className="size-4" />
                                        {universe.media_sources_count} {universe.media_sources_count === 1 ? 'Media Source' : 'Media Sources'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className="-mx-6 -mt-10 mb-8 overflow-hidden rounded-b-3xl px-8 py-10 shadow-sm"
                    style={{
                        background: themeColor
                            ? `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}05 100%)`
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderBottom: `1px solid ${themeColor ? themeColor + '20' : '#e2e8f0'}`,
                    }}
                >
                    <div className="flex items-center gap-5">
                        {iconUrl ? (
                            <img
                                src={iconUrl}
                                alt=""
                                className="size-16 rounded-2xl border border-white/80 bg-white shadow-sm object-contain"
                            />
                        ) : (
                            <div
                                className="flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                                style={{ backgroundColor: themeColor ? `${themeColor}20` : '#e0f2fe' }}
                            >
                                <Globe className="size-8" style={{ color: themeColor ?? '#0284c7' }} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{universe.name}</h1>
                            {universe.description && (
                                <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                                    {universe.description}
                                </p>
                            )}
                        </div>
                        {/* stats */}
                        <div className="ml-auto hidden items-center gap-6 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 sm:flex z-999">
                            
                            <div className="flex items-center gap-1">
                                <BookOpen className="size-4" />
                                {universe.entities_count} {universe.entities_count === 1 ? 'Entity' : 'Entities'}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="size-4" />
                                {universe.timelines_count} {universe.timelines_count === 1 ? 'Timeline' : 'Timelines'}
                            </div>
                            {universe.media_sources_count != null && (
                                <div className="flex items-center gap-1">
                                    <Film className="size-4" />
                                    {universe.media_sources_count} {universe.media_sources_count === 1 ? 'Media Source' : 'Media Sources'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/*  Main Content Grid  */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                
                {/* Left Column: Primary Content (Span 8) */}
                <div className="space-y-10 lg:col-span-8">
                    
                    {/* Featured */}
                    {featuredEntities.length > 0 && (
                        <section>
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                    <Star className="size-4" />
                                </div>
                                Featured Entities
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {featuredEntities.map((e) => (
                                    <WikiEntityCard key={e.id} entity={e} universeSlug={universe.slug} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Recent */}
                    {recentEntities.length > 0 && (
                        <section>
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                    <TrendingUp className="size-4" />
                                </div>
                                Recently Added
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {recentEntities.map((e) => (
                                    <WikiEntityCard key={e.id} entity={e} universeSlug={universe.slug} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Entity Types */}
                    {entityTypes.length > 0 && (
                        <section>
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <BookOpen className="size-4" />
                                </div>
                                Browse by Type
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {entityTypes.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/w/${universe.slug}/type/${t.slug}`}
                                        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md hover:ring-1 hover:ring-slate-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            {t.icon ? <TypeIcon entityType={t} /> : <BookOpen className="size-4 text-slate-400 group-hover:text-blue-500 transition-colors" />}
                                            <span className="font-semibold text-slate-700 transition-colors group-hover:text-slate-900" style={{ color: t.color ?? undefined }}>
                                                {t.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                {t.entities_count}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: Secondary/Navigational Content (Span 4) */}
                <div className="space-y-8 lg:col-span-4">
                    
                    {/* Timelines */}
                    {timelines.length > 0 && (
                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Timelines</h2>
                            <div className="flex flex-col gap-2">
                                {timelines.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/w/${universe.slug}/timeline/${t.slug}`}
                                        className="group flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:ring-1 hover:ring-blue-100"
                                    >
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <Clock className="size-4" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{t.name}</span>
                                            {t.events_count != null && (
                                                <span className="text-xs text-slate-400">{t.events_count} events</span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Media Sources */}
                    {mediaSources.length > 0 && (
                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Media Sources</h2>
                            <div className="flex flex-col gap-2">
                                {mediaSources.map((m) => (
                                    <Link
                                        key={m.id}
                                        href={`/w/${universe.slug}/media/${m.slug}`}
                                        className="group flex items-center justify-between rounded-lg bg-white p-3 border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:ring-1 hover:ring-blue-100"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <Film className="size-4" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{m.name}</span>
                                                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{m.media_type}</span>
                                            </div>
                                        </div>
                                        {m.entities_count != null && (
                                            <span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">{m.entities_count}</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Categories */}
                    {categories.length > 0 && (
                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Categories</h2>
                            <div className="flex flex-col gap-3">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
                                        <Link
                                            href={`/w/${universe.slug}/category/${cat.slug}`}
                                            className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
                                        >
                                            <Folder className="size-4 text-slate-400 group-hover:text-blue-600" />
                                            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">{cat.name}</span>
                                        </Link>
                                        {cat.children?.length > 0 && (
                                            <div className="ml-5 mt-1 mb-2 space-y-1 border-l-2 border-slate-100 pl-3">
                                                {cat.children.map((child) => (
                                                    <Link
                                                        key={child.id}
                                                        href={`/w/${universe.slug}/category/${child.slug}`}
                                                        className="block rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </WikiLayout>
    );
}