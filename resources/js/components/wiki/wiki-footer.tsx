import AppLogoIcon from '../app-logo-icon';
import { ApiSidebarTree } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUp, BookOpen, ChevronRight, Clock, Film, Folder, FolderOpen, Globe, Home, Map, Search, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WikiFooter({
    sidebarTree,
    universe,
    universeIconUrl,
    universeThemeColor,
}: {
    sidebarTree?: ApiSidebarTree | null;
    universe?: { id: number; name: string; slug: string } | null;
    universeIconUrl?: string | null;
    universeThemeColor?: string | null;
}) {
    const [showTop, setShowTop] = useState(false);
    const page = usePage();
    const appName = page?.props?.name || 'Archives';
    const appLogo = page?.props?.branding?.logo_url;

    useEffect(() => {
        function onScroll() {
            setShowTop(window.scrollY > 400);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const hasUniverse = !!(universe && sidebarTree);
    const entityTypes = (sidebarTree?.entity_types ?? []).filter((t) => t.entities_count > 0);
    const timelines = sidebarTree?.timelines ?? [];
    const mediaSources = sidebarTree?.media_sources ?? [];
    const categories = sidebarTree?.categories ?? [];
    const maps = sidebarTree?.maps ?? [];
    const totalEntities = sidebarTree?.total_entities ?? 0;

    return (
        <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">

                    {/*  Brand Column  */}
                    <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
                        <Link
                            href="/"
                            className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-75 hover:no-underline"
                        >
                            {/* <AppLogoIcon className="size-7 text-blue-600" /> */}
                                {universeIconUrl ? (
                                    <img
                                        src={universeIconUrl}
                                        alt={`${universe?.name} icon`}
                                        className="size-10 rounded-full object-cover"
                                        // style={{ backgroundColor: universeThemeColor ?? 'transparent' }}
                                    />
                                ) : (
                                    appLogo 
                                    ? <img src={appLogo} alt={appName+" Logo"} className="size-7" />
                                    : <AppLogoIcon className="size-7 text-blue-400" />    
                                                        
                                )}
                            {/* <span>Archives</span> */}
                            <span>{hasUniverse ? `${universe!.name}` : appName}</span>
                        </Link>
                        <p className="max-w-55 text-[0.8125rem] leading-relaxed text-slate-500">
                            A comprehensive wiki for tracking fictional universes, entities, timelines, and lore.
                        </p>

                        {/* Stats pill */}
                        {totalEntities > 0 && (
                            <div className="flex w-fit items-center gap-1.5 py-1 text-xs text-slate-500">
                                <span className="font-semibold tabular-nums text-slate-900">{totalEntities.toLocaleString()}</span>
                                <span>entities catalogued</span>
                            </div>
                        )}

                        {/* Current universe badge */}
                        {hasUniverse && (
                            <div>
                                <Link
                                    href={`/w/${universe!.slug}`}
                                    className="flex w-fit items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:no-underline"
                                >
                                    <Globe className="size-3.5 shrink-0" />
                                    {universe!.name} Wiki
                                    <ChevronRight className="size-3 opacity-60" />
                                </Link>
                                {/* open in archives */}
                                <Link
                                    href={`/archives/${universe!.slug}`}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:no-underline"
                                >
                                    <BookOpen className="size-3.5 shrink-0" />
                                    View in Archives
                                </Link>
                            </div>
                        )}
                    </div>

                    {/*  Navigate Column  */}
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                            Navigate
                        </h4>
                        <nav className="flex flex-col gap-1.5">
                            <FooterLink href="/w" icon={Home}>All Wikis</FooterLink>
                            <FooterLink href="/w/search" icon={Search}>Search</FooterLink>
                            <FooterLink href="/w/changelog" icon={Clock}>Changelog</FooterLink>
                            <FooterLink href="/archives" icon={BookOpen}>Archives</FooterLink>
                        </nav>
                    </div>

                    {/*  Entity Types Column  */}
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                            {hasUniverse ? 'Entity Types' : 'Explore'}
                        </h4>
                        {entityTypes.length > 0 ? (
                            <nav className="flex flex-col gap-1.5">
                                {entityTypes.slice(0, 8).map((et) => (
                                    <Link
                                        key={et.id}
                                        href={`/w/${universe?.slug}/type/${et.slug}`}
                                        className="group flex items-center justify-between gap-2 rounded-md py-0.5 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
                                    >
                                        <span className="truncate">{et.name}</span>
                                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-1.5 py-px text-[0.6875rem] tabular-nums leading-relaxed text-slate-400 transition-colors group-hover:border-blue-200 group-hover:text-blue-500">
                                            {et.entities_count}
                                        </span>
                                    </Link>
                                ))}
                                {entityTypes.length > 8 && (
                                    <Link
                                        href={`/w/${universe?.slug}`}
                                        className="mt-1 text-[0.75rem] text-slate-400 transition-colors hover:text-blue-600 hover:no-underline"
                                    >
                                        +{entityTypes.length - 8} more types
                                    </Link>
                                )}
                            </nav>
                        ) : (
                            <nav className="flex flex-col gap-1.5">
                                <FooterLink href="/w" icon={FolderOpen}>Browse Universes</FooterLink>
                                <FooterLink href="/w/search" icon={Search}>Search Entities</FooterLink>
                            </nav>
                        )}
                    </div>

                    {/*  Discover Column  */}
                    <div className="flex flex-col gap-5">
                        {timelines.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                                    Timelines
                                </h4>
                                <nav className="flex flex-col gap-1.5">
                                    {timelines.slice(0, 5).map((t) => (
                                        <Link
                                            key={t.id}
                                            href={`/w/${universe?.slug}/timeline/${t.slug}`}
                                            className="flex items-center gap-2 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
                                        >
                                            <Clock className="size-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{t.name}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {mediaSources.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                                    Media Sources
                                </h4>
                                <nav className="flex flex-col gap-1.5">
                                    {mediaSources.slice(0, 5).map((m) => (
                                        <Link
                                            key={m.id}
                                            href={`/w/${universe?.slug}/media/${m.slug}`}
                                            className="flex items-center gap-2 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
                                        >
                                            <Film className="size-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{m.name}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {maps.length > 0 && hasUniverse && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                                    Featured Maps
                                </h4>
                                <nav className="flex flex-col gap-1.5">
                                    {maps.slice(0, 5).map((m) => (
                                        <Link
                                            key={m.id}
                                            href={`/w/${universe?.slug}/${m.entity_slug}/maps/${m.slug}`}
                                            className="flex items-center gap-2 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
                                        >
                                            <Map className="size-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{m.entity_name} · {m.name}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {categories.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                                    Categories
                                </h4>
                                <nav className="flex flex-col gap-1.5">
                                    {categories.slice(0, 5).map((c) => (
                                        <Link
                                            key={c.id}
                                            href={`/w/${universe?.slug}/categories/${c.slug}`}
                                            className="flex items-center gap-2 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
                                        >
                                            <Folder className="size-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{c.name}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        )}

                        {!hasUniverse && timelines.length === 0 && mediaSources.length === 0 && categories.length === 0 && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                                    Discover
                                </h4>
                                <nav className="flex flex-col gap-1.5">
                                    <FooterLink href="/w/changelog" icon={Clock}>Changelog</FooterLink>
                                    <FooterLink href="/archives" icon={BookOpen}>Archives</FooterLink>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/*  Bottom Bar  */}
            <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 md:flex-row">
                    <div className="flex items-center gap-2 text-[0.8125rem] text-slate-500">
                        {/* <AppLogoIcon className="size-7 text-blue-600" /> */}

                        {appLogo ? 
                            <img src={appLogo} alt={appName+" Logo"} className="size-7" />
                        : 
                            <AppLogoIcon className="size-7 text-blue-400" />    
                        }
                        <span className="font-medium text-slate-900">{appName}</span>
                        <span className="text-slate-300">·</span>
                        <span>&copy; {new Date().getFullYear()} All rights reserved</span>
                    </div>
                    <nav className="flex items-center gap-5 text-[0.8125rem]">
                        {[
                            { href: '/terms', label: 'Terms' },
                            { href: '/privacy', label: 'Privacy' },
                            { href: '/cookies', label: 'Cookies' },
                        ].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-slate-400 transition-colors hover:text-blue-600 hover:no-underline"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/*  Back to Top  */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-6 right-6 z-30 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-all duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg ${
                    showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
                }`}
                aria-label="Back to top"
            >
                <ArrowUp className="size-3.5" />
            </button>
        </footer>
    );
}

//  Footer Link 

function FooterLink({
    href,
    icon: Icon,
    children,
}: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 text-[0.8125rem] text-slate-600 transition-colors hover:text-blue-600 hover:no-underline"
        >
            <Icon className="size-3.5 shrink-0 text-slate-400" />
            {children}
        </Link>
    );
}
