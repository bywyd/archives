import {
    AlertCircle,
    Boxes,
    CalendarDays,
    Edit3,
    FileText,
    Film,
    Image as ImageIcon,
    Link2,
    List,
    Loader2,
    MapPin,
    Network,
    Plus,
    Save,
    Tags,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EntityPicker } from '@/components/archives/entity-picker';
import { ImageUploader } from '@/components/archives/image-uploader';
import { RecordFormPanel, RECORD_TYPE_LABELS } from '@/components/archives/record-form-panel';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import * as api from '@/lib/api';
import type { RecordType } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiAttributeDefinition,
    ApiCategory,
    ApiEntity,
    ApiEntityAlias,
    ApiEntityAttribute,
    ApiEntityRelation,
    ApiEntitySection,
    ApiMediaSource,
    ApiMediaSourcePivot,
    ApiMetaEntityStatus,
    ApiMetaEntityType,
    ApiMetaRelationType,
    ApiTag,
    ApiTimeline,
    ApiTimelinePivot,
} from '@/types/api';

type Props = {
    universeId: number;
    entityId?: number;
    entitySlug?: string;
    initialTab?: string;
};

type EditorTab = 'basic' | 'images' | 'sections' | 'aliases' | 'attributes' | 'relations' | 'taxonomy' | 'records' | 'timelines' | 'media-sources' | 'maps';

export function EntityEditor({ universeId, entityId, entitySlug, initialTab }: Props) {
    const [entity, setEntity] = useState<ApiEntity | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EditorTab>((initialTab as EditorTab) || 'basic');
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [entityStatuses, setEntityStatuses] = useState<ApiMetaEntityStatus[]>([]);
    const [universeSlug, setUniverseSlug] = useState('');
    const isNew = !entityId && !entitySlug;

    // Load meta data
    useEffect(() => {
        Promise.all([api.fetchEntityTypes(), api.fetchEntityStatuses(), api.fetchUniverse(universeId)]).then(([types, statuses, universe]) => {
            setEntityTypes(types.data);
            setEntityStatuses(statuses.data);
            setUniverseSlug(universe.data.slug);
        });
    }, [universeId]);

    // Load entity if editing
    useEffect(() => {
        if (!isNew && (entityId || entitySlug)) {
            setLoading(true);
            api.fetchEntity(universeId, entityId ?? entitySlug!)
                .then((res) => setEntity(res.data))
                .catch((err) => setError(err.message || 'Failed to load entity'))
                .finally(() => setLoading(false));
        }
    }, [universeId, entityId, entitySlug, isNew]);

    const refreshEntity = useCallback(() => {
        if (entity?.id) {
            api.fetchEntity(universeId, entity.id).then((res) => setEntity(res.data));
        }
    }, [universeId, entity?.id]);

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-xs tracking-widest text-[var(--arc-text-muted)]">LOADING EDITOR...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <p className="text-sm font-medium text-[var(--arc-danger)]">{error}</p>
            </div>
        );
    }

    const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
        { id: 'basic', label: 'Basic Info', icon: <Edit3 className="size-3.5" /> },
        ...(isNew ? [] : [
            { id: 'images' as EditorTab, label: 'Images', icon: <ImageIcon className="size-3.5" /> },
            { id: 'sections' as EditorTab, label: 'Sections', icon: <FileText className="size-3.5" /> },
            { id: 'aliases' as EditorTab, label: 'Aliases', icon: <Link2 className="size-3.5" /> },
            { id: 'attributes' as EditorTab, label: 'Attributes', icon: <Boxes className="size-3.5" /> },
            { id: 'relations' as EditorTab, label: 'Relations', icon: <Network className="size-3.5" /> },
            { id: 'taxonomy' as EditorTab, label: 'Tags', icon: <Tags className="size-3.5" /> },
            { id: 'records' as EditorTab, label: 'Records', icon: <List className="size-3.5" /> },
            { id: 'timelines' as EditorTab, label: 'Timelines', icon: <CalendarDays className="size-3.5" /> },
            { id: 'media-sources' as EditorTab, label: 'Media', icon: <Film className="size-3.5" /> },
            { id: 'maps' as EditorTab, label: 'Maps', icon: <MapPin className="size-3.5" /> },
        ]),
    ];

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="shrink-0 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Edit3 className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        {isNew ? 'NEW ENTITY' : 'EDIT ENTITY'}
                    </span>
                    {entity && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                             {entity.name} #{String(entity.id).padStart(6, '0')}
                        </span>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="shrink-0 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                <div className="arc-tabs px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className="arc-tab"
                            data-active={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="p-4">
                    {activeTab === 'basic' && (
                        <BasicInfoForm
                            universeId={universeId}
                            entity={entity}
                            entityTypes={entityTypes}
                            entityStatuses={entityStatuses}
                            onSaved={(saved) => {
                                setEntity(saved);
                            }}
                        />
                    )}
                    {activeTab === 'images' && entity && (
                        <ImageUploader
                            images={entity.images ?? []}
                            imageableType="entity"
                            imageableId={entity.id}
                            onImagesChange={(images) => setEntity({ ...entity, images })}
                        />
                    )}
                    {activeTab === 'sections' && entity && (
                        <SectionsEditor universeId={universeId} universeSlug={universeSlug} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'aliases' && entity && (
                        <AliasesEditor entity={entity} onUpdate={(aliases) => setEntity({ ...entity, aliases })} universeId={universeId} />
                    )}
                    {activeTab === 'attributes' && entity && (
                        <AttributesEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'relations' && entity && (
                        <RelationsEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'taxonomy' && entity && (
                        <TaxonomyEditor universeId={universeId} entity={entity} onUpdate={(tags, categories) => setEntity({ ...entity, tags, categories })} />
                    )}
                    {activeTab === 'records' && entity && (
                        <RecordsEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'timelines' && entity && (
                        <TimelinesEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'media-sources' && entity && (
                        <MediaSourcesEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                    {activeTab === 'maps' && entity && (
                        <MapsEditor universeId={universeId} entity={entity} onRefresh={refreshEntity} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Basic Info Form
// ============================================================

function BasicInfoForm({
    universeId,
    entity,
    entityTypes,
    entityStatuses,
    onSaved,
}: {
    universeId: number;
    entity: ApiEntity | null;
    entityTypes: ApiMetaEntityType[];
    entityStatuses: ApiMetaEntityStatus[];
    onSaved: (entity: ApiEntity) => void;
}) {
    const isNew = !entity;
    const [form, setForm] = useState({
        name: entity?.name ?? '',
        slug: entity?.slug ?? '',
        short_description: entity?.short_description ?? '',
        content: entity?.content ?? '',
        entity_type_id: entity?.entity_type?.id ?? '',
        entity_status_id: entity?.entity_status?.id ?? '',
        is_featured: entity?.is_featured ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [autoSlug, setAutoSlug] = useState(isNew);

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const setField = (name: string, value: any) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'name' && autoSlug) {
                next.slug = slugify(value);
            }
            return next;
        });
        setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        const payload = {
            ...form,
            entity_type_id: Number(form.entity_type_id),
            entity_status_id: Number(form.entity_status_id),
        };

        try {
            let res;
            if (isNew) {
                res = await api.createEntity(universeId, payload);
            } else {
                res = await api.updateEntity(universeId, entity.id, payload);
            }
            onSaved(res.data);
        } catch (err: any) {
            if (err.body?.errors) {
                const e: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(err.body.errors)) {
                    e[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
                }
                setErrors(e);
            } else {
                setErrors({ _form: err.body?.message || err.message || 'Failed to save' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {errors._form && (
                <div className="rounded border border-[var(--arc-danger)]/30 bg-[var(--arc-danger)]/5 px-3 py-1.5 text-xs text-[var(--arc-danger)]">
                    {errors._form}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Name <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="arc-input text-xs" required />
                    {errors.name && <p className="text-[10px] text-[var(--arc-danger)]">{errors.name}</p>}
                </div>

                {/* Slug */}
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Slug <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => { setAutoSlug(false); setField('slug', e.target.value); }}
                            className="arc-input flex-1 text-xs"
                            required
                        />
                        {!autoSlug && isNew && (
                            <button type="button" onClick={() => { setAutoSlug(true); setField('name', form.name); }} className="arc-btn text-[10px]">
                                Auto
                            </button>
                        )}
                    </div>
                    {errors.slug && <p className="text-[10px] text-[var(--arc-danger)]">{errors.slug}</p>}
                </div>

                {/* Entity Type */}
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Entity Type <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <select value={form.entity_type_id} onChange={(e) => setField('entity_type_id', e.target.value)} className="arc-input text-xs" required>
                        <option value="">Select type...</option>
                        {entityTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {errors.entity_type_id && <p className="text-[10px] text-[var(--arc-danger)]">{errors.entity_type_id}</p>}
                </div>

                {/* Entity Status */}
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Status <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <select value={form.entity_status_id} onChange={(e) => setField('entity_status_id', e.target.value)} className="arc-input text-xs" required>
                        <option value="">Select status...</option>
                        {entityStatuses.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {errors.entity_status_id && <p className="text-[10px] text-[var(--arc-danger)]">{errors.entity_status_id}</p>}
                </div>

                {/* Short Description */}
                <div className="col-span-2 space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Short Description</label>
                    <input type="text" value={form.short_description} onChange={(e) => setField('short_description', e.target.value)} className="arc-input text-xs" maxLength={255} />
                    {errors.short_description && <p className="text-[10px] text-[var(--arc-danger)]">{errors.short_description}</p>}
                </div>

                {/* Content */}
                <div className="col-span-2 space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Content (HTML)</label>
                    <textarea value={form.content} onChange={(e) => setField('content', e.target.value)} rows={8} className="arc-input text-xs font-mono" />
                    {errors.content && <p className="text-[10px] text-[var(--arc-danger)]">{errors.content}</p>}
                </div>

                {/* Featured */}
                <div className="space-y-1">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.is_featured}
                            onChange={(e) => setField('is_featured', e.target.checked)}
                            className="size-3.5 rounded border-[var(--arc-border)]"
                        />
                        <span className="arc-mono text-[10px] tracking-wider text-[var(--arc-text-muted)]">FEATURED ENTITY</span>
                    </label>
                </div>
            </div>

            <div className="flex items-center justify-end border-t border-[var(--arc-border)] pt-3">
                <button type="submit" disabled={saving} className="arc-btn arc-btn-primary text-xs">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    {isNew ? 'Create Entity' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ============================================================
// Aliases Editor
// ============================================================

function AliasesEditor({
    entity,
    onUpdate,
    universeId,
}: {
    entity: ApiEntity;
    onUpdate: (aliases: ApiEntityAlias[]) => void;
    universeId: number;
}) {
    const [aliases, setAliases] = useState<ApiEntityAlias[]>(entity.aliases ?? []);
    const [newAlias, setNewAlias] = useState('');
    const [newContext, setNewContext] = useState('');
    const [saving, setSaving] = useState(false);

    // Aliases are managed through entity update  send full aliases array
    const handleAdd = async () => {
        if (!newAlias.trim()) return;
        setSaving(true);
        try {
            // Re-create: update entity with new aliases array
            const allAliases = [...aliases, { alias: newAlias.trim(), context: newContext.trim() || null }];
            await api.updateEntity(universeId, entity.id, {
                aliases: allAliases.map((a) => ({ alias: a.alias, context: a.context })),
            });
            // Refresh entity to get actual alias IDs
            const res = await api.fetchEntity(universeId, entity.id);
            const newAliasesData = res.data.aliases ?? [];
            setAliases(newAliasesData);
            onUpdate(newAliasesData);
            setNewAlias('');
            setNewContext('');
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="mb-2 flex items-center gap-2 border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">ALIASES / CODENAMES</span>
            </div>

            {aliases.map((alias) => (
                <div key={alias.id} className="flex items-center gap-2 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <span className="flex-1 text-xs font-medium text-[var(--arc-text)]">{alias.alias}</span>
                    {alias.context && (
                        <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">{alias.context}</span>
                    )}
                </div>
            ))}

            <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                    <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Alias</label>
                    <input type="text" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} className="arc-input text-xs" placeholder="e.g. HUNK" />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Context</label>
                    <input type="text" value={newContext} onChange={(e) => setNewContext(e.target.value)} className="arc-input text-xs" placeholder="e.g. Codename" />
                </div>
                <button type="button" onClick={handleAdd} disabled={saving} className="arc-btn arc-btn-primary text-xs">
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add
                </button>
            </div>
        </div>
    );
}

// ============================================================
// Sections Editor
// ============================================================

function SectionsEditor({
    universeId,
    universeSlug,
    entity,
    onRefresh,
}: {
    universeId: number;
    universeSlug: string;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [sections, setSections] = useState<ApiEntitySection[]>(entity.sections ?? []);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState({ title: '', slug: '', content: '', section_type: 'narrative' as string, sort_order: 0, is_collapsible: true });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const startNew = () => {
        setEditingId('new');
        setForm({ title: '', slug: '', content: '', section_type: 'narrative', sort_order: sections.length, is_collapsible: true });
        setErrors({});
    };

    const startEdit = (section: ApiEntitySection) => {
        setEditingId(section.id);
        setForm({
            title: section.title,
            slug: section.slug,
            content: section.content ?? '',
            section_type: section.section_type,
            sort_order: section.sort_order,
            is_collapsible: section.is_collapsible,
        });
        setErrors({});
    };

    const handleSave = async () => {
        setSaving(true);
        setErrors({});
        const payload = { ...form, slug: form.slug || slugify(form.title) };

        try {
            if (editingId === 'new') {
                await api.createEntitySection(universeId, entity.id, payload);
            } else {
                await api.updateEntitySection(universeId, entity.id, editingId as number, payload);
            }
            setEditingId(null);
            // Refresh
            const res = await api.fetchEntitySections(universeId, entity.id);
            setSections(res.data);
            onRefresh();
        } catch (err: any) {
            if (err.body?.errors) {
                const e: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(err.body.errors)) {
                    e[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
                }
                setErrors(e);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (sectionId: number) => {
        await api.deleteEntitySection(universeId, entity.id, sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        onRefresh();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">SECTIONS</span>
                <button type="button" onClick={startNew} className="arc-btn text-xs">
                    <Plus className="size-3" /> Add Section
                </button>
            </div>

            {/* Editing Form */}
            {editingId !== null && (
                <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
                                className="arc-input text-xs"
                                required
                            />
                            {errors.title && <p className="text-[10px] text-[var(--arc-danger)]">{errors.title}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Slug</label>
                            <input type="text" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className="arc-input text-xs" />
                            {errors.slug && <p className="text-[10px] text-[var(--arc-danger)]">{errors.slug}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Type</label>
                            <select value={form.section_type} onChange={(e) => setForm((prev) => ({ ...prev, section_type: e.target.value }))} className="arc-input text-xs">
                                <option value="narrative">Narrative</option>
                                <option value="data">Data</option>
                                <option value="classified">Classified</option>
                                <option value="gallery">Gallery</option>
                                <option value="quote">Quote</option>
                                <option value="reference">Reference</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Sort Order</label>
                            <input type="number" value={form.sort_order} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} className="arc-input text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Content</label>
                        <RichTextEditor
                            value={form.content}
                            onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
                            universeId={universeId}
                            universeSlug={universeSlug}
                            theme="arc"
                            minHeight={160}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={form.is_collapsible} onChange={(e) => setForm((prev) => ({ ...prev, is_collapsible: e.target.checked }))} className="size-3.5 rounded" />
                            <span className="text-xs text-[var(--arc-text-muted)]">Collapsible</span>
                        </label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingId(null)} className="arc-btn text-xs">Cancel</button>
                            <button type="button" onClick={handleSave} disabled={saving} className="arc-btn arc-btn-primary text-xs">
                                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sections List */}
            {sections.map((section) => (
                <div key={section.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">#{section.sort_order}</span>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-[var(--arc-text)]">{section.title}</div>
                        <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{section.section_type} · {section.slug}</div>
                    </div>
                    <button type="button" onClick={() => startEdit(section)} className="arc-btn arc-btn-sm text-[10px]">
                        <Edit3 className="size-3" /> Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(section.id)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}

            {sections.length === 0 && editingId === null && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No sections yet</div>
            )}
        </div>
    );
}

// ============================================================
// Records Editor (Unified for all sub-record types)
// ============================================================

function RecordsEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [activeRecordType, setActiveRecordType] = useState<RecordType>('infection-records');
    const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
    const [showForm, setShowForm] = useState(false);

    const recordTypeData = useMemo(() => {
        const map: Record<RecordType, { records: any[]; idField: string }> = {
            'infection-records': { records: entity.infection_records ?? [], idField: 'id' },
            'mutation-stages': { records: entity.mutation_stages ?? [], idField: 'id' },
            'affiliation-history': { records: entity.affiliation_history ?? [], idField: 'id' },
            'quotes': { records: entity.quotes ?? [], idField: 'id' },
            'power-profiles': { records: entity.power_profiles ?? [], idField: 'id' },
            'consciousness-records': { records: entity.consciousness_records ?? [], idField: 'id' },
            'intelligence-records': { records: entity.intelligence_records ?? [], idField: 'id' },
            'death-records': { records: entity.death_records ?? [], idField: 'id' },
            'transmission-participants': { records: entity.transmission_participants ?? [], idField: 'id' },
            'transmission-records': { records: entity.transmission_records ?? [], idField: 'id' },
        };
        return map;
    }, [entity]);

    const currentRecords = recordTypeData[activeRecordType].records;

    const handleSaved = () => {
        setShowForm(false);
        setEditingRecord(null);
        onRefresh();
    };

    const handleDelete = async (recordId: number) => {
        await api.deleteEntityRecord(universeId, entity.id, activeRecordType, recordId);
        onRefresh();
    };

    // Available record types with counts
    const recordTypes: { type: RecordType; label: string; count: number }[] = Object.entries(RECORD_TYPE_LABELS).map(
        ([type, label]) => ({
            type: type as RecordType,
            label,
            count: recordTypeData[type as RecordType].records.length,
        }),
    );

    return (
        <div className="space-y-3">
            {/* Record Type Selector */}
            <div className="flex flex-wrap gap-1 border-b border-[var(--arc-border)] pb-2">
                {recordTypes.map(({ type, label, count }) => (
                    <button
                        key={type}
                        onClick={() => { setActiveRecordType(type); setShowForm(false); setEditingRecord(null); }}
                        className={cn(
                            'rounded px-2 py-1 text-[10px] font-medium transition-colors',
                            activeRecordType === type
                                ? 'bg-[var(--arc-accent)] text-white'
                                : 'bg-[var(--arc-surface)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                        )}
                    >
                        {label}
                        {count > 0 && (
                            <span className={cn(
                                'ml-1 rounded-full px-1.5 text-[9px]',
                                activeRecordType === type ? 'bg-white/20' : 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]',
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Add Button */}
            {!showForm && (
                <button type="button" onClick={() => { setShowForm(true); setEditingRecord(null); }} className="arc-btn text-xs">
                    <Plus className="size-3" /> Add {RECORD_TYPE_LABELS[activeRecordType]}
                </button>
            )}

            {/* Record Form */}
            {showForm && (
                <RecordFormPanel
                    universeId={universeId}
                    entityId={entity.id}
                    recordType={activeRecordType}
                    record={editingRecord}
                    onSaved={handleSaved}
                    onCancel={() => { setShowForm(false); setEditingRecord(null); }}
                />
            )}

            {/* Records List */}
            {!showForm && currentRecords.map((record: any) => (
                <div key={record.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <RecordSummary record={record} recordType={activeRecordType} />
                    </div>
                    <button
                        type="button"
                        onClick={() => { setEditingRecord(record); setShowForm(true); }}
                        className="arc-btn arc-btn-sm text-[10px]"
                    >
                        <Edit3 className="size-3" /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}

            {!showForm && currentRecords.length === 0 && (
                <div className="py-4 text-center text-xs text-[var(--arc-text-muted)]">
                    No {RECORD_TYPE_LABELS[activeRecordType].toLowerCase()} records
                </div>
            )}
        </div>
    );
}

// ============================================================
// Record Summary (one-line display per record type)
// ============================================================

function RecordSummary({ record, recordType }: { record: any; recordType: RecordType }) {
    switch (recordType) {
        case 'infection-records':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">
                        {record.pathogen?.name ?? record.pathogen_name ?? 'Unknown pathogen'}
                    </div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {record.status} · {record.infection_method ?? ''}
                    </div>
                </>
            );
        case 'mutation-stages':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">Stage {record.stage_number}: {record.name}</div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">Threat: {record.threat_level ?? '?'}/10</div>
                </>
            );
        case 'affiliation-history':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">
                        {record.organization?.name ?? record.organization_name ?? 'Unknown org'}
                    </div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {record.role ?? ''} · {record.status}
                    </div>
                </>
            );
        case 'quotes':
            return (
                <div className="text-xs italic text-[var(--arc-text)]">"{(record.quote ?? '').slice(0, 100)}"</div>
            );
        case 'power-profiles':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">{record.name}</div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {record.category} · Lv.{record.power_level ?? '?'} · {record.status}
                    </div>
                </>
            );
        case 'consciousness-records':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">
                        {record.vessel?.name ?? 'Unknown vessel'}  {record.status}
                    </div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{record.transfer_method ?? ''}</div>
                </>
            );
        case 'intelligence-records':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">
                        {record.observer?.name ?? 'Unknown'} → {record.subject?.name ?? 'General'}
                    </div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{record.classification}</div>
                </>
            );
        case 'death-records':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">{record.death_type}</div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                        {record.cause_of_death ?? ''} {record.is_revived ? '· REVIVED' : ''}
                    </div>
                </>
            );
        case 'transmission-participants':
            return (
                <>
                    <div className="text-xs font-medium text-[var(--arc-text)]">{record.participant?.name ?? 'Unknown'}</div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{record.role} · {record.callsign ?? ''}</div>
                </>
            );
        case 'transmission-records':
            return (
                <>
                    <div className="text-xs text-[var(--arc-text)]">
                        <span className="font-medium">{record.speaker?.name ?? record.speaker_label ?? '???'}:</span>{' '}
                        {(record.content ?? '').slice(0, 80)}
                    </div>
                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{record.content_type}</div>
                </>
            );
        default:
            return <div className="text-xs text-[var(--arc-text)]">Record #{record.id}</div>;
    }
}

// ============================================================
// Attributes Editor
// ============================================================

function AttributesEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [definitions, setDefinitions] = useState<ApiAttributeDefinition[]>([]);
    const [attributes, setAttributes] = useState<ApiEntityAttribute[]>(entity.attributes ?? []);
    const [saving, setSaving] = useState(false);
    const [newDefId, setNewDefId] = useState<number | ''>('');
    const [newValue, setNewValue] = useState('');

    useEffect(() => {
        api.fetchAttributeDefinitions().then((res) => setDefinitions(res.data));
    }, []);

    // Filter definitions relevant to this entity type (or global ones with null entity_type_id)
    const relevantDefs = useMemo(() => {
        return definitions.filter(
            (d) => !d.meta_entity_type_id || d.meta_entity_type_id === entity.entity_type?.id,
        );
    }, [definitions, entity.entity_type?.id]);

    // Group definitions by group_name
    const groupedDefs = useMemo(() => {
        const map = new Map<string, ApiAttributeDefinition[]>();
        for (const def of relevantDefs) {
            const group = def.group_name || 'General';
            if (!map.has(group)) map.set(group, []);
            map.get(group)!.push(def);
        }
        return map;
    }, [relevantDefs]);

    // Track values in local state
    const [values, setValues] = useState<Map<number, string>>(() => {
        const m = new Map<number, string>();
        for (const attr of attributes) {
            m.set(attr.attribute_definition_id, attr.value ?? '');
        }
        return m;
    });

    useEffect(() => {
        const m = new Map<number, string>();
        for (const attr of (entity.attributes ?? [])) {
            m.set(attr.attribute_definition_id, attr.value ?? '');
        }
        setValues(m);
        setAttributes(entity.attributes ?? []);
    }, [entity.attributes]);

    const handleBulkSave = async () => {
        setSaving(true);
        const attrs: Record<string, unknown>[] = [];
        for (const [defId, val] of values) {
            if (val.trim()) {
                attrs.push({ attribute_definition_id: defId, value: val });
            }
        }
        try {
            await api.bulkUpdateEntityAttributes(universeId, entity.id, attrs);
            onRefresh();
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = async () => {
        if (!newDefId || !newValue.trim()) return;
        setSaving(true);
        try {
            await api.createEntityAttribute(universeId, entity.id, {
                attribute_definition_id: Number(newDefId),
                value: newValue.trim(),
            });
            setNewDefId('');
            setNewValue('');
            onRefresh();
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (attrId: number) => {
        await api.deleteEntityAttribute(universeId, entity.id, attrId);
        onRefresh();
    };

    // Defs that don't have attributes yet
    const unusedDefs = relevantDefs.filter((d) => !values.has(d.id));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">ATTRIBUTES</span>
                <button type="button" onClick={handleBulkSave} disabled={saving} className="arc-btn arc-btn-primary text-xs">
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    Save All
                </button>
            </div>

            {/* Existing attributes grouped */}
            {Array.from(groupedDefs.entries()).map(([groupName, defs]) => {
                const groupAttrs = defs.filter((d) => values.has(d.id));
                if (groupAttrs.length === 0) return null;
                return (
                    <div key={groupName} className="space-y-2">
                        <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">{groupName.toUpperCase()}</span>
                        {groupAttrs.map((def) => {
                            const attr = attributes.find((a) => a.attribute_definition_id === def.id);
                            return (
                                <div key={def.id} className="flex items-center gap-2">
                                    <label className="w-36 shrink-0 truncate text-xs text-[var(--arc-text-muted)]" title={def.name}>{def.name}</label>
                                    <input
                                        type="text"
                                        value={values.get(def.id) ?? ''}
                                        onChange={(e) => setValues((prev) => new Map(prev).set(def.id, e.target.value))}
                                        className="arc-input flex-1 text-xs"
                                        placeholder={def.default_value ?? ''}
                                    />
                                    {attr && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(attr.id)}
                                            className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Add new attribute */}
            {unusedDefs.length > 0 && (
                <div className="border-t border-[var(--arc-border)] pt-3">
                    <span className="arc-mono mb-2 block text-[9px] tracking-[0.12em] text-[var(--arc-text-muted)]">ADD ATTRIBUTE</span>
                    <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                            <select value={newDefId} onChange={(e) => setNewDefId(e.target.value ? Number(e.target.value) : '')} className="arc-input text-xs">
                                <option value="">Select definition...</option>
                                {unusedDefs.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.data_type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="arc-input text-xs" placeholder="Value" />
                        </div>
                        <button type="button" onClick={handleAdd} disabled={saving || !newDefId} className="arc-btn arc-btn-primary text-xs">
                            <Plus className="size-3" /> Add
                        </button>
                    </div>
                </div>
            )}

            {attributes.length === 0 && unusedDefs.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No attribute definitions available for this entity type</div>
            )}
        </div>
    );
}

// ============================================================
// Relations Editor
// ============================================================

const EMPTY_RELATION_FORM = {
    to_entity_id: null as number | null,
    relation_type_id: '' as number | '',
    description: '',
    context: '',
    fictional_start: '',
    fictional_end: '',
    status: 'active' as string,
    sort_order: 0,
};

function RelationsEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [relationTypes, setRelationTypes] = useState<ApiMetaRelationType[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_RELATION_FORM });

    useEffect(() => {
        api.fetchRelationTypes().then((res) => setRelationTypes(res.data));
    }, []);

    const outgoing = entity.outgoing_relations ?? [];
    const incoming = entity.incoming_relations ?? [];

    const resetForm = () => {
        setForm({ ...EMPTY_RELATION_FORM });
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (rel: ApiEntityRelation) => {
        setForm({
            to_entity_id: rel.to_entity_id,
            relation_type_id: rel.relation_type?.id ?? '',
            description: rel.description ?? '',
            context: rel.context ?? '',
            fictional_start: rel.fictional_start ?? '',
            fictional_end: rel.fictional_end ?? '',
            status: rel.status ?? 'active',
            sort_order: rel.sort_order ?? 0,
        });
        setEditingId(rel.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.to_entity_id || !form.relation_type_id) return;
        setSaving(true);
        try {
            const payload = {
                from_entity_id: entity.id,
                to_entity_id: form.to_entity_id,
                relation_type_id: Number(form.relation_type_id),
                description: form.description || null,
                context: form.context || null,
                fictional_start: form.fictional_start || null,
                fictional_end: form.fictional_end || null,
                status: form.status,
                sort_order: form.sort_order,
            };
            if (editingId) {
                await api.updateRelation(universeId, editingId, payload);
            } else {
                await api.createRelation(universeId, payload);
            }
            resetForm();
            onRefresh();
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (relationId: number) => {
        await api.deleteRelation(universeId, relationId);
        onRefresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">RELATIONS</span>
                {!showForm && (
                    <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className="arc-btn text-xs">
                        <Plus className="size-3" /> Add Relation
                    </button>
                )}
            </div>

            {/* Add / Edit Relation Form */}
            {showForm && (
                <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3 space-y-3">
                    <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        {editingId ? 'EDIT RELATION' : 'NEW RELATION'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Target Entity</label>
                            <EntityPicker
                                universeId={universeId}
                                value={form.to_entity_id}
                                onChange={(id) => setForm((prev) => ({ ...prev, to_entity_id: id }))}
                                excludeIds={[entity.id]}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Relation Type</label>
                            <select value={form.relation_type_id} onChange={(e) => setForm((prev) => ({ ...prev, relation_type_id: e.target.value ? Number(e.target.value) : '' }))} className="arc-input text-xs">
                                <option value="">Select type...</option>
                                {relationTypes.map((rt) => (
                                    <option key={rt.id} value={rt.id}>{rt.name}{rt.inverse_name ? ` / ${rt.inverse_name}` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Status</label>
                            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="arc-input text-xs">
                                <option value="active">Active</option>
                                <option value="former">Former</option>
                                <option value="unknown">Unknown</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Description</label>
                            <input type="text" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="arc-input text-xs" placeholder="Short description..." />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Fictional Start</label>
                            <input type="text" value={form.fictional_start} onChange={(e) => setForm((prev) => ({ ...prev, fictional_start: e.target.value }))} className="arc-input text-xs" placeholder="e.g. Year 1, Chapter 3..." />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Fictional End</label>
                            <input type="text" value={form.fictional_end} onChange={(e) => setForm((prev) => ({ ...prev, fictional_end: e.target.value }))} className="arc-input text-xs" placeholder="e.g. Year 5, Present..." />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Context</label>
                            <textarea value={form.context} onChange={(e) => setForm((prev) => ({ ...prev, context: e.target.value }))} className="arc-input text-xs min-h-[60px]" placeholder="Additional context about this relation..." />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Sort Order</label>
                            <input type="number" value={form.sort_order} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))} className="arc-input text-xs" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className="arc-btn text-xs">Cancel</button>
                        <button type="button" onClick={handleSave} disabled={saving || !form.to_entity_id || !form.relation_type_id} className="arc-btn arc-btn-primary text-xs">
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                            {editingId ? 'Save' : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            {/* Outgoing Relations */}
            {outgoing.length > 0 && (
                <div className="space-y-2">
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">OUTGOING ({outgoing.length})</span>
                    {outgoing.map((rel) => (
                        <div key={rel.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-[var(--arc-text)]">
                                    {entity.name} → <span className="text-[var(--arc-accent)]">{rel.to_entity?.name ?? '?'}</span>
                                </div>
                                <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                    {rel.relation_type?.name ?? 'Unknown'} · {rel.status ?? 'active'}
                                    {rel.description ? ` · ${rel.description}` : ''}
                                    {rel.fictional_start ? ` · ${rel.fictional_start}` : ''}
                                    {rel.fictional_end ? ` – ${rel.fictional_end}` : ''}
                                </div>
                            </div>
                            <button type="button" onClick={() => startEdit(rel)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-accent)]">
                                <Edit3 className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(rel.id)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Incoming Relations */}
            {incoming.length > 0 && (
                <div className="space-y-2">
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">INCOMING ({incoming.length})</span>
                    {incoming.map((rel) => (
                        <div key={rel.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-[var(--arc-text)]">
                                    <span className="text-[var(--arc-accent)]">{rel.from_entity?.name ?? '?'}</span> → {entity.name}
                                </div>
                                <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                    {rel.relation_type?.inverse_name ?? rel.relation_type?.name ?? 'Unknown'} · {rel.status ?? 'active'}
                                    {rel.description ? ` · ${rel.description}` : ''}
                                    {rel.fictional_start ? ` · ${rel.fictional_start}` : ''}
                                    {rel.fictional_end ? ` – ${rel.fictional_end}` : ''}
                                </div>
                            </div>
                            <button type="button" onClick={() => startEdit(rel)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-accent)]">
                                <Edit3 className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(rel.id)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {outgoing.length === 0 && incoming.length === 0 && !showForm && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No relations yet</div>
            )}
        </div>
    );
}

// ============================================================
// Taxonomy Editor (Tags + Categories)
// ============================================================

function TaxonomyEditor({
    universeId,
    entity,
    onUpdate,
}: {
    universeId: number;
    entity: ApiEntity;
    onUpdate: (tags: ApiTag[], categories: ApiCategory[]) => void;
}) {
    const [allTags, setAllTags] = useState<ApiTag[]>([]);
    const [allCategories, setAllCategories] = useState<ApiCategory[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set((entity.tags ?? []).map((t) => t.id)));
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set((entity.categories ?? []).map((c) => c.id)));
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        Promise.all([api.fetchTags(), api.fetchCategories(universeId)]).then(([tagsRes, catsRes]) => {
            setAllTags(tagsRes.data);
            setAllCategories(catsRes.data);
        });
    }, [universeId]);

    const toggleTag = (id: number) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setDirty(true);
    };

    const toggleCategory = (id: number) => {
        setSelectedCategoryIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.updateEntity(universeId, entity.id, {
                tag_ids: Array.from(selectedTagIds),
                category_ids: Array.from(selectedCategoryIds),
            });
            onUpdate(res.data.tags ?? [], res.data.categories ?? []);
            setDirty(false);
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">TAGS & CATEGORIES</span>
                {dirty && (
                    <button type="button" onClick={handleSave} disabled={saving} className="arc-btn arc-btn-primary text-xs">
                        {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        Save
                    </button>
                )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">TAGS</span>
                {allTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {allTags.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={cn(
                                    'rounded px-2.5 py-1 text-[10px] font-medium transition-colors',
                                    selectedTagIds.has(tag.id)
                                        ? 'bg-[var(--arc-accent)] text-white'
                                        : 'bg-[var(--arc-surface)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                                )}
                                style={selectedTagIds.has(tag.id) && tag.color ? { backgroundColor: tag.color } : undefined}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-[var(--arc-text-muted)]">No tags available</div>
                )}
            </div>

            {/* Categories */}
            <div className="space-y-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">CATEGORIES</span>
                {allCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {allCategories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={cn(
                                    'rounded px-2.5 py-1 text-[10px] font-medium transition-colors',
                                    selectedCategoryIds.has(cat.id)
                                        ? 'bg-[var(--arc-accent)] text-white'
                                        : 'bg-[var(--arc-surface)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-[var(--arc-text-muted)]">No categories available</div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Timelines Editor
// ============================================================

function TimelinesEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [allTimelines, setAllTimelines] = useState<ApiTimeline[]>([]);
    const [attached, setAttached] = useState<ApiTimelinePivot[]>(entity.timelines ?? []);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{
        timeline_id: number | '';
        role: string;
        notes: string;
        fictional_start: string;
        fictional_end: string;
    }>({ timeline_id: '', role: '', notes: '', fictional_start: '', fictional_end: '' });

    useEffect(() => {
        api.fetchTimelines(universeId).then((res) => setAllTimelines(res.data));
    }, [universeId]);

    useEffect(() => {
        setAttached(entity.timelines ?? []);
    }, [entity.timelines]);

    const attachedIds = new Set(attached.map((t) => t.id));
    const availableTimelines = allTimelines.filter((t) => !attachedIds.has(t.id));

    const handleAttach = async () => {
        if (!form.timeline_id) return;
        setSaving(true);
        try {
            await api.attachEntityToTimeline(universeId, Number(form.timeline_id), {
                entity_id: entity.id,
                role: form.role || undefined,
                notes: form.notes || undefined,
                fictional_start: form.fictional_start || undefined,
                fictional_end: form.fictional_end || undefined,
            });
            setShowForm(false);
            setForm({ timeline_id: '', role: '', notes: '', fictional_start: '', fictional_end: '' });
            onRefresh();
        } catch {
            // ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDetach = async (timelineId: number) => {
        await api.detachEntityFromTimeline(universeId, timelineId, entity.id);
        onRefresh();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">TIMELINE MEMBERSHIPS</span>
                {!showForm && (
                    <button type="button" onClick={() => setShowForm(true)} className="arc-btn text-xs">
                        <Plus className="size-3" /> Add to Timeline
                    </button>
                )}
            </div>

            {/* Add form */}
            {showForm && (
                <div className="space-y-2 rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">TIMELINE *</label>
                            <select
                                value={form.timeline_id}
                                onChange={(e) => setForm((p) => ({ ...p, timeline_id: e.target.value === '' ? '' : Number(e.target.value) }))}
                                className="arc-input w-full text-xs"
                            >
                                <option value=""> select </option>
                                {availableTimelines.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">ROLE</label>
                            <input
                                type="text"
                                value={form.role}
                                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                                placeholder="e.g. protagonist"
                                className="arc-input w-full text-xs"
                            />
                        </div>
                        <div>
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">FICTIONAL START</label>
                            <input
                                type="text"
                                value={form.fictional_start}
                                onChange={(e) => setForm((p) => ({ ...p, fictional_start: e.target.value }))}
                                placeholder="e.g. 1998"
                                className="arc-input w-full text-xs"
                            />
                        </div>
                        <div>
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">FICTIONAL END</label>
                            <input
                                type="text"
                                value={form.fictional_end}
                                onChange={(e) => setForm((p) => ({ ...p, fictional_end: e.target.value }))}
                                placeholder="e.g. 1998"
                                className="arc-input w-full text-xs"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">NOTES</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                rows={2}
                                className="arc-input w-full text-xs"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={handleAttach} disabled={!form.timeline_id || saving} className="arc-btn arc-btn-primary text-xs">
                            <Save className="size-3" /> {saving ? 'Saving…' : 'Attach'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="arc-btn text-xs">
                            <X className="size-3" /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Attached timelines */}
            {attached.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-[var(--arc-accent)]" />
                    <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-[var(--arc-text)]">{t.name}</span>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {t.pivot.role && (
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">role: {t.pivot.role}</span>
                            )}
                            {t.pivot.fictional_start && (
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                    {t.pivot.fictional_start}{t.pivot.fictional_end ? ` → ${t.pivot.fictional_end}` : ''}
                                </span>
                            )}
                            {t.pivot.notes && (
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)] italic">{t.pivot.notes}</span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleDetach(t.id)}
                        className="shrink-0 rounded p-1 text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)]"
                        title="Remove from timeline"
                    >
                        <Trash2 className="size-3" />
                    </button>
                </div>
            ))}

            {attached.length === 0 && !showForm && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">Not part of any timeline</div>
            )}
        </div>
    );
}

// ============================================================
// Media Sources Editor
// ============================================================

function MediaSourcesEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [allMediaSources, setAllMediaSources] = useState<ApiMediaSource[]>([]);
    const [attached, setAttached] = useState<ApiMediaSourcePivot[]>(entity.media_sources ?? []);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{
        media_source_id: number | '';
        role: string;
        description: string;
    }>({ media_source_id: '', role: '', description: '' });

    useEffect(() => {
        api.fetchMediaSources(universeId).then((res) => setAllMediaSources(res.data));
    }, [universeId]);

    useEffect(() => {
        setAttached(entity.media_sources ?? []);
    }, [entity.media_sources]);

    const attachedIds = new Set(attached.map((ms) => ms.id));
    const availableMediaSources = allMediaSources.filter((ms) => !attachedIds.has(ms.id));

    const handleAttach = async () => {
        if (!form.media_source_id) return;
        setSaving(true);
        try {
            await api.attachEntityToMediaSource(universeId, Number(form.media_source_id), {
                entity_id: entity.id,
                role: form.role || undefined,
                description: form.description || undefined,
            });
            setShowForm(false);
            setForm({ media_source_id: '', role: '', description: '' });
            onRefresh();
        } catch {
            // ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDetach = async (mediaSourceId: number) => {
        await api.detachEntityFromMediaSource(universeId, mediaSourceId, entity.id);
        onRefresh();
    };

    const MEDIA_TYPE_LABELS: Record<string, string> = {
        game: 'GAME', film: 'FILM', series: 'SERIES', novel: 'NOVEL',
        comic: 'COMIC', cg_film: 'CG FILM', audio: 'AUDIO', other: 'OTHER',
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">MEDIA APPEARANCES</span>
                {!showForm && (
                    <button type="button" onClick={() => setShowForm(true)} className="arc-btn text-xs">
                        <Plus className="size-3" /> Add Appearance
                    </button>
                )}
            </div>

            {/* Add form */}
            {showForm && (
                <div className="space-y-2 rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">MEDIA SOURCE *</label>
                            <select
                                value={form.media_source_id}
                                onChange={(e) => setForm((p) => ({ ...p, media_source_id: e.target.value === '' ? '' : Number(e.target.value) }))}
                                className="arc-input w-full text-xs"
                            >
                                <option value=""> select </option>
                                {availableMediaSources.map((ms) => (
                                    <option key={ms.id} value={ms.id}>
                                        [{MEDIA_TYPE_LABELS[ms.media_type] ?? ms.media_type.toUpperCase()}] {ms.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">ROLE</label>
                            <input
                                type="text"
                                value={form.role}
                                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                                placeholder="e.g. playable character"
                                className="arc-input w-full text-xs"
                            />
                        </div>
                        <div>
                            <label className="arc-mono mb-1 block text-[9px] font-semibold tracking-wider text-[var(--arc-text-muted)]">DESCRIPTION</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="optional notes"
                                className="arc-input w-full text-xs"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={handleAttach} disabled={!form.media_source_id || saving} className="arc-btn arc-btn-primary text-xs">
                            <Save className="size-3" /> {saving ? 'Saving…' : 'Attach'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="arc-btn text-xs">
                            <X className="size-3" /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Attached media sources */}
            {attached.map((ms) => (
                <div key={ms.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <span className="arc-mono shrink-0 rounded border border-[var(--arc-border)] px-1 py-0.5 text-[8px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                        {MEDIA_TYPE_LABELS[ms.media_type] ?? ms.media_type.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-[var(--arc-text)]">{ms.name}</span>
                        {(ms.pivot.role || ms.pivot.description) && (
                            <div className="mt-0.5 flex gap-3">
                                {ms.pivot.role && (
                                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">as {ms.pivot.role}</span>
                                )}
                                {ms.pivot.description && (
                                    <span className="arc-mono text-[9px] italic text-[var(--arc-text-muted)]">{ms.pivot.description}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleDetach(ms.id)}
                        className="shrink-0 rounded p-1 text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)]"
                        title="Remove appearance"
                    >
                        <Trash2 className="size-3" />
                    </button>
                </div>
            ))}

            {attached.length === 0 && !showForm && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No media appearances recorded</div>
            )}
        </div>
    );
}

// ============================================================
// Maps Editor
// ============================================================

function MapsEditor({
    universeId,
    entity,
    onRefresh,
}: {
    universeId: number;
    entity: ApiEntity;
    onRefresh: () => void;
}) {
    const [maps, setMaps] = useState(entity.maps ?? []);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const { openWindow } = useWindowStore();

    useEffect(() => {
        setMaps(entity.maps ?? []);
    }, [entity.maps]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            await api.createEntityMap(universeId, entity.id, { name: newName });
            setNewName('');
            setCreating(false);
            onRefresh();
        } catch {
            // errors are non-blocking in the editor
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (mapId: number) => {
        try {
            await api.deleteEntityMap(universeId, entity.id, mapId);
            onRefresh();
        } catch {
            // silent
        }
    };

    const openMapEditor = (mapId: number, mapName: string) => {
        openWindow({
            type: 'map-editor',
            title: `EDIT MAP  ${mapName.toUpperCase()}`,
            icon: 'ME',
            props: {
                key: `map-editor-${universeId}-${entity.id}-${mapId}`,
                universeId,
                entityId: entity.id,
                mapId,
            },
            size: { width: 900, height: 650 },
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    ENTITY MAPS ({maps.length})
                </h3>
                <button
                    className="flex items-center gap-1 rounded bg-[var(--arc-accent)]/10 px-2 py-1 text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20"
                    onClick={() => setCreating(true)}
                >
                    <Plus className="size-3" />
                    <span className="arc-mono text-[9px] font-semibold tracking-wider">NEW MAP</span>
                </button>
            </div>

            {creating && (
                <div className="flex items-center gap-2 rounded border border-[var(--arc-accent)]/20 bg-[var(--arc-surface)] p-3">
                    <input
                        type="text"
                        className="arc-input flex-1 text-xs"
                        placeholder="Map name (e.g. Spencer Mansion)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        autoFocus
                    />
                    <button
                        className="arc-mono flex items-center gap-1 rounded bg-[var(--arc-accent)] px-2 py-1 text-[9px] font-bold tracking-wider text-[var(--arc-bg)] hover:bg-[var(--arc-accent)]/80"
                        disabled={!newName.trim() || saving}
                        onClick={handleCreate}
                    >
                        {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        CREATE
                    </button>
                    <button
                        className="rounded p-1 text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                        onClick={() => { setCreating(false); setNewName(''); }}
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {maps.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <MapPin className="size-4 shrink-0 text-[var(--arc-accent)]" />
                    <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-[var(--arc-text)]">{m.name}</span>
                        {m.description && (
                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{m.description}</span>
                        )}
                        <span className="arc-mono block text-[8px] text-[var(--arc-text-muted)]">
                            {m.floors?.length ?? m.floors_count ?? 0} floor(s)
                        </span>
                    </div>
                    <button
                        className="arc-mono shrink-0 rounded bg-[var(--arc-accent)]/10 px-2 py-1 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20"
                        onClick={() => openMapEditor(m.id, m.name)}
                    >
                        EDIT
                    </button>
                    <button
                        className="shrink-0 rounded p-1 text-[var(--arc-text-muted)] hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)]"
                        title="Delete map"
                        onClick={() => handleDelete(m.id)}
                    >
                        <Trash2 className="size-3" />
                    </button>
                </div>
            ))}

            {maps.length === 0 && !creating && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No maps created yet</div>
            )}
        </div>
    );
}
