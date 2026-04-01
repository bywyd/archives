import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Edit3, Loader2, Trash2 } from 'lucide-react';
import { SectionHtmlContent } from '@/components/shared/section-html-content';
import type { ApiEntitySection, ApiImage } from '@/types/api';

type Props = {
    sections: ApiEntitySection[];
    universeSlug?: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (id: number) => void;
    editingId?: number | null;
    renderEditForm?: (section: ApiEntitySection) => React.ReactNode;
};

function SectionDeleteBtn({ onDelete }: { onDelete: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <button
            onClick={async () => { setBusy(true); try { await onDelete(); } catch {} finally { setBusy(false); } }}
            disabled={busy}
            className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete section"
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
    );
}

export function WikiSections({ sections, universeSlug, onDelete, onEdit, editingId, renderEditForm }: Props) {
    const topLevel = sections
        .filter((s) => !s.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order);

    if (topLevel.length === 0) return null;

    return (
        <div>
            {topLevel.map((section) => (
                <SectionBlock key={section.id} section={section} depth={0} universeSlug={universeSlug} onDelete={onDelete} onEdit={onEdit} editingId={editingId} renderEditForm={renderEditForm} />
            ))}
        </div>
    );
}

function SectionBlock({ section, depth, universeSlug, onDelete, onEdit, editingId, renderEditForm }: { section: ApiEntitySection; depth: number; universeSlug?: string; onDelete?: (id: number) => Promise<void>; onEdit?: (id: number) => void; editingId?: number | null; renderEditForm?: (section: ApiEntitySection) => React.ReactNode }) {
    const HeadingTag = depth === 0 ? 'h2' : 'h3';

    return (
        <div className="mb-8 scroll-mt-20" id={`section-${section.slug}`}>
            <div className="flex items-center gap-2">
                <HeadingTag className={`flex-1 flex items-center gap-2 ${depth === 0 ? 'text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4' : 'text-base font-semibold text-slate-900 mb-2.5'}`}>
                    <a href={`#section-${section.slug}`} className="hover:text-blue-600 transition-colors">
                        {section.title}
                    </a>
                </HeadingTag>
                {onEdit && editingId !== section.id && (
                    <button
                        onClick={() => onEdit(section.id)}
                        className="shrink-0 rounded p-0.5 text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Edit section"
                    >
                        <Edit3 className="size-3" />
                    </button>
                )}
                {onDelete && editingId !== section.id && <SectionDeleteBtn onDelete={() => onDelete(section.id)} />}
            </div>

            {editingId === section.id && renderEditForm ? (
                <div className="mt-2">{renderEditForm(section)}</div>
            ) : section.section_type === 'quote' && section.content ? (
                <blockquote className="relative border-l-4 border-blue-200 bg-blue-50/50 pl-8 py-4 my-4 italic text-sm text-slate-700 rounded-r-md">
                    <span className="absolute left-2 top-1 text-4xl text-blue-200 font-serif leading-none select-none" aria-hidden="true">&#8220;</span>
                    {section.content}
                </blockquote>
            ) : section.section_type === 'gallery' && section.images?.length ? (
                <GalleryGrid images={section.images} title={section.title} />
            ) : section.content ? (
                <SectionHtmlContent
                    html={section.content}
                    mode="wiki"
                    universeSlug={universeSlug}
                />
            ) : null}

            {section.children
                ?.sort((a, b) => a.sort_order - b.sort_order)
                .map((child) => (
                    <SectionBlock key={child.id} section={child} depth={depth + 1} universeSlug={universeSlug} onDelete={onDelete} onEdit={onEdit} editingId={editingId} renderEditForm={renderEditForm} />
                ))}
        </div>
    );
}

function GalleryGrid({ images, title }: { images: ApiImage[]; title: string }) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                    <figure
                        key={img.id}
                        className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white"
                        onClick={() => setLightboxIndex(i)}
                    >
                        <div className="overflow-hidden">
                            <img
                                src={img.url}
                                alt={img.alt_text ?? title}
                                loading="lazy"
                                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                        {img.caption && (
                            <figcaption className="border-t border-slate-200 px-2 py-1.5 text-[11px] leading-snug text-slate-500">
                                {img.caption}
                            </figcaption>
                        )}
                    </figure>
                ))}
            </div>

            {lightboxIndex !== null && (
                <Lightbox
                    images={images}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </>
    );
}

function Lightbox({ images, currentIndex, onClose, onNavigate }: { images: ApiImage[]; currentIndex: number; onClose: () => void; onNavigate: (index: number) => void; }) {
    const img = images[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < images.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1); if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1); }} role="dialog" aria-label="Image lightbox" tabIndex={-1} ref={(el) => el?.focus()}>
            <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white" aria-label="Close lightbox"><X className="size-5" /></button>
            {hasPrev && (<button onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white" aria-label="Previous image"><ChevronLeft className="size-5" /></button>)}
            {hasNext && (<button onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white" aria-label="Next image"><ChevronRight className="size-5" /></button>)}
            <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <img src={img.url} alt={img.alt_text ?? ''} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
                {img.caption && (<p className="mt-3 text-center text-sm text-white/70">{img.caption}</p>)}
                {images.length > 1 && (<p className="mt-1 text-center text-xs text-white/40">{currentIndex + 1} / {images.length}</p>)}
            </div>
        </div>
    );
}
