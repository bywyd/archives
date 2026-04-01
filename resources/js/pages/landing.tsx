import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, ChevronRight, Clock, Film, Globe, Search, Sparkles, X, ArrowRight, Database, MapPin, Users } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import * as api from '@/lib/api';
import type { ApiEntitySummary, ApiImage, ApiSearchResult, ApiUniverse } from '@/types/api';
import AppLogoIcon from '@/components/app-logo-icon';

type Props = {
    universes: (ApiUniverse & { entities_count: number; timelines_count: number; media_sources_count?: number })[];
    featured: (ApiEntitySummary & { universe?: { id: number; name: string; slug: string } })[];
    stats: { universes: number; entities: number; timelines: number; media_sources: number };
};

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function Landing({ universes, featured, stats }: Props) {
    const page = usePage<{ branding?: { logo_url?: string }; name: string }>();
    const appLogo = page.props.branding?.logo_url;
    const appName = page.props.name;

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased">
            <Head title="Welcome">
                <meta name="description" content="A comprehensive intelligence database and wiki cataloguing fictional universes, characters, locations, events, and lore." />
                <meta property="og:title" content={appName} />
                <meta property="og:description" content="A comprehensive intelligence database and wiki cataloguing fictional universes." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="/" />
                <link rel="canonical" href="/" />
                <script type="application/ld+json">{JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: appName,
                    description: 'A comprehensive intelligence database and wiki cataloguing fictional universes.',
                    url: '/',
                })}</script>
            </Head>

            <Toaster position="top-center" richColors />

            {/* Hero */}
            <header className="relative overflow-hidden bg-slate-950 text-white">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/4 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
                    <div className="absolute right-1/4 bottom-0 h-96 w-96 translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
                </div>

                <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-2.5">
                        {/* <AppLogoIcon className="size-16 text-blue-400" /> */}
                        {appLogo ? 
                            <img src={appLogo} alt={appName+" Logo"} className="size-16" />
                        : 
                            <AppLogoIcon className="size-16 text-blue-600" />    
                        }
                        <span className="text-sm font-semibold tracking-wide text-white/90">{appName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                        <Link href="/w" className="transition-colors hover:text-white">Wiki</Link>
                        <Link href="/archives" className="transition-colors hover:text-white">Archives UI</Link>
                        <Link href="/w/search" className="transition-colors hover:text-white">Search</Link>
                    </div>
                </nav>

                <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pb-32 sm:pt-24">
                    <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:gap-16">
                        <div className="flex-1">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                                <span className="size-1.5 rounded-full bg-blue-400" />
                                Relation-Oriented Database
                            </div>
                            <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                                <span className="bg-linear-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                                    {appName}
                                </span>
                            </h1>
                            <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-400">
                                A comprehensive intelligence database cataloguing fictional universes  characters, locations, events, lore, and the intricate relations between them.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/archives"
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-95"
                                >
                                    Browse Archives
                                    <ArrowRight className="size-4" />
                                </Link>
                                <Link
                                    href="/w"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-700 active:scale-95"
                                >
                                    Traditional Wiki
                                </Link>
                                <Link
                                    href="/w/search"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-700 active:scale-95"
                                >
                                    <Search className="size-3.5" />
                                    Search Wiki
                                </Link>
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:shrink-0">
                            <StatCard icon={Globe} label="Universes" value={stats.universes} color="blue" />
                            <StatCard icon={Users} label="Entities" value={stats.entities} color="sky" />
                            <StatCard icon={Clock} label="Timelines" value={stats.timelines} color="violet" />
                            <StatCard icon={Film} label="Media Sources" value={stats.media_sources} color="emerald" />
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white to-transparent" />
            </header>

            {/* Search */}
            <LandingSearch universes={universes} />

            {/* Universes */}
            <section className="mx-auto w-full max-w-6xl px-6 py-14">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Universes</h2>
                        <p className="mt-1 text-sm text-slate-500">Explore the catalogued fictional worlds</p>
                    </div>
                    <Link href="/w" className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700">
                        View all <ChevronRight className="size-3.5" />
                    </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {universes.map((u) => <UniverseCard key={u.id} universe={u} />)}
                </div>
            </section>

            {/* Featured Entities */}
            {featured.length > 0 && (
                <section className="border-y border-slate-100 bg-slate-50/70">
                    <div className="mx-auto max-w-6xl px-6 py-14">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <div className="mb-1.5 flex items-center gap-2">
                                    <Sparkles className="size-4 text-amber-400" />
                                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Spotlight</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Featured Entities</h2>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {featured.map((e) => (
                                <WikiEntityCard
                                    key={e.id}
                                    entity={e}
                                    universeSlug={e.universe?.slug ?? ''}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Feature pillars */}
            <section className="mx-auto w-full max-w-6xl px-6 py-14">
                <div className="grid gap-6 sm:grid-cols-3">
                    <FeaturePillar
                        icon={Database}
                        title="Structured Lore"
                        description="Every entity is richly catalogued with attributes, relations, timelines, and records  no flat wiki pages."
                    />
                    <FeaturePillar
                        icon={MapPin}
                        title="Interactive Maps"
                        description="Navigate fictional locations with annotated floor-plans, markers, and region boundaries."
                    />
                    <FeaturePillar
                        icon={BookOpen}
                        title="Cross-Universe Search"
                        description="An advanced search engine surfaces connections across universes with a natural-language interface."
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-white px-6 py-10">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            {/* <AppLogoIcon className="size-10 text-blue-600" /> */}
                            
                            {appLogo ? 
                                <img src={appLogo} alt={appName+" Logo"} className="size-16" />
                            : 
                                <AppLogoIcon className="size-16 text-blue-600" />    
                            }
                            <span className="text-sm font-semibold text-slate-700">{appName}</span>
                        </div>
                        <div className="flex gap-6 text-xs font-medium text-slate-400">
                            <Link href="/w" className="transition-colors hover:text-blue-600">Wiki</Link>
                            <Link href="/w/changelog" className="transition-colors hover:text-blue-600">Changelog</Link>
                            <Link href="/w/search" className="transition-colors hover:text-blue-600">Search</Link>
                            <Link href="/archives" className="transition-colors hover:text-blue-600">Archives</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

//  Landing search 

function LandingSearch({ universes }: { universes: (ApiUniverse & { entities_count: number; timelines_count: number })[] }) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [entityResults, setEntityResults] = useState<ApiSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.length < 2) { setEntityResults([]); setLoading(false); return; }
        setLoading(true);
        api.globalSearch(debouncedQuery)
            .then((r) => setEntityResults(r.data.slice(0, 6)))
            .catch(() => setEntityResults([]))
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const matchedUniverses = debouncedQuery.length >= 2
        ? universes.filter((u) => u.name.toLowerCase().includes(debouncedQuery.toLowerCase())).slice(0, 3)
        : [];

    const showPanel = open && debouncedQuery.length >= 2 && (loading || matchedUniverses.length > 0 || entityResults.length > 0);

    return (
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-6 py-3">
                <div ref={containerRef} className="relative">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md">
                        <Search className="size-4 shrink-0 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                            onFocus={() => setOpen(true)}
                            placeholder="Search universes, characters, locations, events..."
                            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setDebouncedQuery(''); setEntityResults([]); setOpen(false); }} className="text-slate-400 transition-colors hover:text-slate-600">
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {showPanel && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            {matchedUniverses.length > 0 && (
                                <div>
                                    <div className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Universes</div>
                                    {matchedUniverses.map((u) => (
                                        <div key={u.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50">
                                            <Globe className="size-4 shrink-0 text-sky-400" />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-slate-900">{u.name}</div>
                                                <div className="text-[11px] text-slate-400">{u.entities_count} entities · {u.timelines_count} timelines</div>
                                            </div>
                                            <div className="flex shrink-0 gap-1.5">
                                                <Link href={`/archives/${u.slug}`} onClick={() => setOpen(false)} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:no-underline">Archives</Link>
                                                <Link href={`/w/${u.slug}`} onClick={() => setOpen(false)} className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-600 transition-colors hover:bg-sky-100 hover:no-underline">Wiki</Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {loading && entityResults.length === 0 && (
                                <div>
                                    <div className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Entities</div>
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                                            <div className="size-8 shrink-0 animate-pulse rounded bg-slate-100" />
                                            <div className="flex flex-1 flex-col gap-1.5">
                                                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                                                <div className="h-2 w-20 animate-pulse rounded bg-slate-100" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {entityResults.length > 0 && (
                                <div>
                                    <div className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Entities</div>
                                    {entityResults.map((e) => (
                                        <div key={e.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50">
                                            {e.images?.[0] ? (
                                                <img src={e.images[0].thumbnail_url ?? e.images[0].url} alt="" className="size-8 shrink-0 rounded object-cover" />
                                            ) : (
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-sky-50">
                                                    <span className="text-xs font-medium text-sky-400">{e.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-slate-900">{e.name}</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {e.entity_type?.name && <span className="mr-1.5">{e.entity_type.name}</span>}
                                                    {e.universe && <span>in {e.universe.name}</span>}
                                                </div>
                                            </div>
                                            {e.universe && (
                                                <div className="flex shrink-0 gap-1.5">
                                                    <Link href={`/archives/${encodeURIComponent(e.universe.slug)}?open=entity-dossier&universe=${encodeURIComponent(e.universe.slug)}&entity=${encodeURIComponent(e.slug)}`} onClick={() => setOpen(false)} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:no-underline">Archives</Link>
                                                    <Link href={`/w/${e.universe.slug}/${e.slug}`} onClick={() => setOpen(false)} className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-600 transition-colors hover:bg-sky-100 hover:no-underline">Wiki</Link>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end border-t border-slate-100 px-4 py-2.5">
                                <Link href={`/w/search?q=${encodeURIComponent(debouncedQuery)}`} onClick={() => setOpen(false)} className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:no-underline">
                                    View all results &rarr;
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

//  Stat card 

const colorMap: Record<string, { bg: string; icon: string }> = {
    blue:    { bg: 'bg-blue-500/10 border-blue-500/20',     icon: 'text-blue-400'    },
    sky:     { bg: 'bg-sky-500/10 border-sky-500/20',       icon: 'text-sky-400'     },
    violet:  { bg: 'bg-violet-500/10 border-violet-500/20', icon: 'text-violet-400'  },
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'text-emerald-400' },
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
    const c = colorMap[color] ?? colorMap.blue;
    return (
        <div className={`flex flex-col gap-2 rounded-xl border p-4 ${c.bg}`}>
            <div>
                <div className="flex gap-3 items-center">
                    <Icon className={`size-6 ${c.icon}`} />
                    <div className="text-2xl font-bold tabular-nums tracking-tight text-white">
                        {value.toLocaleString()}
                    </div>
                </div>
                <div className="text-xs font-medium text-slate-400">{label}</div>
            </div>
        </div>
    );
}

//  Universe card 

function UniverseCard({ universe }: { universe: ApiUniverse & { entities_count: number; timelines_count: number } }) {
    const banner = universe?.images?.find((i: ApiImage) => i.type === 'banner' || i.type === 'profile');
    return (
        <Link
            href={`/w/${universe.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
        >
            {banner ? (
                <div className="overflow-hidden">
                    <img src={banner.url} alt={universe.name} loading="lazy" className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                </div>
            ) : (
                <div className="flex h-40 items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
                    <Globe className="size-12 text-slate-600" />
                </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600">{universe.name}</h3>
                {universe.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{universe.description}</p>
                )}
                <div className="mt-auto flex gap-4 pt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><BookOpen className="size-3" /> {universe.entities_count} entities</span>
                    <span className="flex items-center gap-1.5"><Clock className="size-3" /> {universe.timelines_count} timelines</span>
                </div>
            </div>
        </Link>
    );
}

//  Feature pillar 

function FeaturePillar({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-blue-50">
                <Icon className="size-5 text-blue-600" />
            </div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
    );
}

