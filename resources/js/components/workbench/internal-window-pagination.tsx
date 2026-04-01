import { cn } from '@/lib/utils';
import React from 'react';

type PaginationMeta = {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    meta: PaginationMeta;
    page: number;
    setPage: (page: number | ((p: number) => number)) => void;
};

const getPages = (current: number, total: number) => {
    const delta = 2;
    const range: (number | string)[] = [];

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);

    if (left > 2) {
        range.push('...');
    }

    for (let i = left; i <= right; i++) {
        range.push(i);
    }

    if (right < total - 1) {
        range.push('...');
    }

    if (total > 1) {
        range.push(total);
    }

    return range;
};

export const InternalWindowPagination: React.FC<Props> = ({ meta, page, setPage }) => {
    if (!meta || meta.last_page <= 1) return null;

    const pages = getPages(page, meta.last_page);

    return (
        <div className="flex items-center justify-between border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
            {/* PREV */}
            <button
                className={cn(
                    'arc-mono rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    page > 1
                        ? 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-accent)]/10 hover:text-[var(--arc-accent)]'
                        : 'opacity-30'
                )}
                disabled={page <= 1}
                onClick={() => setPage((p) => (typeof p === 'number' ? p - 1 : page - 1))}
            >
                « PREV
            </button>

            {/* PAGES */}
            <div className="flex items-center gap-1">
                {pages.map((p, i) =>
                    typeof p === 'string' ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="arc-mono text-[9px] text-[var(--arc-text-muted)]"
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            className={cn(
                                'arc-mono flex size-5 items-center justify-center rounded text-[9px] transition-colors',
                                page === p
                                    ? 'bg-[var(--arc-accent)] font-bold text-white'
                                    : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]'
                            )}
                            onClick={() => setPage(p)}
                        >
                            {p}
                        </button>
                    )
                )}
            </div>

            {/* NEXT */}
            <button
                className={cn(
                    'arc-mono rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    page < meta.last_page
                        ? 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-accent)]/10 hover:text-[var(--arc-accent)]'
                        : 'opacity-30'
                )}
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => (typeof p === 'number' ? p + 1 : page + 1))}
            >
                NEXT »
            </button>
        </div>
    );
};