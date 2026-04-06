/**
 * SectionHtmlContent - Context-aware section HTML renderer.
 *
 * - mode='arc'  : entity-ref links open the entity-dossier panel window on click
 * - mode='wiki' : entity-ref links show a hover preview card with fetched data
 *
 * Plain HTML (including existing `<a href>` links) is rendered as-is and
 * only `<a data-entity-slug>` elements get the enhanced behaviour.
 */
import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '@/stores/window-store';
import { cn } from '@/lib/utils';
import { fetchEntityPreview, FloatingPreviewCard } from '@/components/shared/entity-preview-card';
import type { ApiEntityPreview } from '@/types/api';

// 
// Props
// 

type Props = {
    html: string;
    universeId?: number;
    universeSlug?: string;
    mode: 'wiki' | 'arc';
    className?: string;
};

// 
// Main Component
// 

type HoverState = {
    anchorRect: DOMRect;
    slug: string;
    href: string;
    preview: ApiEntityPreview | null;
};

export function SectionHtmlContent({ html, universeId, universeSlug, mode, className }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { openWindow } = useWindowStore();
    const [hover, setHover] = useState<HoverState | null>(null);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const fetchedSlugs = useRef<Set<string>>(new Set());

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[data-entity-slug]'));
        const cleanups: (() => void)[] = [];

        if (mode === 'arc') {
            for (const link of links) {
                const slug = link.dataset.entitySlug ?? '';
                const name = link.dataset.entityName ?? slug;
                const handler = (e: MouseEvent) => {
                    e.preventDefault();
                    if (!universeId || !slug) return;
                    openWindow({
                        type: 'entity-dossier',
                        title: `${name} - DOSSIER`,
                        icon: 'EN',
                        props: { universeId, entitySlug: slug },
                    });
                };
                link.style.cursor = 'pointer';
                link.addEventListener('click', handler);
                cleanups.push(() => link.removeEventListener('click', handler));
            }
        } else {
            // Wiki: hover → floating preview card (with live fetch)
            for (const link of links) {
                const slug = link.dataset.entitySlug ?? '';
                const href = link.getAttribute('href') ?? `/w/${universeSlug ?? ''}/${slug}`;

                const handleEnter = () => {
                    clearTimeout(leaveTimer.current);
                    const rect = link.getBoundingClientRect();
                    setHover((prev) => ({
                        anchorRect: rect,
                        slug,
                        href,
                        preview: prev?.slug === slug ? prev.preview : null,
                    }));
                    if (universeSlug && slug && !fetchedSlugs.current.has(slug)) {
                        fetchedSlugs.current.add(slug);
                        fetchEntityPreview(universeSlug, slug)
                            .then((preview) => {
                                setHover((cur) => cur?.slug === slug ? { ...cur, preview } : cur);
                            })
                            .catch(() => { fetchedSlugs.current.delete(slug); });
                    }
                };

                const handleLeave = () => {
                    leaveTimer.current = setTimeout(() => setHover(null), 180);
                };

                link.addEventListener('mouseenter', handleEnter);
                link.addEventListener('mouseleave', handleLeave);
                cleanups.push(() => {
                    link.removeEventListener('mouseenter', handleEnter);
                    link.removeEventListener('mouseleave', handleLeave);
                });
            }
        }

        return () => {
            cleanups.forEach((fn) => fn());
            clearTimeout(leaveTimer.current);
        };
    }, [html, mode, universeId, universeSlug, openWindow]);

    return (
        <>
            <div
                ref={containerRef}
                className={cn(
                    mode === 'arc'
                        ? 'prose prose-sm max-w-none text-[var(--arc-text-muted)] [&_a]:text-[var(--arc-accent)] [&_a]:underline [&_blockquote]:border-[var(--arc-accent)]/30 [&_blockquote]:bg-[var(--arc-accent-light)] [&_blockquote]:text-[var(--arc-text-muted)] [&_code]:bg-[var(--arc-surface-alt)] [&_code]:text-[var(--arc-text)] dark:[&_a]:text-[var(--arc-accent-dark)] dark:[&_blockquote]:border-[var(--arc-accent-dark)]/30 dark:[&_blockquote]:bg-[var(--arc-accent-dark-light)] dark:[&_blockquote]:text-[var(--arc-text-muted-dark)] dark:[&_code]:bg-[var(--arc-surface-alt-dark)] dark:[&_code]:text-[var(--arc-text-dark)]'
                        : 'text-sm leading-relaxed text-slate-800 [&_p]:mb-3.5 [&_p:last-child]:mb-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-slate-700 [&_h4]:mt-2 [&_h4]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:bg-blue-50/50 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_hr]:border-slate-200 [&_hr]:my-4 dark:[&_p]:text-slate-300 dark:[&_h2]:text-slate-200 dark:[&_h3]:text-slate-200 dark:[&_h4]:text-slate-400 dark:[&_blockquote]:border-blue-900/40 dark:[&_blockquote]:bg-blue-900/20 dark:[&_blockquote]:text-slate-400 dark:[&_code]:bg-slate-800 dark:[&_code]:text-slate-300 dark:[&_hr]:border-slate-700',
                    className,
                )}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {mode === 'wiki' && hover?.preview && (
                <FloatingPreviewCard
                    preview={hover.preview}
                    anchorRect={hover.anchorRect}
                    href={hover.href}
                    onMouseEnter={() => clearTimeout(leaveTimer.current)}
                    onMouseLeave={() => { leaveTimer.current = setTimeout(() => setHover(null), 180); }}
                />
            )}
        </>
    );
}

