import { AlertCircle, ArrowLeft, Check, Edit3, Loader2, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiImage } from '@/types/api';

//  Types 

type UploadItem = {
    id: string;
    name: string;
    size: number;
    status: 'uploading' | 'done' | 'error';
    error?: string;
    preview: string;
};

type EditForm = {
    type: ApiImage['type'];
    alt_text: string;
    caption: string;
    credit: string;
    sort_order: number;
};

type Props = {
    images: ApiImage[];
    imageableType: 'entity' | 'universe' | 'timeline' | 'section' | 'map_floor' | 'media_source';
    imageableId: number;
    onImagesChange: (images: ApiImage[]) => void;
    className?: string;
};

//  Constants 

const TYPE_BADGE: Record<ApiImage['type'], { label: string; classes: string }> = {
    profile: { label: 'PROFILE', classes: 'bg-blue-600 text-white' },
    gallery: { label: 'GALLERY', classes: 'bg-emerald-600 text-white' },
    banner:  { label: 'BANNER',  classes: 'bg-violet-600 text-white' },
    icon:    { label: 'ICON',    classes: 'bg-amber-500  text-white' },
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

//  Main component 

export function ImageUploader({ images, imageableType, imageableId, onImagesChange, className }: Props) {
    const [uploadType, setUploadType] = useState<ApiImage['type']>('gallery');
    const [dragOver, setDragOver] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
    const [editingImage, setEditingImage] = useState<ApiImage | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ type: 'gallery', alt_text: '', caption: '', credit: '', sort_order: 0 });
    const [savingMeta, setSavingMeta] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isUploading = uploadQueue.some((q) => q.status === 'uploading');

    // Revoke preview object URLs on unmount or when items are removed
    useEffect(() => {
        return () => {
            uploadQueue.forEach((q) => URL.revokeObjectURL(q.preview));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (!fileArray.length) return;

        const queueItems: UploadItem[] = fileArray.map((f) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: f.name,
            size: f.size,
            status: 'uploading',
            preview: URL.createObjectURL(f),
        }));

        setUploadQueue((prev) => [...prev, ...queueItems]);

        const newImages = [...images];
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const item = queueItems[i];
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('imageable_type', imageableType);
                formData.append('imageable_id', String(imageableId));
                formData.append('type', uploadType);
                formData.append('sort_order', String(newImages.length));

                const res = await api.uploadImage(formData);
                newImages.push(res.data);
                setUploadQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'done' } : q));
            } catch (err: any) {
                setUploadQueue((prev) =>
                    prev.map((q) => q.id === item.id
                        ? { ...q, status: 'error', error: err.body?.message || err.message || 'Upload failed' }
                        : q,
                    ),
                );
            }
        }

        onImagesChange(newImages);

        // Remove successfully-done items from queue after brief delay
        setTimeout(() => {
            setUploadQueue((prev) => {
                const removing = prev.filter((q) => q.status === 'done');
                removing.forEach((q) => URL.revokeObjectURL(q.preview));
                return prev.filter((q) => q.status !== 'done');
            });
        }, 1500);
    }, [images, imageableType, imageableId, uploadType, onImagesChange]);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); };
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        processFiles(e.dataTransfer.files);
    };
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
        e.target.value = '';
    };

    const dismissError = (id: string) => {
        setUploadQueue((prev) => {
            const item = prev.find((q) => q.id === id);
            if (item) URL.revokeObjectURL(item.preview);
            return prev.filter((q) => q.id !== id);
        });
    };

    const startEdit = (img: ApiImage) => {
        setDeleteConfirmId(null);
        setEditingImage(img);
        setEditForm({
            type: img.type,
            alt_text: img.alt_text ?? '',
            caption: img.caption ?? '',
            credit: img.credit ?? '',
            sort_order: img.sort_order,
        });
    };

    const handleSaveMeta = async () => {
        if (!editingImage) return;
        setSavingMeta(true);
        try {
            const res = await api.updateImage(editingImage.id, {
                type: editForm.type,
                alt_text: editForm.alt_text || undefined,
                caption: editForm.caption || undefined,
                credit: editForm.credit || undefined,
                sort_order: editForm.sort_order,
            });
            onImagesChange(images.map((img) => img.id === editingImage.id ? res.data : img));
            setEditingImage(res.data);
        } finally {
            setSavingMeta(false);
        }
    };

    const handleDelete = useCallback(async (imageId: number) => {
        try {
            await api.deleteImage(imageId);
            onImagesChange(images.filter((img) => img.id !== imageId));
            setDeleteConfirmId(null);
            if (editingImage?.id === imageId) setEditingImage(null);
        } catch {
            setDeleteConfirmId(null);
        }
    }, [images, onImagesChange, editingImage]);

    const inProgressItems = uploadQueue.filter((q) => q.status === 'uploading');
    const errorItems      = uploadQueue.filter((q) => q.status === 'error');

    return (
        <div className={cn('space-y-4', className)}>

            {/*  Drop Zone  */}
            <div
                role="region"
                aria-label="Image upload zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'rounded border-2 border-dashed transition-colors',
                    dragOver
                        ? 'border-[var(--arc-accent)] bg-[var(--arc-accent-light)]'
                        : 'border-[var(--arc-border)] hover:border-[var(--arc-accent)]/50 hover:bg-[var(--arc-surface-hover)]',
                )}
            >
                <div className="flex flex-col items-center gap-3 px-6 py-5">
                    <UploadCloud
                        className={cn(
                            'size-9 transition-colors',
                            dragOver ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]',
                        )}
                    />
                    <div className="text-center">
                        <p className="arc-mono text-[11px] font-semibold tracking-widest text-[var(--arc-text-muted)]">
                            {dragOver ? ' DROP TO UPLOAD ' : 'DRAG & DROP FILES HERE'}
                        </p>
                        <p className="mt-0.5 text-[9px] text-[var(--arc-text-light)]">
                            JPG · PNG · WEBP &nbsp;·&nbsp; max 10 MB per file
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value as ApiImage['type'])}
                            className="arc-input min-w-0 w-28 text-xs"
                            disabled={isUploading}
                            title="Image type for new uploads"
                        >
                            <option value="profile">Profile</option>
                            <option value="gallery">Gallery</option>
                            <option value="banner">Banner</option>
                            <option value="icon">Icon</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn('arc-btn arc-btn-primary text-xs', isUploading && 'pointer-events-none opacity-50')}
                        >
                            {isUploading
                                ? <><Loader2 className="size-3.5 animate-spin" /> Uploading…</>
                                : <><UploadCloud className="size-3.5" /> Select Files</>
                            }
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileInput}
                        />
                    </div>
                </div>
            </div>

            {/*  Per-file upload errors  */}
            {errorItems.length > 0 && (
                <div className="space-y-1">
                    {errorItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 rounded border border-[var(--arc-danger)]/30 bg-[var(--arc-danger)]/5 px-3 py-1.5 text-xs text-[var(--arc-danger)]"
                        >
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span className="flex-1 truncate">
                                <span className="font-semibold">{item.name}</span>  {item.error}
                            </span>
                            <button onClick={() => dismissError(item.id)} className="shrink-0 opacity-60 hover:opacity-100">
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/*  Image Grid  */}
            {(images.length > 0 || inProgressItems.length > 0) && (
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                            IMAGE GALLERY ({images.length})
                        </span>
                        {images.length > 0 && (
                            <span className="text-[9px] text-[var(--arc-text-light)]">click any image to edit details</span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Uploading placeholders */}
                        {inProgressItems.map((item) => (
                            <div key={item.id} className="overflow-hidden rounded border border-[var(--arc-border)]">
                                <div className="relative aspect-square overflow-hidden bg-[var(--arc-surface-alt)]">
                                    <img
                                        src={item.preview}
                                        alt=""
                                        className="absolute inset-0 size-full object-cover opacity-30"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                                        <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                                        <span className="arc-mono text-[8px] tracking-widest text-[var(--arc-accent)]">UPLOADING</span>
                                    </div>
                                </div>
                                <div className="bg-[var(--arc-surface-alt)] px-2 py-1.5">
                                    <p className="truncate text-[9px] text-[var(--arc-text-muted)]">{item.name}</p>
                                    <p className="text-[8px] text-[var(--arc-text-light)]">{formatBytes(item.size)}</p>
                                </div>
                            </div>
                        ))}

                        {/* Actual uploaded images */}
                        {images.map((img) => (
                            <ImageCard
                                key={img.id}
                                image={img}
                                isEditing={editingImage?.id === img.id}
                                deleteConfirmId={deleteConfirmId}
                                onEdit={startEdit}
                                onDeleteRequest={(id) => setDeleteConfirmId(id)}
                                onDeleteCancel={() => setDeleteConfirmId(null)}
                                onDeleteConfirm={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/*  Image Detail / Edit Panel  */}
            {editingImage && (
                <ImageDetailPanel
                    image={editingImage}
                    form={editForm}
                    saving={savingMeta}
                    onFormChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
                    onSave={handleSaveMeta}
                    onClose={() => setEditingImage(null)}
                    onDelete={(id) => { setEditingImage(null); handleDelete(id); }}
                />
            )}
        </div>
    );
}

//  Image Card 

function ImageCard({
    image,
    isEditing,
    deleteConfirmId,
    onEdit,
    onDeleteRequest,
    onDeleteCancel,
    onDeleteConfirm,
}: {
    image: ApiImage;
    isEditing: boolean;
    deleteConfirmId: number | null;
    onEdit: (img: ApiImage) => void;
    onDeleteRequest: (id: number) => void;
    onDeleteCancel: () => void;
    onDeleteConfirm: (id: number) => void;
}) {
    const badge = TYPE_BADGE[image.type];
    const confirmingDelete = deleteConfirmId === image.id;

    return (
        <div
            className={cn(
                'group overflow-hidden rounded border transition-colors',
                isEditing
                    ? 'border-[var(--arc-accent)] ring-1 ring-[var(--arc-accent)]/40'
                    : 'border-[var(--arc-border)]',
            )}
        >
            {/* Thumbnail */}
            <button
                type="button"
                onClick={() => onEdit(image)}
                className="relative block aspect-square w-full overflow-hidden bg-[var(--arc-surface-alt)]"
                title="Edit image details"
            >
                <img
                    src={image.thumbnail_url ?? image.url}
                    alt={image.alt_text ?? ''}
                    className="size-full object-cover transition-opacity group-hover:opacity-80"
                />
                {/* Type badge */}
                <span className={cn('absolute left-1.5 top-1.5 rounded px-1 py-0.5 text-[7px] font-bold tracking-widest', badge.classes)}>
                    {badge.label}
                </span>
                {/* Edit hint on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <Edit3 className="size-4 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-90" />
                </div>
                {/* "editing" indicator */}
                {isEditing && (
                    <div className="absolute inset-0 flex items-end justify-end p-1.5">
                        <span className="rounded bg-[var(--arc-accent)] px-1 py-0.5 text-[7px] font-bold tracking-widest text-white">
                            EDITING
                        </span>
                    </div>
                )}
            </button>

            {/* Info / action bar */}
            <div className="bg-[var(--arc-surface-alt)] px-2 py-1.5">
                {!confirmingDelete ? (
                    <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                            {image.caption || image.alt_text ? (
                                <p className="truncate text-[9px] text-[var(--arc-text-muted)]">
                                    {image.caption || image.alt_text}
                                </p>
                            ) : (
                                <p className="text-[9px] italic text-[var(--arc-text-light)]">no caption</p>
                            )}
                            {image.credit && (
                                <p className="truncate text-[8px] text-[var(--arc-text-light)]">© {image.credit}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => onDeleteRequest(image.id)}
                            className="shrink-0 text-[var(--arc-text-light)] transition-colors hover:text-[var(--arc-danger)]"
                            title="Delete image"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                ) : (
                    /* Delete confirmation inline */
                    <div className="space-y-1">
                        <p className="arc-mono text-[8px] font-semibold tracking-widest text-[var(--arc-danger)]">DELETE THIS IMAGE?</p>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => onDeleteConfirm(image.id)}
                                className="flex flex-1 items-center justify-center gap-1 rounded bg-[var(--arc-danger)] px-2 py-1 text-[9px] font-semibold text-white hover:opacity-90"
                            >
                                <Trash2 className="size-3" /> Delete
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteCancel}
                                className="flex flex-1 items-center justify-center gap-1 rounded border border-[var(--arc-border)] px-2 py-1 text-[9px] font-semibold text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]"
                            >
                                <X className="size-3" /> Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

//  Image Detail Panel 

function ImageDetailPanel({
    image,
    form,
    saving,
    onFormChange,
    onSave,
    onClose,
    onDelete,
}: {
    image: ApiImage;
    form: EditForm;
    saving: boolean;
    onFormChange: (patch: Partial<EditForm>) => void;
    onSave: () => void;
    onClose: () => void;
    onDelete: (id: number) => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="rounded border border-[var(--arc-accent)]/40 bg-[var(--arc-surface-alt)]">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] px-3 py-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1 text-[10px] text-[var(--arc-text-muted)] hover:text-[var(--arc-text)] transition-colors"
                    >
                        <ArrowLeft className="size-3" />
                        <span className="arc-mono tracking-wider">BACK</span>
                    </button>
                    <span className="text-[var(--arc-border)]">·</span>
                    <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                        EDIT IMAGE #{image.id}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-[var(--arc-text-light)] hover:text-[var(--arc-text)] transition-colors"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            {/* Panel body */}
            <div className="flex gap-4 p-3">
                {/* Image preview (fixed column) */}
                <div className="w-36 shrink-0">
                    <div className="overflow-hidden rounded border border-[var(--arc-border)]">
                        <img
                            src={image.url}
                            alt={image.alt_text ?? ''}
                            className="aspect-square w-full object-cover"
                        />
                    </div>
                    <div className="mt-1.5 text-center">
                        <span className={cn('inline-block rounded px-1.5 py-0.5 text-[7px] font-bold tracking-widest', TYPE_BADGE[image.type].classes)}>
                            {TYPE_BADGE[image.type].label}
                        </span>
                    </div>
                    <a
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-[var(--arc-text-muted)] hover:text-[var(--arc-accent)] transition-colors"
                    >
                        <span>view full</span>
                    </a>
                </div>

                {/* Form fields */}
                <div className="flex-1 space-y-2.5">
                    {/* Type */}
                    <div className="space-y-1">
                        <label className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">IMAGE TYPE</label>
                        <div className="flex flex-wrap gap-1.5">
                            {(['profile', 'gallery', 'banner', 'icon'] as ApiImage['type'][]).map((t) => {
                                const b = TYPE_BADGE[t];
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => onFormChange({ type: t })}
                                        className={cn(
                                            'rounded px-2 py-0.5 text-[9px] font-bold tracking-widest transition-all',
                                            form.type === t
                                                ? b.classes
                                                : 'border border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                                        )}
                                    >
                                        {b.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alt text */}
                    <div className="space-y-1">
                        <label className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">ALT TEXT</label>
                        <input
                            type="text"
                            value={form.alt_text}
                            onChange={(e) => onFormChange({ alt_text: e.target.value })}
                            className="arc-input text-xs"
                            placeholder="Briefly describe the image for accessibility…"
                        />
                    </div>

                    {/* Caption */}
                    <div className="space-y-1">
                        <label className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">CAPTION</label>
                        <input
                            type="text"
                            value={form.caption}
                            onChange={(e) => onFormChange({ caption: e.target.value })}
                            className="arc-input text-xs"
                            placeholder="Visible caption below the image…"
                        />
                    </div>

                    {/* Credit + Sort in a row */}
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">CREDIT / SOURCE</label>
                            <input
                                type="text"
                                value={form.credit}
                                onChange={(e) => onFormChange({ credit: e.target.value })}
                                className="arc-input text-xs"
                                placeholder="Photographer, artist, or source…"
                            />
                        </div>
                        <div className="w-20 shrink-0 space-y-1">
                            <label className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">ORDER</label>
                            <input
                                type="number"
                                min={0}
                                value={form.sort_order}
                                onChange={(e) => onFormChange({ sort_order: Number(e.target.value) })}
                                className="arc-input text-xs"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="arc-btn arc-btn-primary flex-1 text-xs"
                        >
                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>

                        {!confirmDelete ? (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="arc-btn text-xs text-[var(--arc-danger)] hover:bg-[var(--arc-danger)]/10"
                            >
                                <Trash2 className="size-3.5" />
                                Delete
                            </button>
                        ) : (
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => onDelete(image.id)}
                                    className="arc-btn bg-[var(--arc-danger)] text-xs text-white hover:opacity-90"
                                >
                                    <Check className="size-3.5" /> Confirm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    className="arc-btn text-xs"
                                >
                                    <X className="size-3.5" /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
