import { Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ChevronDown,
    Clock,
    Film,
    Folder,
    Globe,
    Home,
    LogIn,
    Map,
    Menu,
    Moon,
    Search,
    Sun,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { TypeIcon } from '@/components/archives/type-icon';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import * as api from '@/lib/api';
import type { ApiSearchResult, ApiSidebarTree } from '@/types/api';
import type { User } from '@/types/auth';
import AppLogoIcon from '../app-logo-icon';

type BreadcrumbItem = {
    title: string;
    href?: string;
};

type Props = {
    breadcrumbs?: BreadcrumbItem[];
    sidebarTree?: ApiSidebarTree | null;
    universe?: { id: number; name: string; slug: string } | null;
    universeIconUrl?: string | null;
    universeThemeColor?: string | null;
};

export function WikiNavbar({ breadcrumbs = [], sidebarTree, universe, universeIconUrl, universeThemeColor }: Props) {
    const page = usePage<{ auth: { user: User | null } }>();
    const { url } = page;
    const user = page.props.auth?.user;
    const hasNav = !!(universe && sidebarTree);
    const [megaMenuOpen, setMegaMenuOpen] = useState(false);
    const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [expanded, setExpanded] = useState(false);

    const handleMouseEnter = () => {
        if (megaMenuTimeoutRef.current) {
            clearTimeout(megaMenuTimeoutRef.current);
        }
        setMegaMenuOpen(true);
    };

    const handleMouseLeave = () => {
        megaMenuTimeoutRef.current = setTimeout(() => {
            setMegaMenuOpen(false);
        }, 150);
    };

    return (
        <>
            {/* Thin colored accent stripe at the top of the viewport when a universe is active */}
            {universeThemeColor && (
                <div className="sticky top-0 z-50 h-0.75 w-full shrink-0" style={{ backgroundColor: universeThemeColor }} />
            )}
            <header
                className={`bg-white/96 backdrop-blur-xl saturate-180 border-b border-slate-200 sticky z-40 flex items-center shrink-0 dark:bg-slate-950/96 dark:border-slate-800 ${
                    universeThemeColor ? 'top-0.75 h-14' : 'top-0 h-14'
                }`}
            >
                <div className="flex w-full items-center justify-between px-5">
                    {/* Left Section - Logo & Breadcrumbs */}
                    <div className="flex items-center gap-3 flex-1">
                        <Link
                            href="/"
                            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-75 hover:no-underline"
                        >
                            {/* <AppLogoIcon className="size-7 text-blue-600" /> */}

                            {page.props.branding?.logo_url ? 
                                <img src={page.props.branding.logo_url} alt={page.props.name+" Logo"} className="size-7" />
                            : 
                                <AppLogoIcon className="size-7 text-blue-600" />    
                            }
                            <span className="hidden tracking-tight sm:inline dark:text-slate-100">{page.props.name}</span>
                        </Link>

                        {/* Universe icon badge shown when a universe has an uploaded icon */}
                        {universeIconUrl && (
                            <>
                                <span className="hidden select-none text-xs text-slate-300 sm:inline">|</span>
                                <img
                                    src={universeIconUrl}
                                    alt=""
                                    className="hidden size-6 rounded object-contain sm:inline-block"
                                />
                            </>
                        )}

                        {/* Breadcrumbs inline (desktop) */}
                        {breadcrumbs.length > 0 && (
                            <>
                                <span className="hidden text-slate-400 select-none text-xs md:inline">/</span>
                                <nav className="hidden items-center gap-1.5 text-[0.8125rem] text-slate-500 min-w-0 md:flex" aria-label="Breadcrumb">
                                    {breadcrumbs.map((item, i) => (
                                        <span key={i} className="flex items-center gap-1.5">
                                            {i > 0 && <span className="text-slate-300 select-none text-xs">/</span>}
                                            {item.href ? (
                                                <Link href={item.href} className="text-slate-500 no-underline truncate max-w-56 hover:text-blue-600 transition-colors rounded">
                                                    {item.title}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-900 font-medium truncate dark:text-slate-100">{item.title}</span>
                                            )}
                                        </span>
                                    ))}
                                </nav>
                            </>
                        )}

                        {/* Quick links when no universe context */}
                        {!hasNav && (
                            <nav className="hidden items-center gap-1 ml-2 md:flex">
                                <NavLink href="/w" active={url === '/w'} icon={Home}>All Wikis</NavLink>
                                <NavLink href="/w/search" active={url.startsWith('/w/search')} icon={Search}>Search</NavLink>
                                <NavLink href="/w/changelog" active={url.startsWith('/w/changelog')} icon={Clock}>Changelog</NavLink>
                            </nav>
                        )}
                    </div>

                    {/* Center Section - Universe Name with Hover Trigger */}
                    {hasNav && (
                        <div
                            className="hidden md:flex items-center justify-center flex-1"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <button
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer border-none ${
                                    megaMenuOpen ? 'bg-blue-50' : 'bg-transparent hover:bg-blue-50'
                                }`}
                                style={{
                                    color: universeThemeColor ?? '#2563eb',
                                    backgroundColor: megaMenuOpen
                                        ? (universeThemeColor ? universeThemeColor + '18' : undefined)
                                        : undefined,
                                }}
                            >
                                {universeIconUrl ? (
                                    <img src={universeIconUrl} alt="" className="size-7 rounded object-contain" />
                                ) : (
                                    <Globe className="size-4" />
                                )}
                                {universe!.name}
                                <ChevronDown className={`size-3.5 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}

                    {/* Empty center spacer when no universe */}
                    {!hasNav && <div className="hidden md:flex flex-1" />}

                    {/* Right Section - Search, Links, User */}
                    <div className="hidden items-center justify-end gap-2 flex-1 md:flex">
                        
                        <button
                            onClick={() => setExpanded(true)}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-400 shadow-sm transition-all hover:border-slate-300 hover:shadow sm:w-44 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-slate-600"
                        >
                            <Search className="size-3.5 shrink-0" />
                            <span className="hidden flex-1 text-left sm:inline">Search…</span>
                            <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9px] text-slate-400 sm:inline dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">CTRL+K</kbd>
                        </button>
                        <Link
                            href="/archives"
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 hover:no-underline dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                        >
                            Archives
                        </Link>
                        <DarkModeToggle />
                        {user ? (
                            <UserMenu user={user} />
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:no-underline dark:text-blue-400 dark:hover:bg-blue-950"
                            >
                                <LogIn className="size-3.5" />
                                <span className="hidden sm:inline">Log in</span>
                            </Link>
                        )}
                    </div>

                    {/* Mobile: search + hamburger */}
                    <div className="ml-auto flex items-center gap-1 md:hidden">
                        
                        <button
                            onClick={() => setExpanded(true)}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-400 shadow-sm transition-all hover:border-slate-300 hover:shadow sm:w-44 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600"
                        >
                            <Search className="size-3.5 shrink-0" />
                            <span className="hidden flex-1 text-left sm:inline">Search…</span>
                            <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9px] text-slate-400 sm:inline">/</kbd>
                        </button>
                        <MobileNav
                            sidebarTree={sidebarTree ?? null}
                            universe={universe ?? null}
                            user={user ?? null}
                            currentUrl={url}
                            appName={page.props.name}
                            appLogo={page.props.branding?.logo_url}
                        />
                    </div>
                </div>
            </header>

            {/* Full-width Mega Menu */}
            {hasNav && megaMenuOpen && (
                <div
                    className="fixed left-0 right-0 top-14 z-30 hidden md:block"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div
                        className="bg-white border-b border-slate-200 shadow-lg dark:bg-slate-900 dark:border-slate-800"
                        style={{ animation: 'megaMenuFadeIn 0.15s ease-out' }}
                    >
                        <div className="max-w-7xl mx-auto px-6 py-6">
                            <div className="grid grid-cols-4 gap-8">
                                {/* Types Column */}
                                {(sidebarTree!.entity_types ?? []).filter((t: any) => t.entities_count > 0).length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <BookOpen className="size-3.5" />
                                            Types
                                        </h3>
                                        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                                            {sidebarTree!.entity_types
                                                .filter((t: any) => t.entities_count > 0)
                                                .map((type: any) => (
                                                    <Link
                                                        key={type.id}
                                                        href={`/w/${universe!.slug}/type/${type.slug}`}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                    >
                                                        <TypeIcon entityType={type} size="sm" />
                                                        <span className="flex-1 truncate">{type.name}</span>
                                                        <span className="text-[0.6875rem] text-slate-400 tabular-nums bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                            {type.entities_count}
                                                        </span>
                                                    </Link>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Timelines Column */}
                                {(sidebarTree!.timelines ?? []).length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Clock className="size-3.5" />
                                            Timelines
                                        </h3>
                                        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                                            {sidebarTree!.timelines.map((t: any) => (
                                                <Link
                                                    key={t.id}
                                                    href={`/w/${universe!.slug}/timeline/${t.slug}`}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                >
                                                    <Clock className="size-3.5 text-slate-400" />
                                                    <span className="truncate">{t.name}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Media Column */}
                                {(sidebarTree!.media_sources ?? []).length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Film className="size-3.5" />
                                            Media
                                        </h3>
                                        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                                            {sidebarTree!.media_sources.map((m: any) => (
                                                <Link
                                                    key={m.id}
                                                    href={`/w/${universe!.slug}/media/${m.slug}`}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                >
                                                    <Film className="size-3.5 text-slate-400" />
                                                    <span className="truncate">{m.name}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Categories Column */}
                                {(sidebarTree!.categories ?? []).length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Folder className="size-3.5" />
                                            Categories
                                        </h3>
                                        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                                            {sidebarTree!.categories.map((cat: any) => (
                                                <div key={cat.id}>
                                                    <Link
                                                        href={`/w/${universe!.slug}/category/${cat.slug}`}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                    >
                                                        <Folder className="size-3.5 text-slate-400" />
                                                        <span className="truncate">{cat.name}</span>
                                                    </Link>
                                                    {cat.children?.map((child: any) => (
                                                        <Link
                                                            key={child.id}
                                                            href={`/w/${universe!.slug}/category/${child.slug}`}
                                                            className="flex items-center gap-2.5 px-3 py-2 pl-8 text-sm text-slate-500 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                        >
                                                            <span className="truncate">{child.name}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Maps Column */}
                                {(sidebarTree!.maps ?? []).length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Map className="size-3.5" />
                                            Maps
                                        </h3>
                                        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                                            {sidebarTree!.maps.slice(0, 8).map((m: any) => (
                                                <Link
                                                    key={m.id}
                                                    href={`/w/${universe!.slug}/${m.entity_slug}/maps/${m.slug}`}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 hover:text-blue-600"
                                                >
                                                    <Map className="size-3.5 shrink-0 text-slate-400" />
                                                    <span className="flex-1 truncate min-w-0">
                                                        <span className="text-slate-400 text-xs">{m.entity_name} · </span>{m.name}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Universe Link at bottom */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center items-center gap-20">
                                <div className="">
                                    <Link
                                        href={`/w/${universe!.slug}`}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:no-underline transition-colors"
                                    >
                                        <Globe className="size-4" />
                                        View {universe!.name} Overview
                                    </Link>
                                </div>
                                {/* open universe in archives button */}
                                <div className="">
                                    <Link
                                        href={`/archives/${universe!.slug}`}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:no-underline transition-colors"
                                    >
                                        <Globe className="size-4" />
                                        Open {universe!.name} in Archives
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/10 dark:bg-black/30 -z-10"
                        onClick={() => setMegaMenuOpen(false)}
                    />
                </div>
            )}
            <SearchWidget isOpen={expanded} onClose={() => setExpanded(false)} onOpen={() => setExpanded(true)} />

            {/* Keyframes for animation */}
            <style>{`
                @keyframes megaMenuFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}

//  Nav Link 

function NavLink({
    href,
    active,
    icon: Icon,
    children,
}: {
    href: string;
    active: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] font-medium rounded-lg no-underline cursor-pointer transition-colors whitespace-nowrap leading-none hover:no-underline ${
                active
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
            {Icon && <Icon className="size-3.5" />}
            {children}
        </Link>
    );
}

//  Mobile Nav Sheet 

function MobileNav({
    sidebarTree,
    universe,
    user,
    currentUrl,
    appName,
    appLogo
}: {
    sidebarTree: ApiSidebarTree | null;
    universe: { id: number; name: string; slug: string } | null;
    user: User | null;
    currentUrl: string;
    appName: string;
    appLogo?: string | null;
}) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900">
                    <Menu className="size-4" />
                    <span className="sr-only">Open menu</span>
                </button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-72 gap-0 p-0 overflow-y-auto bg-white border-r border-slate-200"
            >
                {/* Sheet header */}
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
                    <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:no-underline">
                        {/* <AppLogoIcon className="size-7 text-blue-600" /> */}
                        {appLogo ? 
                            <img src={appLogo} alt={appName+" Logo"} className="size-7" />
                        : 
                            <AppLogoIcon className="size-7 text-blue-400" />    
                        }
                        {appName} Wiki
                    </Link>
                </div>

                <div className="flex flex-col gap-0.5 px-3 py-3">
                    {/* Universe link */}
                    {universe && (
                        <Link
                            href={`/w/${universe.slug}`}
                            className="mb-2 flex items-center gap-2.5 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:no-underline"
                        >
                            <Globe className="size-4" />
                            {universe.name}
                        </Link>
                    )}

                    {/* Entity Types */}
                    {(sidebarTree?.entity_types ?? []).filter((t: any) => t.entities_count > 0).length > 0 && (
                        <MobileSection title="Entity Types" defaultOpen>
                            {sidebarTree!.entity_types
                                .filter((t: any) => t.entities_count > 0)
                                .map((type: any) => (
                                    <Link
                                        key={type.id}
                                        href={`/w/${universe?.slug}/type/${type.slug}`}
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-900 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left"
                                    >
                                        <TypeIcon entityType={type} size="sm" />
                                        <span className="flex-1 truncate">{type.name}</span>
                                        <span className="text-[10px] text-slate-400">{type.entities_count}</span>
                                    </Link>
                                ))}
                        </MobileSection>
                    )}

                    {/* Timelines */}
                    {(sidebarTree?.timelines ?? []).length > 0 && (
                        <MobileSection title="Timelines">
                            {sidebarTree!.timelines.map((t: any) => (
                                <Link key={t.id} href={`/w/${universe?.slug}/timeline/${t.slug}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-900 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left">
                                    <Clock className="size-3.5 text-slate-400" />
                                    <span className="truncate">{t.name}</span>
                                </Link>
                            ))}
                        </MobileSection>
                    )}

                    {/* Media Sources */}
                    {(sidebarTree?.media_sources ?? []).length > 0 && (
                        <MobileSection title="Media Sources">
                            {sidebarTree!.media_sources.map((m: any) => (
                                <Link key={m.id} href={`/w/${universe?.slug}/media/${m.slug}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-900 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left">
                                    <Film className="size-3.5 text-slate-400" />
                                    <span className="truncate">{m.name}</span>
                                </Link>
                            ))}
                        </MobileSection>
                    )}

                    {/* Categories */}
                    {(sidebarTree?.categories ?? []).length > 0 && (
                        <MobileSection title="Categories">
                            {sidebarTree!.categories.map((cat: any) => (
                                <div key={cat.id}>
                                    <Link href={`/w/${universe?.slug}/category/${cat.slug}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-900 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left">
                                        <Folder className="size-3.5 text-slate-400" />
                                        <span className="truncate">{cat.name}</span>
                                    </Link>
                                    {cat.children?.map((child: any) => (
                                        <Link
                                            key={child.id}
                                            href={`/w/${universe?.slug}/category/${child.slug}`}
                                            className="flex items-center gap-2.5 px-3 py-2 pl-8 text-sm text-slate-500 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left"
                                        >
                                            <span className="truncate">{child.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            ))}
                        </MobileSection>
                    )}

                    {/* Maps */}
                    {(sidebarTree?.maps ?? []).length > 0 && (
                        <MobileSection title="Maps">
                            {sidebarTree!.maps.map((m: any) => (
                                <Link key={m.id} href={`/w/${universe?.slug}/${m.entity_slug}/maps/${m.slug}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-900 no-underline rounded-lg transition-colors hover:bg-slate-50 w-full text-left">
                                    <Map className="size-3.5 shrink-0 text-slate-400" />
                                    <span className="flex-1 truncate min-w-0">
                                        <span className="text-slate-400 text-xs">{m.entity_name} · </span>{m.name}
                                    </span>
                                </Link>
                            ))}
                        </MobileSection>
                    )}

                    {/* Quick links */}
                    <div className="mt-4 pt-3 border-t border-slate-200">
                        <Link href="/w" className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50">
                            <Home className="size-3.5 text-slate-400" />
                            All Wikis
                        </Link>
                        <Link href="/w/search" className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50">
                            <Search className="size-3.5 text-slate-400" />
                            Search
                        </Link>
                        <Link href="/archives" className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50">
                            <BookOpen className="size-3.5 text-slate-400" />
                            Archives
                        </Link>
                    </div>

                    {/* Auth links */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        {user ? (
                            <div className="flex items-center gap-3 px-3 py-2">
                                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                                    {user.name?.charAt(0) ?? 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                                </div>
                            </div>
                        ) : (
                            <Link href="/login" className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-blue-600 no-underline rounded-lg transition-colors hover:bg-blue-50">
                                <LogIn className="size-3.5" />
                                Log in
                            </Link>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

//  Mobile Section 

function MobileSection({
    title,
    defaultOpen = false,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer"
            >
                {title}
                <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="flex flex-col gap-0.5">{children}</div>}
        </div>
    );
}

//  Search Widget 

function SearchWidget({isOpen, onOpen, onClose}: {isOpen: boolean; onOpen: () => void; onClose: () => void}) {
    // const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ApiSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setResults([]);
            setSearching(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const t = setTimeout(() => {
            api.globalSearch(query)
                .then((r) => setResults(r.data.slice(0, 8)))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (
                (e.key === 'k' && (e.metaKey || e.ctrlKey))
            ) {
                e.preventDefault();
                onOpen();
            }
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (query.trim()) {
            router.get('/w/search', { q: query.trim() });
            onClose();
        }
    }

    return (
        <>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[calc(20vh)] px-4"
                    onClick={() => onClose()}
                >
                    <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px]" />
                    <form
                        onSubmit={handleSubmit}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        style={{ animation: 'wiki-fade-in 0.12s ease-out' }}
                    >
                        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5">
                            <Search className="size-4 shrink-0 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search the wiki…"
                                className="flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                            <button
                                type="button"
                                onClick={() => onClose()}
                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>

                        {(searching || results.length > 0) && (
                            <div className="max-h-72 overflow-y-auto">
                                {searching && results.length === 0 && (
                                    <div className="flex flex-col gap-0.5 p-2">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="flex items-center gap-3 rounded px-2 py-2">
                                                <div className="size-3 shrink-0 animate-pulse rounded-full bg-slate-100" />
                                                <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {results.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center gap-3 border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50"
                                    >
                                        <Link
                                            href={r.universe ? `/w/${r.universe.slug}/${r.slug}` : '#'}
                                            className="flex items-center gap-3 rounded px-4 py-3 w-full text-sm text-slate-900 no-underline transition-colors hover:bg-slate-50"
                                            onClick={() => onClose()}
                                        >
                                        {r.images?.[0] ? (
                                            <img
                                                src={r.images[0].thumbnail_url ?? r.images[0].url}
                                                alt=""
                                                className="size-8 shrink-0 rounded-md object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                                                <TypeIcon entityType={r.entity_type} />
                                                {/* <span className="text-[10px] font-semibold text-blue-600">
                                                    {r.name.charAt(0)}
                                                </span> */}
                                            </div>
                                        )}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-xs font-medium text-slate-900">{r.name}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {r.entity_type?.name && <span className="mr-1">{r.entity_type.name}</span>}
                                                    {r.universe && <span className="opacity-70">in {r.universe.name}</span>}
                                                </div>
                                            </div>
                                        </Link>
                                        {r.universe && (
                                            <div className="flex shrink-0 gap-1">
                                                <Link
                                                    href={`/w/${r.universe.slug}/${r.slug}`}
                                                    className="rounded-sm bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white hover:no-underline"
                                                    onClick={() => onClose()}
                                                >
                                                    Wiki
                                                </Link>
                                                <Link
                                                    href={`/archives/${encodeURIComponent(r.universe.slug)}?open=entity-dossier&universe=${encodeURIComponent(r.universe.slug)}&entity=${encodeURIComponent(r.slug)}`}
                                                    className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:no-underline"
                                                    onClick={() => onClose()}
                                                >
                                                    Archives
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400">
                            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9px]">Enter</kbd>
                            {' '}to search &nbsp;·&nbsp;
                            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9px]">Esc</kbd>
                            {' '}to close
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}


//  Dark Mode Toggle 

function DarkModeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <button
            onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
}

//  User Menu 

function UserMenu({ user }: { user: User }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
                <div className="size-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    {user.name?.charAt(0) ?? 'U'}
                </div>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-sm font-medium text-slate-900 truncate dark:text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate dark:text-slate-400">{user.email}</div>
                    </div>
                    <div className="p-1">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 no-underline rounded-lg transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Settings
                        </Link>
                        <button
                            onClick={() => router.post('/logout')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg transition-colors hover:bg-red-50 bg-transparent border-none cursor-pointer dark:text-red-400 dark:hover:bg-red-950"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}