import { Head } from '@inertiajs/react';
import { Check, Edit3, Globe, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ImageUploader } from '@/components/archives/image-uploader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import AdminLayout from '@/layouts/admin/layout';
import * as api from '@/lib/api';
import type { ApiImage, ApiUniverse } from '@/types/api';
import type { BreadcrumbItem } from '@/types';
import { CompoundNamesEditor } from '@/components/compound-names-editor';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/users' },
    { title: 'Universes', href: '/admin/universes' },
];

type UniverseForm = { name: string; slug: string; description: string; theme_color: string; compound_names: string[] };
const EMPTY_FORM: UniverseForm = { name: '', slug: '', description: '', theme_color: '' };

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
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AdminUniverses() {
    const [universes, setUniverses] = useState<ApiUniverse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialog, setDialog] = useState<false | 'create' | ApiUniverse>(false);
    const [form, setForm] = useState<UniverseForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Partial<UniverseForm>>({});

    const [deleteTarget, setDeleteTarget] = useState<ApiUniverse | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [editImages, setEditImages] = useState<ApiImage[]>([]);
    const [editImagesLoading, setEditImagesLoading] = useState(false);

    const load = () => {
        setLoading(true);
        api.fetchUniverses()
            .then((res) => setUniverses(res.data))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setFormErrors({});
        setDialog('create');
    };

    const openEdit = (universe: ApiUniverse) => {
        setForm({
            name: universe.name,
            slug: universe.slug,
            description: universe.description ?? '',
            theme_color: (universe.settings?.theme_color as string) ?? '',
            compound_names: universe.compound_names ?? [],
        });
        setFormErrors({});
        setEditImages([]);
        setDialog(universe);
        // Load images for this universe (not included in the listing)
        setEditImagesLoading(true);
        api.fetchUniverse(universe.id)
            .then((res) => setEditImages(res.data.images ?? []))
            .catch(() => {})
            .finally(() => setEditImagesLoading(false));
    };

    const handleSave = async () => {
        setSaving(true);
        setFormErrors({});
        try {
            if (dialog === 'create') {
                const res = await api.createUniverse({ name: form.name, slug: form.slug, description: form.description });
                setUniverses((prev) => [...prev, res.data]);
            } else if (dialog !== false) {
                const res = await api.updateUniverse(dialog.id, {
                    name: form.name,
                    slug: form.slug,
                    description: form.description,
                    settings: { ...(dialog.settings ?? {}), theme_color: form.theme_color || null },
                });
                setUniverses((prev) => prev.map((u) => (u.id === res.data.id ? res.data : u)));
            }
            setDialog(false);
        } catch (e: any) {
            if (e.body?.errors) setFormErrors(e.body.errors);
            else setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.deleteUniverse(deleteTarget.id);
            setUniverses((prev) => prev.filter((u) => u.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin  Universes" />
            <AdminLayout>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Universes</h2>
                            <p className="text-muted-foreground text-sm">
                                Create and manage fictional universes.
                            </p>
                        </div>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-1.5 size-3.5" /> New Universe
                        </Button>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading universes…
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Entities</TableHead>
                                        <TableHead>Timelines</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-24" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {universes.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-8 text-center text-muted-foreground"
                                            >
                                                No universes yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        universes.map((universe) => (
                                            <TableRow key={universe.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {universe.settings?.theme_color ? (
                                                            <div
                                                                className="size-4 shrink-0 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                                                                style={{ backgroundColor: universe.settings.theme_color as string }}
                                                            />
                                                        ) : universe.images?.find((i) => i.type === 'icon')?.url ? (
                                                            <img
                                                                src={universe.images.find((i) => i.type === 'icon')!.url}
                                                                alt=""
                                                                className="size-4 shrink-0 rounded object-contain"
                                                            />
                                                        ) : (
                                                            <Globe className="size-4 shrink-0 text-muted-foreground" />
                                                        )}
                                                        {universe.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {universe.slug}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {universe.entities_count ?? ''}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {universe.timelines_count ?? ''}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-muted-foreground">
                                                    {universe.description ?? (
                                                        <span className="italic opacity-40">No description</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            onClick={() => openEdit(universe)}
                                                        >
                                                            <Edit3 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteTarget(universe)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Create / Edit Dialog */}
                <Dialog open={dialog !== false} onOpenChange={(open) => !open && setDialog(false)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {dialog === 'create' ? 'Create Universe' : 'Edit Universe'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-1">
                            <div className="grid grid-cols-5 gap-6">
                                {/*  Left: General Info  */}
                                <div className="col-span-3 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label>Name</Label>
                                        <Input
                                            value={form.name}
                                            onChange={(e) => {
                                                const name = e.target.value;
                                                setForm((p) => ({
                                                    ...p,
                                                    name,
                                                    slug: dialog === 'create' ? slugify(name) : p.slug,
                                                }));
                                            }}
                                            placeholder="Archive Universe"
                                        />
                                        {formErrors.name && (
                                            <p className="text-xs text-destructive">{formErrors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Slug</Label>
                                        <Input
                                            value={form.slug}
                                            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                                            placeholder="fictional-universe"
                                            className="font-mono text-sm"
                                        />
                                        {formErrors.slug && (
                                            <p className="text-xs text-destructive">{formErrors.slug}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Description</Label>
                                        <textarea
                                            className="flex min-h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
                                            value={form.description}
                                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="An optional description of this universe…"
                                        />
                                    </div>
                                </div>

                                {/*  Right: Branding  */}
                                <div className="col-span-2 space-y-4">
                                    {/* Live Preview */}
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                            Preview
                                        </p>
                                        <div
                                            className="rounded-xl border p-3.5 transition-all duration-300"
                                            style={{
                                                background: form.theme_color
                                                    ? `${form.theme_color}0d`
                                                    : '#f8fafc',
                                                borderColor: form.theme_color
                                                    ? `${form.theme_color}50`
                                                    : '#e2e8f0',
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300"
                                                    style={{
                                                        backgroundColor: form.theme_color
                                                            ? `${form.theme_color}22`
                                                            : '#f1f5f9',
                                                    }}
                                                >
                                                    {editImages.find((i) => i.type === 'icon')?.url ? (
                                                        <img
                                                            src={editImages.find((i) => i.type === 'icon')!.url}
                                                            alt=""
                                                            className="size-7 rounded object-contain"
                                                        />
                                                    ) : (
                                                        <Globe
                                                            className="size-4"
                                                            style={{ color: form.theme_color || '#94a3b8' }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="truncate text-sm font-semibold transition-colors duration-300"
                                                        style={{ color: form.theme_color || '#0f172a' }}
                                                    >
                                                        {form.name || 'Universe Name'}
                                                    </p>
                                                    <p className="truncate text-[11px] text-slate-400">
                                                        {form.description || 'No description yet'}
                                                    </p>
                                                </div>
                                            </div>
                                            {form.theme_color && (
                                                <div
                                                    className="mt-2.5 h-0.5 w-full rounded-full transition-colors duration-300"
                                                    style={{ backgroundColor: form.theme_color }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Theme Color */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                                Theme Color
                                            </p>
                                            {form.theme_color && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setForm((p) => ({ ...p, theme_color: '' }))
                                                    }
                                                    className="flex items-center gap-1 rounded text-[11px] text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="size-3" /> Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* 2×6 swatch grid */}
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
                                                                ? `0 0 0 2px white, 0 0 0 4px ${preset.value}`
                                                                : undefined,
                                                    }}
                                                >
                                                    {form.theme_color === preset.value && (
                                                        <Check className="size-3.5 text-white drop-shadow" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Hex input  syncs with swatches */}
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                                            <div
                                                className="size-3.5 shrink-0 rounded border border-slate-200 transition-colors duration-300"
                                                style={{
                                                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(
                                                        form.theme_color,
                                                    )
                                                        ? form.theme_color
                                                        : '#f8fafc',
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
                                                className="flex-1 bg-transparent font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*  Branding Images  only for existing universes  */}
                            {dialog !== 'create' && (
                                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                            Branding Images
                                        </p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                                            <span className="font-semibold text-amber-600">Icon</span> small
                                            square logo shown in the navbar &amp; wiki pages.{' '}
                                            <br />
                                            <span className="font-semibold text-blue-600">Profile</span> 
                                            wide logo or wordmark.{' '}
                                            <br />
                                            <span className="font-semibold text-violet-600">Banner</span> 
                                            hero image displayed at the top of the universe wiki page.
                                        </p>
                                    </div>
                                    {editImagesLoading ? (
                                        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                            <Loader2 className="size-3.5 animate-spin" /> Loading images…
                                        </div>
                                    ) : (
                                        <ImageUploader
                                            images={editImages}
                                            imageableType="universe"
                                            imageableId={(dialog as ApiUniverse).id}
                                            onImagesChange={setEditImages}
                                        />
                                    )}
                                </div>
                            )}
                            
                                        <CompoundNamesEditor
                                            value={form.compound_names}
                                            onChange={names => setForm(f => ({ ...f, compound_names: names }))
                                                }
                                        />
                            
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : dialog === 'create' ? 'Create Universe' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm Dialog */}
                <Dialog
                    open={!!deleteTarget}
                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                >
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Universe</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete{' '}
                            <strong>{deleteTarget?.name}</strong>? This will permanently delete all
                            entities, timelines, and media sources within this universe.
                        </p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting…' : 'Delete Universe'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </AppLayout>
    );
}
