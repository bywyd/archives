import { ChevronLeft, ChevronRight, Images, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ApiImage } from '@/types/api';

type Props = {
    images: ApiImage[];
    initialIndex?: number;
};

export function ImageViewerWindow({ images, initialIndex = 0 }: Props) {
    const [currentIndex, setCurrentIndex] = useState(
        Math.max(0, Math.min(initialIndex, images.length - 1)),
    );
    const [zoomed, setZoomed] = useState(false);
    const filmstripRef = useRef<HTMLDivElement>(null);

    const current = images[currentIndex] ?? images[0];

    const prev = useCallback(() => {
        setZoomed(false);
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }, [images.length]);

    const next = useCallback(() => {
        setZoomed(false);
        setCurrentIndex((i) => (i + 1) % images.length);
    }, [images.length]);

    // Keyboard navigation scoped to the window (not global, to avoid conflicts)
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                next();
            } else if (e.key === 'Escape') {
                setZoomed(false);
            }
        };

        el.addEventListener('keydown', handler);
        return () => el.removeEventListener('keydown', handler);
    }, [prev, next]);

    // Scroll filmstrip to keep active thumb visible
    useEffect(() => {
        if (!filmstripRef.current) return;
        const active = filmstripRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
        active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [currentIndex]);

    if (!images.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--arc-text-muted)]">
                <Images className="size-8 opacity-20" />
                <span className="arc-mono text-[10px] tracking-widest">NO IMAGES ON FILE</span>
            </div>
        );
    }

    const hasMultiple = images.length > 1;
    const hasCaption = !!(current?.caption || current?.credit || current?.alt_text);

    return (
        <div
            ref={containerRef}
            className="flex h-full flex-col bg-[var(--arc-bg)] outline-none"
            tabIndex={0}
        >
            {/*  Header  */}
            <div className="flex shrink-0 items-center gap-2 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <Images className="size-3.5 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    VISUAL RECORD
                </span>
                {current?.type && (
                    <span className="arc-mono rounded border border-[var(--arc-border)] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                        {current.type}
                    </span>
                )}
                <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                    {hasMultiple ? `${currentIndex + 1} / ${images.length}` : '1 IMAGE'}
                </span>
                {/* Zoom toggle */}
                <button
                    type="button"
                    onClick={() => setZoomed((z) => !z)}
                    className={cn(
                        'flex size-6 items-center justify-center border transition-all',
                        zoomed
                            ? 'border-[var(--arc-accent)]/50 bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                            : 'border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-accent)]/5 hover:text-[var(--arc-accent)]',
                    )}
                    title={zoomed ? 'Zoom out (Esc)' : 'Zoom in'}
                >
                    {zoomed ? <ZoomOut className="size-3" /> : <ZoomIn className="size-3" />}
                </button>
            </div>

            {/*  Main Image Area  */}
            <div
                className={cn(
                    'relative min-h-0 flex-1 overflow-auto',
                    'flex items-center justify-center bg-black/80',
                    zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
                )}
                onClick={() => setZoomed((z) => !z)}
            >
                {current && (
                    <img
                        key={current.id}
                        src={current.url}
                        alt={current.alt_text ?? ''}
                        className={cn(
                            'select-none transition-none',
                            zoomed
                                ? 'h-auto w-auto'
                                : 'max-h-full max-w-full object-contain',
                        )}
                        draggable={false}
                    />
                )}

                {/*  Prev Button  */}
                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-black/70 hover:text-white"
                        title="Previous (←)"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                )}

                {/*  Next Button  */}
                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-black/70 hover:text-white"
                        title="Next (→)"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                )}

                {/*  Index Badge (top-left)  */}
                {hasMultiple && (
                    <span className="arc-mono pointer-events-none absolute left-3 top-3 rounded border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] tracking-widest text-white/50 backdrop-blur-sm">
                        {currentIndex + 1} / {images.length}
                    </span>
                )}
            </div>

            {/*  Caption / Credit Bar  */}
            {hasCaption && (
                <div className="shrink-0 border-t border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    {current.caption && (
                        <p className="text-xs leading-snug text-[var(--arc-text)]">{current.caption}</p>
                    )}
                    {!current.caption && current.alt_text && (
                        <p className="text-xs leading-snug text-[var(--arc-text-muted)]">{current.alt_text}</p>
                    )}
                    {current.credit && (
                        <p className="arc-mono mt-0.5 text-[9px] text-[var(--arc-text-muted)]">
                            © {current.credit}
                        </p>
                    )}
                </div>
            )}

            {/*  Filmstrip  */}
            {hasMultiple && (
                <div
                    ref={filmstripRef}
                    className="flex shrink-0 gap-1 overflow-x-auto border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] p-2"
                >
                    {images.map((img, idx) => (
                        <button
                            key={img.id}
                            type="button"
                            data-active={idx === currentIndex}
                            onClick={() => { setZoomed(false); setCurrentIndex(idx); }}
                            className={cn(
                                'size-12 shrink-0 overflow-hidden border-2 transition-all',
                                idx === currentIndex
                                    ? 'border-[var(--arc-accent)] opacity-100'
                                    : 'border-[var(--arc-border)] opacity-40 hover:opacity-80',
                            )}
                            title={img.caption ?? img.alt_text ?? `Image ${idx + 1}`}
                        >
                            <img
                                src={img.thumbnail_url ?? img.url}
                                alt=""
                                className="size-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
