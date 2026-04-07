import React from 'react';
import { WikiFooter } from '@/components/wiki/wiki-footer';
import { WikiNavbar } from '@/components/wiki/wiki-navbar';
import { WikiReadingProgress } from '@/components/wiki/wiki-reading-progress';
import { WikiToc } from '@/components/wiki/wiki-toc';
import { useUniverseTheme } from '@/hooks/use-universe-theme';
import type { ApiImage, ApiSidebarTree } from '@/types/api';

type BreadcrumbItem = {
    title: string;
    href?: string;
};

type TocItem = {
    id: string;
    title: string;
    children?: TocItem[];
};

type Props = {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    sidebarTree?: ApiSidebarTree | null;
    universe?: {
        id: number;
        name: string;
        slug: string;
        settings?: Record<string, unknown> | null;
        images?: ApiImage[];
    } | null;
    toc?: TocItem[];
    aside?: React.ReactNode;
    wide?: boolean;
    showProgress?: boolean;
};

export default function WikiLayout({ children, breadcrumbs = [], sidebarTree, universe, toc, aside, wide = false, showProgress = false }: Props) {
    const { cssVars, iconUrl, themeColor } = useUniverseTheme(universe);

    return (
        <div
            className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-slate-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-blue-900 dark:selection:text-slate-100"
            style={cssVars}
        >
            {showProgress && <WikiReadingProgress color={themeColor ?? undefined} />}
            <WikiNavbar
                breadcrumbs={breadcrumbs}
                sidebarTree={sidebarTree}
                universe={universe ? { id: universe.id, name: universe.name, slug: universe.slug } : null}
                universeIconUrl={iconUrl}
                universeThemeColor={themeColor}
            />

            <div className="flex flex-1">
                {toc && toc.length > 0 && <WikiToc toc={toc} />}
                <main className={`mx-auto w-full flex-1 px-6 py-10 animate-fade-in-up sm:max-w-3xl md:max-w-5xl lg:max-w-7xl`}>
                    {children}
                </main>
                {aside && (
                    <div className="hidden xl:block w-64 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-6 pl-2" style={{ scrollbarWidth: 'thin' }}>
                        {aside}
                    </div>
                )}
            </div>

            <WikiFooter sidebarTree={sidebarTree} universe={universe} 
                universeIconUrl={iconUrl}
                universeThemeColor={themeColor}
            />
        </div>
    );
}
