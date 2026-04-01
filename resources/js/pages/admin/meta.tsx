import { Head } from '@inertiajs/react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import AdminLayout from '@/layouts/admin/layout';
import * as api from '@/lib/api';
import type {
    ApiAttributeDefinition,
    ApiMetaEntityStatus,
    ApiMetaEntityType,
    ApiMetaRelationType,
} from '@/types/api';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/users' },
    { title: 'Meta / Lookup Data', href: '/admin/meta' },
];

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

//  Entity Types Tab 

type EntityTypeForm = {
    name: string; slug: string; description: string; icon: string; color: string;
};
const EMPTY_ET: EntityTypeForm = { name: '', slug: '', description: '', icon: '', color: '' };

function EntityTypesTab() {
    const [items, setItems] = useState<ApiMetaEntityType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<false | 'create' | ApiMetaEntityType>(false);
    const [form, setForm] = useState<EntityTypeForm>(EMPTY_ET);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiMetaEntityType | null>(null);

    useEffect(() => {
        api.fetchEntityTypes().then((res) => setItems(res.data)).finally(() => setLoading(false));
    }, []);

    const openCreate = () => { setForm(EMPTY_ET); setDialog('create'); };
    const openEdit = (item: ApiMetaEntityType) => {
        setForm({ name: item.name, slug: item.slug, description: item.description ?? '', icon: item.icon ?? '', color: item.color ?? '' });
        setDialog(item);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (dialog === 'create') {
                const res = await api.createEntityType(form);
                setItems((prev) => [...prev, res.data]);
            } else if (dialog !== false) {
                const res = await api.updateEntityType(dialog.id, form);
                setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
            }
            setDialog(false);
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteEntityType(deleteTarget.id);
            setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 size-3.5" /> New Type</Button>
            </div>
            {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div> : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Icon</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-20" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No entity types yet.</TableCell></TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="font-mono text-xs">{item.slug}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground">{item.icon ?? ''}</TableCell>
                                    <TableCell>
                                        {item.color ? (
                                            <div className="flex items-center gap-2">
                                                <div className="size-4 rounded-full border" style={{ background: item.color }} />
                                                <span className="font-mono text-xs text-muted-foreground">{item.color}</span>
                                            </div>
                                        ) : ''}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.description ?? ''}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dialog !== false} onOpenChange={(open) => !open && setDialog(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{dialog === 'create' ? 'New Entity Type' : 'Edit Entity Type'}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="col-span-2 space-y-1">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: dialog === 'create' ? slugify(e.target.value) : p.slug }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Slug</Label>
                            <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Icon</Label>
                            <Input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="e.g. User, Zap" />
                        </div>
                        <div className="space-y-1">
                            <Label>Color</Label>
                            <Input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} placeholder="#ff0000" />
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : dialog === 'create' ? 'Create' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Delete Entity Type</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.name}</strong>? This may affect existing entities of this type.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

//  Entity Statuses Tab 

type StatusForm = { name: string; slug: string; description: string; color: string };
const EMPTY_SF: StatusForm = { name: '', slug: '', description: '', color: '' };

function EntityStatusesTab() {
    const [items, setItems] = useState<ApiMetaEntityStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<false | 'create' | ApiMetaEntityStatus>(false);
    const [form, setForm] = useState<StatusForm>(EMPTY_SF);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiMetaEntityStatus | null>(null);

    useEffect(() => {
        api.fetchEntityStatuses().then((res) => setItems(res.data)).finally(() => setLoading(false));
    }, []);

    const openCreate = () => { setForm(EMPTY_SF); setDialog('create'); };
    const openEdit = (item: ApiMetaEntityStatus) => {
        setForm({ name: item.name, slug: item.slug, description: item.description ?? '', color: item.color ?? '' });
        setDialog(item);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (dialog === 'create') {
                const res = await api.createEntityStatus(form);
                setItems((prev) => [...prev, res.data]);
            } else if (dialog !== false) {
                const res = await api.updateEntityStatus(dialog.id, form);
                setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
            }
            setDialog(false);
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteEntityStatus(deleteTarget.id);
            setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 size-3.5" /> New Status</Button>
            </div>
            {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div> : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-20" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No statuses yet.</TableCell></TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="font-mono text-xs">{item.slug}</Badge></TableCell>
                                    <TableCell>
                                        {item.color ? (
                                            <div className="flex items-center gap-2">
                                                <div className="size-4 rounded-full border" style={{ background: item.color }} />
                                                <span className="font-mono text-xs text-muted-foreground">{item.color}</span>
                                            </div>
                                        ) : ''}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.description ?? ''}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dialog !== false} onOpenChange={(open) => !open && setDialog(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{dialog === 'create' ? 'New Entity Status' : 'Edit Entity Status'}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="col-span-2 space-y-1">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: dialog === 'create' ? slugify(e.target.value) : p.slug }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Slug</Label>
                            <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Color</Label>
                            <Input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} placeholder="#00ff00" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : dialog === 'create' ? 'Create' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Delete Status</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.name}</strong>?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

//  Relation Types Tab 

type RelTypeForm = { name: string; slug: string; description: string; inverse_name: string; is_directional: boolean };
const EMPTY_RT: RelTypeForm = { name: '', slug: '', description: '', inverse_name: '', is_directional: false };

function RelationTypesTab() {
    const [items, setItems] = useState<ApiMetaRelationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<false | 'create' | ApiMetaRelationType>(false);
    const [form, setForm] = useState<RelTypeForm>(EMPTY_RT);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiMetaRelationType | null>(null);

    useEffect(() => {
        api.fetchRelationTypes().then((res) => setItems(res.data)).finally(() => setLoading(false));
    }, []);

    const openCreate = () => { setForm(EMPTY_RT); setDialog('create'); };
    const openEdit = (item: ApiMetaRelationType) => {
        setForm({ name: item.name, slug: item.slug, description: item.description ?? '', inverse_name: item.inverse_name ?? '', is_directional: item.is_directional });
        setDialog(item);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (dialog === 'create') {
                const res = await api.createRelationType(form);
                setItems((prev) => [...prev, res.data]);
            } else if (dialog !== false) {
                const res = await api.updateRelationType(dialog.id, form);
                setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
            }
            setDialog(false);
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteRelationType(deleteTarget.id);
            setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 size-3.5" /> New Relation Type</Button>
            </div>
            {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div> : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Inverse Name</TableHead>
                                <TableHead>Directional</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-20" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No relation types yet.</TableCell></TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.inverse_name ?? ''}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_directional ? 'default' : 'outline'} className="text-xs">
                                            {item.is_directional ? 'Yes' : 'No'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.description ?? ''}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dialog !== false} onOpenChange={(open) => !open && setDialog(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{dialog === 'create' ? 'New Relation Type' : 'Edit Relation Type'}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="col-span-2 space-y-1">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: dialog === 'create' ? slugify(e.target.value) : p.slug }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Slug</Label>
                            <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Inverse Name</Label>
                            <Input value={form.inverse_name} onChange={(e) => setForm((p) => ({ ...p, inverse_name: e.target.value }))} placeholder="e.g. is known by" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                        </div>
                        <div className="col-span-2">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.is_directional} onChange={(e) => setForm((p) => ({ ...p, is_directional: e.target.checked }))} />
                                Directional (has distinct from → to meaning)
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : dialog === 'create' ? 'Create' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Delete Relation Type</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.name}</strong>? This may affect existing relations using this type.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

//  Attribute Definitions Tab 

const DATA_TYPES = ['string', 'integer', 'float', 'boolean', 'date', 'json', 'entity_reference'] as const;
type AttrForm = {
    name: string; slug: string; data_type: string; meta_entity_type_id: string;
    group_name: string; is_filterable: boolean; is_required: boolean;
    default_value: string; sort_order: string;
};
const EMPTY_AF: AttrForm = {
    name: '', slug: '', data_type: 'string', meta_entity_type_id: '',
    group_name: '', is_filterable: false, is_required: false, default_value: '', sort_order: '0',
};

function AttributeDefinitionsTab() {
    const [items, setItems] = useState<ApiAttributeDefinition[]>([]);
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<false | 'create' | ApiAttributeDefinition>(false);
    const [form, setForm] = useState<AttrForm>(EMPTY_AF);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiAttributeDefinition | null>(null);

    useEffect(() => {
        Promise.all([api.fetchAttributeDefinitions(), api.fetchEntityTypes()])
            .then(([defRes, typRes]) => { setItems(defRes.data); setEntityTypes(typRes.data); })
            .finally(() => setLoading(false));
    }, []);

    const openCreate = () => { setForm(EMPTY_AF); setDialog('create'); };
    const openEdit = (item: ApiAttributeDefinition) => {
        setForm({
            name: item.name, slug: item.slug, data_type: item.data_type,
            meta_entity_type_id: item.meta_entity_type_id?.toString() ?? '',
            group_name: item.group_name ?? '', is_filterable: item.is_filterable,
            is_required: item.is_required, default_value: item.default_value ?? '',
            sort_order: item.sort_order.toString(),
        });
        setDialog(item);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: form.name, slug: form.slug, data_type: form.data_type,
                meta_entity_type_id: form.meta_entity_type_id ? Number(form.meta_entity_type_id) : undefined,
                group_name: form.group_name || undefined, is_filterable: form.is_filterable,
                is_required: form.is_required, default_value: form.default_value || undefined,
                sort_order: Number(form.sort_order),
            };
            if (dialog === 'create') {
                const res = await api.createAttributeDefinition(payload);
                setItems((prev) => [...prev, res.data]);
            } else if (dialog !== false) {
                const res = await api.updateAttributeDefinition(dialog.id, payload);
                setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
            }
            setDialog(false);
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteAttributeDefinition(deleteTarget.id);
            setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 size-3.5" /> New Attribute</Button>
            </div>
            {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div> : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Data Type</TableHead>
                                <TableHead>Entity Type</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead>Flags</TableHead>
                                <TableHead className="w-20" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No attribute definitions yet.</TableCell></TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="font-mono text-xs">{item.data_type}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground">{item.entity_type?.name ?? <span className="italic">Any</span>}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.group_name ?? ''}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {item.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                                            {item.is_filterable && <Badge variant="secondary" className="text-[10px]">Filterable</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dialog !== false} onOpenChange={(open) => !open && setDialog(false)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{dialog === 'create' ? 'New Attribute Definition' : 'Edit Attribute Definition'}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        <div className="col-span-2 space-y-1">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: dialog === 'create' ? slugify(e.target.value) : p.slug }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Slug</Label>
                            <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Data Type</Label>
                            <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs" value={form.data_type} onChange={(e) => setForm((p) => ({ ...p, data_type: e.target.value }))}>
                                {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Entity Type (optional)</Label>
                            <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs" value={form.meta_entity_type_id} onChange={(e) => setForm((p) => ({ ...p, meta_entity_type_id: e.target.value }))}>
                                <option value="">Any / Global</option>
                                {entityTypes.map((et) => <option key={et.id} value={et.id}>{et.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Group Name</Label>
                            <Input value={form.group_name} onChange={(e) => setForm((p) => ({ ...p, group_name: e.target.value }))} placeholder="e.g. Biology" />
                        </div>
                        <div className="space-y-1">
                            <Label>Default Value</Label>
                            <Input value={form.default_value} onChange={(e) => setForm((p) => ({ ...p, default_value: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Sort Order</Label>
                            <Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} />
                        </div>
                        <div className="col-span-2 flex gap-6">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.is_required} onChange={(e) => setForm((p) => ({ ...p, is_required: e.target.checked }))} />
                                Required
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.is_filterable} onChange={(e) => setForm((p) => ({ ...p, is_filterable: e.target.checked }))} />
                                Filterable
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : dialog === 'create' ? 'Create' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Delete Attribute Definition</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.name}</strong>?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

//  Page 

export default function AdminMeta() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin  Meta / Lookup Data" />
            <AdminLayout>
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">Meta / Lookup Data</h2>
                        <p className="text-muted-foreground text-sm">
                            Manage entity types, statuses, relation types, and attribute definitions.
                        </p>
                    </div>
                    <Tabs defaultValue="entity-types">
                        <TabsList>
                            <TabsTrigger value="entity-types">Entity Types</TabsTrigger>
                            <TabsTrigger value="entity-statuses">Entity Statuses</TabsTrigger>
                            <TabsTrigger value="relation-types">Relation Types</TabsTrigger>
                            <TabsTrigger value="attributes">Attribute Definitions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="entity-types" className="mt-4"><EntityTypesTab /></TabsContent>
                        <TabsContent value="entity-statuses" className="mt-4"><EntityStatusesTab /></TabsContent>
                        <TabsContent value="relation-types" className="mt-4"><RelationTypesTab /></TabsContent>
                        <TabsContent value="attributes" className="mt-4"><AttributeDefinitionsTab /></TabsContent>
                    </Tabs>
                </div>
            </AdminLayout>
        </AppLayout>
    );
}
