import { Head } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Globe,
    Loader2,
    Plus,
    Trash2,
    X,
    AlertTriangle,
    ImageIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ImageUploader } from '@/components/archives/image-uploader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import AdminLayout from '@/layouts/admin/layout';
import * as api from '@/lib/api';
import type { ApiImage, ApiUniverse } from '@/types/api';
import type { BreadcrumbItem } from '@/types';
import { CompoundNamesEditor } from '@/components/compound-names-editor';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/users' },
    { title: 'Universes', href: '/admin/universes' },
];

type UniverseForm = {
    name: string;
    slug: string;
    description: string;
    theme_color: string;
    compound_names: string[];
};

const EMPTY_FORM: UniverseForm = {
    name: '',
    slug: '',
    description: '',
    theme_color: '',
    compound_names: [],
};

const PRESET_COLORS = [
    { label: 'Blue',    value: '#2563eb' },
    { label: 'Indigo',  value: '#4f46e5' },
    { label: 'Violet',  value: '#7c3aed' },
    { label: 'Fuchsia', value: '#c026d3' },
    { label: 'Rose',    value: '#e11d48' },
    { label: 'Red',     value: '#dc2626' },
    { label: 'Orange',  value: '#ea580c' },
    { label: 'Amber',   value: '#d97706' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Teal',    value: '#0d9488' },
    { label: 'Cyan',    value: '#0891b2' },
    { label: 'Slate',   value: '#475569' },
];

function slugify(str: string) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// 
// Shared inline form
// 
interface InlineFormProps {
    form: UniverseForm;
    setForm: (updater: (prev: UniverseForm) => UniverseForm) => void;
    formErrors: Partial<UniverseForm>;
    saving: boolean;
    isCreate: boolean;
    // images section (only for edit)
    editImages?: ApiImage[];
    editImagesLoading?: boolean;
    universeId?: number;
    onImagesChange?: (imgs: ApiImage[]) => void;
    onSave: () => void;
    onCancel: () => void;
}

function InlineForm({
    form,
    setForm,
    formErrors,
    saving,
    isCreate,
    editImages = [],
    editImagesLoading = false,
    universeId,
    onImagesChange,
    onSave,
    onCancel,
}: InlineFormProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'images' | 'names'>(
        'general',
    );

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'branding', label: 'Branding' },
        ...(!isCreate ? [{ id: 'images', label: 'Images' }] : []),
        { id: 'names', label: 'Compound Names' },
    ] as const;

    return (
        <div className="border-t bg-muted/30">
            {/* Tab bar */}
            <div className="flex gap-0 border-b bg-background">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={cn(
                            'relative px-4 py-2.5 text-xs font-medium transition-colors',
                            activeTab === tab.id
                                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground after:content-[""]'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2 px-3">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
                        <X className="mr-1 size-3" />
                        Cancel
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">
                        {saving ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                            <Check className="mr-1 size-3" />
                        )}
                        {isCreate ? 'Create' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className="p-5">
                {/*  General  */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setForm((p) => ({
                                        ...p,
                                        name,
                                        slug: isCreate ? slugify(name) : p.slug,
                                    }));
                                }}
                                placeholder="Universe"
                                className="h-8 text-sm"
                                autoFocus
                            />
                            {formErrors.name && (
                                <p className="text-xs text-destructive">{formErrors.name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Slug</Label>
                            <Input
                                value={form.slug}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, slug: e.target.value }))
                                }
                                placeholder="universe"
                                className="h-8 font-mono text-sm"
                            />
                            {formErrors.slug && (
                                <p className="text-xs text-destructive">{formErrors.slug}</p>
                            )}
                        </div>

                        <div className="space-y-1.5 md:col-span-3">
                            <Label className="text-xs">Description</Label>
                            <textarea
                                className="flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
                                value={form.description}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, description: e.target.value }))
                                }
                                placeholder="An optional description of this universe…"
                            />
                        </div>
                    </div>
                )}

                {/*  Branding  */}
                {activeTab === 'branding' && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Color picker */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Theme Color</Label>
                                {form.theme_color && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((p) => ({ ...p, theme_color: '' }))
                                        }
                                        className="flex items-center gap-1 rounded text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3" /> Clear
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                                {PRESET_COLORS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        title={preset.label}
                                        onClick={() =>
                                            setForm((p) => ({
                                                ...p,
                                                theme_color:
                                                    p.theme_color === preset.value
                                                        ? ''
                                                        : preset.value,
                                            }))
                                        }
                                        className="relative flex aspect-square w-full items-center justify-center rounded-lg transition-all hover:scale-110 focus:outline-none"
                                        style={{
                                            backgroundColor: preset.value,
                                            boxShadow:
                                                form.theme_color === preset.value
                                                    ? `0 0 0 2px white, 0 0 0 3.5px ${preset.value}`
                                                    : undefined,
                                        }}
                                    >
                                        {form.theme_color === preset.value && (
                                            <Check className="size-3.5 text-white drop-shadow" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            {/* Hex input */}
                            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5">
                                <div
                                    className="size-3.5 shrink-0 rounded border transition-colors duration-300"
                                    style={{
                                        backgroundColor: /^#[0-9a-fA-F]{6}$/.test(
                                            form.theme_color,
                                        )
                                            ? form.theme_color
                                            : undefined,
                                    }}
                                />
                                <input
                                    type="text"
                                    value={form.theme_color}
                                    onChange={(e) => {
                                        let v = e.target.value;
                                        if (v && !v.startsWith('#')) v = '#' + v;
                                        setForm((p) => ({
                                            ...p,
                                            theme_color: v.slice(0, 7),
                                        }));
                                    }}
                                    placeholder="#2563eb"
                                    className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    maxLength={7}
                                />
                            </div>
                        </div>

                        {/* Live preview */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Preview</p>
                            <div
                                className="rounded-xl border p-4 transition-all duration-300"
                                style={{
                                    background: form.theme_color
                                        ? `${form.theme_color}0d`
                                        : undefined,
                                    borderColor: form.theme_color
                                        ? `${form.theme_color}50`
                                        : undefined,
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300"
                                        style={{
                                            backgroundColor: form.theme_color
                                                ? `${form.theme_color}22`
                                                : undefined,
                                        }}
                                    >
                                        {editImages.find((i) => i.type === 'icon')?.url ? (
                                            <img
                                                src={
                                                    editImages.find((i) => i.type === 'icon')!.url
                                                }
                                                alt=""
                                                className="size-7 rounded object-contain"
                                            />
                                        ) : (
                                            <Globe
                                                className="size-4.5"
                                                style={{
                                                    color: form.theme_color || undefined,
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="truncate text-sm font-semibold transition-colors duration-300"
                                            style={{ color: form.theme_color || undefined }}
                                        >
                                            {form.name || 'Universe Name'}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {form.slug || 'universe-slug'}
                                        </p>
                                    </div>
                                </div>
                                {form.theme_color && (
                                    <div
                                        className="mt-3 h-0.5 w-full rounded-full transition-colors duration-300"
                                        style={{ backgroundColor: form.theme_color }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/*  Images  */}
                {activeTab === 'images' && !isCreate && (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-amber-600">Icon</span> small square logo shown in the navbar &amp; wiki pages.{' '} <br />
                            <span className="font-semibold text-blue-600">Profile</span> wide logo or wordmark.{' '} <br />
                            <span className="font-semibold text-violet-600">Banner</span> hero image at the top of the universe wiki page.
                        </p>
                        {editImagesLoading ? (
                            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" /> Loading images…
                            </div>
                        ) : (
                            <ImageUploader
                                images={editImages}
                                imageableType="universe"
                                imageableId={universeId!}
                                onImagesChange={onImagesChange!}
                            />
                        )}
                    </div>
                )}

                {/*  Compound Names  */}
                {activeTab === 'names' && (
                    <CompoundNamesEditor
                        value={form.compound_names}
                        onChange={(names) => setForm((f) => ({ ...f, compound_names: names }))}
                    />
                )}
            </div>
        </div>
    );
}

// 
// Delete confirm inline strip
// 
interface DeleteStripProps {
    universe: ApiUniverse;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function DeleteStrip({ universe, deleting, onConfirm, onCancel }: DeleteStripProps) {
    return (
        <tr>
            <td colSpan={6} className="p-0">
                <div className="flex items-center gap-3 border-t bg-destructive/5 px-4 py-3">
                    <AlertTriangle className="size-4 shrink-0 text-destructive" />
                    <p className="flex-1 text-sm text-foreground">
                        Delete{' '}
                        <strong className="font-semibold">{universe.name}</strong>? This will
                        permanently remove all entities, timelines and media sources.
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="h-7 text-xs"
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="h-7 text-xs"
                    >
                        {deleting ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                            <Trash2 className="mr-1 size-3" />
                        )}
                        Delete
                    </Button>
                </div>
            </td>
        </tr>
    );
}

// 
// Create row (pinned above the table body)
// 
interface CreateRowProps {
    onCreated: (universe: ApiUniverse) => void;
    onCancel: () => void;
}

function CreateRow({ onCreated, onCancel }: CreateRowProps) {
    const [form, setForm] = useState<UniverseForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Partial<UniverseForm>>({});

    const handleSave = async () => {
        setSaving(true);
        setFormErrors({});
        try {
            const res = await api.createUniverse({
                name: form.name,
                slug: form.slug,
                description: form.description,
            });
            onCreated(res.data);
        } catch (e: any) {
            if (e.body?.errors) setFormErrors(e.body.errors);
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr>
            <td colSpan={6} className="p-0">
                <div className="border-b">
                    <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2.5">
                        <Plus className="size-3.5 shrink-0 text-primary" />
                        <span className="text-xs font-semibold text-primary">New Universe</span>
                    </div>
                    <InlineForm
                        form={form}
                        setForm={setForm}
                        formErrors={formErrors}
                        saving={saving}
                        isCreate={true}
                        onSave={handleSave}
                        onCancel={onCancel}
                    />
                </div>
            </td>
        </tr>
    );
}

// 
// Single universe row
// 
interface UniverseRowProps {
    universe: ApiUniverse;
    expanded: boolean;
    deleteMode: boolean;
    onToggleEdit: () => void;
    onToggleDelete: () => void;
    onUpdated: (u: ApiUniverse) => void;
    onDeleted: (id: number) => void;
}

function UniverseRow({
    universe,
    expanded,
    deleteMode,
    onToggleEdit,
    onToggleDelete,
    onUpdated,
    onDeleted,
}: UniverseRowProps) {
    const [form, setForm] = useState<UniverseForm>({
        name: universe.name,
        slug: universe.slug,
        description: universe.description ?? '',
        theme_color: (universe.settings?.theme_color as string) ?? '',
        compound_names: universe.compound_names ?? [],
    });
    const [formErrors, setFormErrors] = useState<Partial<UniverseForm>>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editImages, setEditImages] = useState<ApiImage[]>([]);
    const [editImagesLoading, setEditImagesLoading] = useState(false);

    // When expanded, load full universe (with images)
    const loadedRef = useRef(false);
    useEffect(() => {
        if (expanded && !loadedRef.current) {
            loadedRef.current = true;
            setEditImagesLoading(true);
            api.fetchUniverse(universe.id)
                .then((res) => setEditImages(res.data.images ?? []))
                .catch(() => {})
                .finally(() => setEditImagesLoading(false));
        }
        if (!expanded) {
            // Reset so we re-fetch on next open if needed
            loadedRef.current = false;
        }
    }, [expanded, universe.id]);

    const handleSave = async () => {
        setSaving(true);
        setFormErrors({});
        try {
            const res = await api.updateUniverse(universe.id, {
                name: form.name,
                slug: form.slug,
                description: form.description,
                settings: {
                    ...(universe.settings ?? {}),
                    theme_color: form.theme_color || null,
                },
            });
            onUpdated(res.data);
            onToggleEdit(); // close
        } catch (e: any) {
            if (e.body?.errors) setFormErrors(e.body.errors);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.deleteUniverse(universe.id);
            onDeleted(universe.id);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeleting(false);
        }
    };

    const color = universe.settings?.theme_color as string | undefined;
    const iconUrl = universe.images?.find((i) => i.type === 'icon')?.url;

    return (
        <>
            <tr
                className={cn(
                    'group border-b transition-colors',
                    expanded && 'bg-muted/20',
                    !expanded && 'hover:bg-muted/30',
                )}
            >
                {/* Name */}
                <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2.5">
                        {color ? (
                            <div
                                className="size-4 shrink-0 rounded-full border border-white shadow-sm ring-1 ring-border"
                                style={{ backgroundColor: color }}
                            />
                        ) : iconUrl ? (
                            <img
                                src={iconUrl}
                                alt=""
                                className="size-4 shrink-0 rounded object-contain"
                            />
                        ) : (
                            <Globe className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{universe.name}</span>
                    </div>
                </td>

                {/* Slug */}
                <td className="px-3 py-2.5">
                    <Badge variant="outline" className="font-mono text-xs">
                        {universe.slug}
                    </Badge>
                </td>

                {/* Entities */}
                <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">
                    {universe.entities_count ?? ''}
                </td>

                {/* Timelines */}
                <td className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">
                    {universe.timelines_count ?? ''}
                </td>

                {/* Description */}
                <td className="max-w-xs px-3 py-2.5">
                    {universe.description ? (
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                            {universe.description}
                        </span>
                    ) : (
                        <span className="text-sm italic text-muted-foreground/40">
                            No description
                        </span>
                    )}
                </td>

                {/* Actions */}
                <td className="py-2.5 pl-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                        {/* Images quick-indicator */}
                        {(universe.images?.length ?? 0) > 0 && (
                            <div
                                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                title={`${universe.images!.length} image(s)`}
                            >
                                <ImageIcon className="size-3" />
                                <span>{universe.images!.length}</span>
                            </div>
                        )}

                        <Button
                            variant={deleteMode ? 'destructive' : expanded ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={onToggleEdit}
                        >
                            Edit
                            <ChevronDown
                                className={cn(
                                    'size-3 transition-transform duration-150',
                                    expanded && 'rotate-180',
                                )}
                            />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'size-7 transition-colors',
                                deleteMode
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'text-muted-foreground hover:text-destructive',
                            )}
                            onClick={onToggleDelete}
                            title="Delete universe"
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    </div>
                </td>
            </tr>

            {/* Inline edit panel */}
            {expanded && !deleteMode && (
                <tr>
                    <td colSpan={6} className="p-0">
                        <InlineForm
                            form={form}
                            setForm={setForm}
                            formErrors={formErrors}
                            saving={saving}
                            isCreate={false}
                            editImages={editImages}
                            editImagesLoading={editImagesLoading}
                            universeId={universe.id}
                            onImagesChange={setEditImages}
                            onSave={handleSave}
                            onCancel={onToggleEdit}
                        />
                    </td>
                </tr>
            )}

            {/* Inline delete confirmation */}
            {deleteMode && (
                <DeleteStrip
                    universe={universe}
                    deleting={deleting}
                    onConfirm={handleDelete}
                    onCancel={onToggleDelete}
                />
            )}
        </>
    );
}

// 
// Page
// 
export default function AdminUniverses() {
    const [universes, setUniverses] = useState<ApiUniverse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track which row is open for edit/delete (only one at a time)
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const load = () => {
        setLoading(true);
        api.fetchUniverses()
            .then((res) => setUniverses(res.data))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const toggleEdit = (id: number) => {
        setDeleteId(null);
        setShowCreate(false);
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const toggleDelete = (id: number) => {
        setExpandedId(null);
        setShowCreate(false);
        setDeleteId((prev) => (prev === id ? null : id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin · Universes" />
            <AdminLayout>
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-semibold">Universes</h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Create and manage fictional universes.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant={showCreate ? 'secondary' : 'default'}
                            className="shrink-0"
                            onClick={() => {
                                setExpandedId(null);
                                setDeleteId(null);
                                setShowCreate((v) => !v);
                            }}
                        >
                            {showCreate ? (
                                <>
                                    <X className="mr-1.5 size-3.5" /> Cancel
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-1.5 size-3.5" /> New Universe
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                            <AlertTriangle className="size-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-muted-foreground">
                                        Name
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                                        Slug
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                                        Entities
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                                        Timelines
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                                        Description
                                    </th>
                                    <th className="py-2.5 pl-3 pr-4 text-right text-xs font-medium text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Create row – pinned at top */}
                                {showCreate && (
                                    <CreateRow
                                        onCreated={(u) => {
                                            setUniverses((prev) => [...prev, u]);
                                            setShowCreate(false);
                                        }}
                                        onCancel={() => setShowCreate(false)}
                                    />
                                )}

                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-12 text-center text-sm text-muted-foreground"
                                        >
                                            <Loader2 className="mx-auto mb-2 size-5 animate-spin opacity-40" />
                                            Loading universes…
                                        </td>
                                    </tr>
                                ) : universes.length === 0 && !showCreate ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-12 text-center text-sm text-muted-foreground"
                                        >
                                            <Globe className="mx-auto mb-2 size-8 opacity-20" />
                                            No universes yet. Create your first one above.
                                        </td>
                                    </tr>
                                ) : (
                                    universes.map((universe) => (
                                        <UniverseRow
                                            key={universe.id}
                                            universe={universe}
                                            expanded={expandedId === universe.id}
                                            deleteMode={deleteId === universe.id}
                                            onToggleEdit={() => toggleEdit(universe.id)}
                                            onToggleDelete={() => toggleDelete(universe.id)}
                                            onUpdated={(u) =>
                                                setUniverses((prev) =>
                                                    prev.map((x) =>
                                                        x.id === u.id ? u : x,
                                                    ),
                                                )
                                            }
                                            onDeleted={(id) =>
                                                setUniverses((prev) =>
                                                    prev.filter((x) => x.id !== id),
                                                )
                                            }
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AdminLayout>
        </AppLayout>
    );
}
