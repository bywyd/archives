import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginatedResponse } from '@/types/api';

type Props = {
    meta: PaginatedResponse<unknown>['meta'];
    links: PaginatedResponse<unknown>['links'];
    className?: string;
};

export function WikiPagination({ meta, links, className = '' }: Props) {
    if (meta.last_page <= 1) return null;

    const pages = buildPageNumbers(meta.current_page, meta.last_page);

    return (
        <nav className={`mt-8 flex items-center justify-center gap-1 ${className}`} aria-label="Pagination">
            {/* Previous */}
            {links.prev ? (
                <Link
                    href={links.prev}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                    <ChevronLeft className="size-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                </Link>
            ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-300 dark:border-slate-800 dark:text-slate-600">
                    <ChevronLeft className="size-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                </span>
            )}

            {/* Page numbers */}
            <div className="hidden items-center gap-1 sm:flex">
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-slate-400 dark:text-slate-500">
                            …
                        </span>
                    ) : (
                        <PageLink
                            key={p}
                            page={p as number}
                            current={meta.current_page}
                            baseUrl={links.prev ?? links.next ?? ''}
                        />
                    ),
                )}
            </div>

            {/* Mobile page indicator */}
            <span className="px-3 text-xs text-slate-500 sm:hidden dark:text-slate-400">
                {meta.current_page} / {meta.last_page}
            </span>

            {/* Next */}
            {links.next ? (
                <Link
                    href={links.next}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="size-3.5" />
                </Link>
            ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-300 dark:border-slate-800 dark:text-slate-600">
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="size-3.5" />
                </span>
            )}
        </nav>
    );
}

function PageLink({ page, current, baseUrl }: { page: number; current: number; baseUrl: string }) {
    const isCurrent = page === current;
    const url = buildPageUrl(baseUrl, page);

    if (isCurrent) {
        return (
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white dark:bg-blue-500">
                {page}
            </span>
        );
    }

    return (
        <Link
            href={url}
            className="inline-flex size-8 items-center justify-center rounded-md text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
            {page}
        </Link>
    );
}

function buildPageUrl(baseUrl: string, page: number): string {
    try {
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set('page', String(page));
        return url.pathname + url.search;
    } catch {
        return `?page=${page}`;
    }
}

function buildPageNumbers(current: number, last: number): (number | '...')[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(last - 1, current + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (current < last - 2) pages.push('...');

    pages.push(last);

    return pages;
}
