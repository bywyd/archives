/**
 * EntityPreviewCard - Shared hover-preview system for wiki entity links.
 *
 * Exports:
 *   - fetchEntityPreview()  - module-level cached fetch (one request per entity per session)
 *   - FloatingPreviewCard   - portal card rendered near the hovered anchor
 *   - EntityHoverLink       - drop-in replacement for <Link> with hover preview
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiEntityPreview } from '@/types/api';

// 
// Module-level Promise cache
// One fetch per (universeSlug + entitySlug) pair for the lifetime of the page.
// 

const previewCache = new Map<string, Promise<ApiEntityPreview>>();

export function fetchEntityPreview(universeSlug: string, entitySlug: string): Promise<ApiEntityPreview> {
    const key = `${universeSlug}/${entitySlug}`;
    if (!previewCache.has(key)) {
        previewCache.set(
            key,
            api.fetchEntityPreview(universeSlug, entitySlug).then((r) => r.data),
        );
    }
    return previewCache.get(key)!;
}

// 
// FloatingPreviewCard - portal card
// 

type CardProps = {
    preview: ApiEntityPreview;
    anchorRect: DOMRect;
    href: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
};

export function FloatingPreviewCard({ preview, anchorRect, href, onMouseEnter, onMouseLeave }: CardProps) {
    // Prefer below the anchor; if too close to bottom push above
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const preferAbove = spaceBelow < 220;
    const top = preferAbove ? anchorRect.top - 8 : anchorRect.bottom + 6;
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 288));

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top,
                left,
                maxWidth: 280,
                zIndex: 9999,
                transform: preferAbove ? 'translateY(-100%)' : undefined,
            }}
            className="animate-in fade-in-0 zoom-in-95 duration-150 rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Header: image + name + type */}
            <div className="flex items-start gap-3 p-3 pb-2">
                {preview.profile_image ? (
                    <img
                        src={preview.profile_image}
                        alt={preview.name}
                        className="size-12 shrink-0 rounded-md border border-slate-100 object-cover"
                    />
                ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-xl font-bold text-slate-300 select-none">
                        {preview.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug text-slate-900 truncate">{preview.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {preview.entity_type && (
                            <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                                {preview.entity_type.name}
                            </span>
                        )}
                        {preview.entity_status && (
                            <span
                                className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                style={
                                    preview.entity_status.color
                                        ? {
                                              borderColor: preview.entity_status.color + '55',
                                              backgroundColor: preview.entity_status.color + '12',
                                              color: preview.entity_status.color,
                                          }
                                        : undefined
                                }
                            >
                                {preview.entity_status.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            {preview.short_description && (
                <p className="line-clamp-3 px-3 pb-2 text-xs leading-relaxed text-slate-500">
                    {preview.short_description}
                </p>
            )}

            {/* Footer link */}
            <div className="border-t border-slate-100 px-3 py-2">
                <a
                    href={href}
                    className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    Open full page
                    <svg className="size-3" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 3.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V4.707L4.354 12.354a.5.5 0 0 1-.708-.708L11.293 4H6.5a.5.5 0 0 1-.5-.5z" />
                    </svg>
                </a>
            </div>
        </div>,
        document.body,
    );
}

// 
// EntityHoverLink - wraps any entity link
// 

type HoverLinkProps = {
    slug: string;
    universeSlug: string;
    href: string;
    children?: React.ReactNode;
    className?: string;
};

export function EntityHoverLink({ slug, universeSlug, href, children, className }: HoverLinkProps) {
    const [preview, setPreview] = useState<ApiEntityPreview | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const fetchedRef = useRef(false);

    const cancelLeave = () => clearTimeout(leaveTimer.current);

    const handleMouseEnter = () => {
        cancelLeave();
        setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);
        if (!fetchedRef.current) {
            fetchedRef.current = true;
            fetchEntityPreview(universeSlug, slug)
                .then(setPreview)
                .catch(() => { fetchedRef.current = false; });
        }
    };

    const handleMouseLeave = () => {
        leaveTimer.current = setTimeout(() => setAnchorRect(null), 180);
    };

    useEffect(() => () => clearTimeout(leaveTimer.current), []);

    return (
        <>
            <a
                ref={anchorRef}
                href={href}
                className={cn('text-blue-600 no-underline transition-colors hover:text-blue-700 hover:underline', className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </a>
            {anchorRect && preview && (
                <FloatingPreviewCard
                    preview={preview}
                    anchorRect={anchorRect}
                    href={href}
                    onMouseEnter={cancelLeave}
                    onMouseLeave={handleMouseLeave}
                />
            )}
        </>
    );
}
