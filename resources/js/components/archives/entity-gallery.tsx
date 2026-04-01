import { ChevronLeft, ChevronRight, ExternalLink, Images, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ApiImage } from '@/types/api';
import { useWindowStore } from '@/stores/window-store';

type Props = {
    images: ApiImage[];
    /** When provided, clicking images opens an ImageViewerWindow instead of the inline lightbox */
    galleryKey?: string;
    galleryTitle?: string;
};

export function EntityGallery({ images, galleryKey, galleryTitle }: Props) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const { openWindow } = useWindowStore();

    const openInWindow = useCallback((initialIndex: number) => {
        openWindow({
            type: 'image-viewer',
            title: galleryTitle ?? 'VISUAL RECORD',
            icon: 'IMG',
            props: {
                key: `image-viewer-${galleryKey}`,
                images,
                initialIndex,
            },
            size: { width: 720, height: 560 },
        });
    }, [openWindow, galleryTitle, galleryKey, images]);

    const openLightbox = (index: number) => {
        if (galleryKey) {
            openInWindow(index);
        } else {
            setLightboxIndex(index);
        }
    };
    const closeLightbox = () => setLightboxIndex(null);

    const prev = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }, [images.length]);

    const next = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
    }, [images.length]);

    useEffect(() => {
        if (lightboxIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex, prev, next]);

    const current = lightboxIndex !== null ? images[lightboxIndex] : null;

    return (
        <>
            <div className="overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
                {/* Header */}
                <div className="flex items-center gap-2 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                    <Images className="size-3 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        VISUAL RECORD
                    </span>
                    <span className="arc-mono ml-auto text-[9px] text-[var(--arc-text-muted)]">
                        {images.length} IMAGE{images.length !== 1 ? 'S' : ''}
                    </span>
                    {galleryKey && (
                        <button
                            type="button"
                            onClick={() => openInWindow(0)}
                            className="flex size-5 items-center justify-center border border-[var(--arc-border)] text-[var(--arc-text-muted)] transition-all hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-accent)]/5 hover:text-[var(--arc-accent)]"
                            title="Open in image viewer window"
                        >
                            <ExternalLink className="size-2.5" />
                        </button>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-0.5 bg-[var(--arc-border)] p-0.5">
                    {images.map((img, idx) => (
                        <button
                            key={img.id}
                            type="button"
                            onClick={() => openLightbox(idx)}
                            className="group relative aspect-square overflow-hidden bg-[var(--arc-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arc-accent)] focus-visible:ring-inset"
                            title={img.alt_text ?? img.caption ?? undefined}
                        >
                            <img
                                src={img.thumbnail_url ?? img.url}
                                alt={img.alt_text ?? ''}
                                className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                                <ZoomIn className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Lightbox */}
            {current !== null && lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={closeLightbox}
                >
                    {/* Close */}
                    <button
                        type="button"
                        onClick={closeLightbox}
                        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                        <X className="size-4" />
                    </button>

                    {/* Counter */}
                    <span className="arc-mono absolute left-4 top-4 text-[10px] tracking-widest text-white/60">
                        {lightboxIndex + 1} / {images.length}
                    </span>

                    {/* Prev */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                    )}

                    {/* Image */}
                    <div
                        className="mx-20 flex max-h-[85vh] max-w-[85vw] flex-col items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            key={current.id}
                            src={current.url}
                            alt={current.alt_text ?? ''}
                            className="max-h-[78vh] max-w-full rounded object-contain shadow-2xl"
                        />
                        {(current.caption || current.credit) && (
                            <div className="text-center">
                                {current.caption && (
                                    <p className="text-sm text-white/80">{current.caption}</p>
                                )}
                                {current.credit && (
                                    <p className="arc-mono text-[10px] text-white/40">© {current.credit}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Next */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
                        >
                            <ChevronRight className="size-5" />
                        </button>
                    )}

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                                <button
                                    key={img.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                                    className={cn(
                                        'size-10 shrink-0 overflow-hidden rounded border-2 transition-all',
                                        idx === lightboxIndex
                                            ? 'border-[var(--arc-accent)] opacity-100'
                                            : 'border-white/20 opacity-50 hover:opacity-80',
                                    )}
                                >
                                    <img src={img.thumbnail_url ?? img.url} alt="" className="size-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
