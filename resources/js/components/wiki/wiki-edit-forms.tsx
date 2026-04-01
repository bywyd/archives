import { Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import type { ApiMediaSource, ApiMetaEntityStatus, ApiMetaEntityType, ApiTimeline } from '@/types/api';

// ============================================================
// Shared form primitives (wiki-themed)
// ============================================================

function WikiFormField({
    label,
    error,
    required,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
    );
}

const fieldClass =
    'w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-neutral-900';

function FormActions({
    saving,
    onCancel,
    submitLabel = 'Save',
}: {
    saving: boolean;
    onCancel: () => void;
    submitLabel?: string;
}) {
    return (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
                <X className="size-3" />
                Cancel
            </button>
            <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                {submitLabel}
            </button>
        </div>
    );
}

function parseErrors(err: any): Record<string, string> {
    if (err.body?.errors) {
        const e: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.body.errors)) {
            e[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        return e;
    }
    return { _form: err.body?.message || err.message || 'Failed to save' };
}

// ============================================================
// Entity Basic Info Form
// ============================================================

export function EntityBasicInfoForm({
    universeId,
    entity,
    onSaved,
    onCancel,
}: {
    universeId: number;
    entity: {
        id: number;
        name: string;
        short_description?: string | null;
        content?: string | null;
        entity_type?: { id: number; name: string } | null;
        entity_status?: { id: number; name: string } | null;
        is_featured?: boolean;
    };
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        name: entity.name,
        short_description: entity.short_description ?? '',
        content: entity.content ?? '',
        entity_type_id: entity.entity_type?.id ?? '',
        entity_status_id: entity.entity_status?.id ?? '',
        is_featured: entity.is_featured ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [entityTypes, setEntityTypes] = useState<ApiMetaEntityType[]>([]);
    const [entityStatuses, setEntityStatuses] = useState<ApiMetaEntityStatus[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);

    useEffect(() => {
        Promise.all([api.fetchEntityTypes(), api.fetchEntityStatuses()])
            .then(([typesRes, statusesRes]) => {
                setEntityTypes(typesRes.data);
                setEntityStatuses(statusesRes.data);
            })
            .catch(() => {})
            .finally(() => setLoadingMeta(false));
    }, []);

    const setField = (name: string, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [name]: value }));
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
        try {
            await api.updateEntity(universeId, entity.id, {
                name: form.name,
                short_description: form.short_description || null,
                content: form.content || null,
                entity_type_id: form.entity_type_id || null,
                entity_status_id: form.entity_status_id || null,
                is_featured: form.is_featured,
            });
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Name" error={errors.name} required>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClass} required />
                </WikiFormField>
                <WikiFormField label="Short Description" error={errors.short_description}>
                    <input type="text" value={form.short_description} onChange={(e) => setField('short_description', e.target.value)} className={fieldClass} maxLength={255} />
                </WikiFormField>
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Entity Type" error={errors.entity_type_id}>
                        {loadingMeta ? (
                            <div className={`${fieldClass} flex items-center gap-1 text-slate-400`}><Loader2 className="size-3 animate-spin" /> Loading…</div>
                        ) : (
                            <select value={form.entity_type_id} onChange={(e) => setField('entity_type_id', e.target.value)} className={fieldClass}>
                                <option value="">- None -</option>
                                {entityTypes.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                    </WikiFormField>
                    <WikiFormField label="Status" error={errors.entity_status_id}>
                        {loadingMeta ? (
                            <div className={`${fieldClass} flex items-center gap-1 text-slate-400`}><Loader2 className="size-3 animate-spin" /> Loading…</div>
                        ) : (
                            <select value={form.entity_status_id} onChange={(e) => setField('entity_status_id', e.target.value)} className={fieldClass}>
                                <option value="">- None -</option>
                                {entityStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        )}
                    </WikiFormField>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id="is_featured"
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) => setField('is_featured', e.target.checked)}
                        className="size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_featured" className="text-[11px] font-medium text-slate-500 cursor-pointer">
                        Featured entity
                    </label>
                </div>
                <WikiFormField label="Overview (HTML)" error={errors.content}>
                    <textarea value={form.content} onChange={(e) => setField('content', e.target.value)} rows={8} className={`${fieldClass} font-mono text-xs`} />
                </WikiFormField>
            </div>
            <FormActions saving={saving} onCancel={onCancel} />
        </form>
    );
}

// ============================================================
// Wiki Section Form (create & edit)
// ============================================================

export function WikiSectionForm({
    universeId,
    universeSlug,
    entityId,
    section,
    nextSortOrder,
    onSaved,
    onCancel,
}: {
    universeId: number;
    universeSlug?: string;
    entityId: number;
    section?: { id: number; title: string; slug: string; content: string | null; section_type: string; sort_order: number; is_collapsible?: boolean };
    nextSortOrder?: number;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const isNew = !section;
    const [form, setForm] = useState({
        title: section?.title ?? '',
        slug: section?.slug ?? '',
        content: section?.content ?? '',
        section_type: section?.section_type ?? 'narrative',
        sort_order: section?.sort_order ?? (nextSortOrder ?? 0),
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [autoSlug, setAutoSlug] = useState(isNew);

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const setField = (name: string, value: string | number) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'title' && autoSlug) next.slug = slugify(String(value));
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
        const payload = { ...form, slug: form.slug || slugify(form.title) };
        try {
            if (isNew) {
                await api.createEntitySection(universeId, entityId, payload);
            } else {
                await api.updateEntitySection(universeId, entityId, section.id, payload);
            }
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Title" error={errors.title} required>
                        <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} className={fieldClass} required />
                    </WikiFormField>
                    <WikiFormField label="Slug" error={errors.slug}>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => {
                                setAutoSlug(false);
                                setField('slug', e.target.value);
                            }}
                            className={fieldClass}
                        />
                    </WikiFormField>
                    <WikiFormField label="Type" error={errors.section_type}>
                        <select value={form.section_type} onChange={(e) => setField('section_type', e.target.value)} className={fieldClass}>
                            <option value="narrative">Narrative</option>
                            <option value="data">Data</option>
                            <option value="classified">Classified</option>
                            <option value="gallery">Gallery</option>
                            <option value="quote">Quote</option>
                            <option value="reference">Reference</option>
                        </select>
                    </WikiFormField>
                    <WikiFormField label="Sort Order" error={errors.sort_order}>
                        <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value))} className={fieldClass} />
                    </WikiFormField>
                </div>
                <WikiFormField label="Content" error={errors.content}>
                    <RichTextEditor
                        value={form.content}
                        onChange={(html) => setField('content', html)}
                        universeId={universeId}
                        universeSlug={universeSlug ?? ''}
                        theme="wiki"
                    />
                </WikiFormField>
            </div>
            <FormActions saving={saving} onCancel={onCancel} submitLabel={isNew ? 'Create Section' : 'Save Section'} />
        </form>
    );
}

// ============================================================
// Timeline Basic Info Form
// ============================================================

export function TimelineBasicInfoForm({
    universeId,
    timeline,
    onSaved,
    onCancel,
}: {
    universeId: number;
    timeline: { id: number; name: string; description: string | null };
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        name: timeline.name,
        description: timeline.description ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setField = (name: string, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
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
        try {
            await api.updateTimeline(universeId, timeline.id, {
                name: form.name,
                description: form.description || null,
            });
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Name" error={errors.name} required>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClass} required />
                </WikiFormField>
                <WikiFormField label="Description" error={errors.description}>
                    <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} className={fieldClass} />
                </WikiFormField>
            </div>
            <FormActions saving={saving} onCancel={onCancel} />
        </form>
    );
}

// ============================================================
// Timeline Event Form (create & edit)
// ============================================================

const EVENT_TYPE_OPTIONS = [
    { value: 'incident', label: 'Incident' },
    { value: 'discovery', label: 'Discovery' },
    { value: 'founding', label: 'Founding' },
    { value: 'death', label: 'Death' },
    { value: 'battle', label: 'Battle' },
    { value: 'outbreak', label: 'Outbreak' },
    { value: 'political', label: 'Political' },
    { value: 'research', label: 'Research' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
    { value: 'extinction-level', label: 'Extinction Level' },
];

export function TimelineEventForm({
    universeId,
    timelineId,
    event,
    nextSortOrder,
    onSaved,
    onCancel,
}: {
    universeId: number;
    timelineId: number;
    event?: { id: number; title: string; description: string | null; event_type: string | null; severity: string | null; fictional_date: string | null; sort_order: number };
    nextSortOrder?: number;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const isNew = !event;
    const [form, setForm] = useState({
        title: event?.title ?? '',
        description: event?.description ?? '',
        event_type: event?.event_type ?? '',
        severity: event?.severity ?? '',
        fictional_date: event?.fictional_date ?? '',
        sort_order: event?.sort_order ?? (nextSortOrder ?? 0),
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setField = (name: string, value: string | number) => {
        setForm((prev) => ({ ...prev, [name]: value }));
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
            title: form.title,
            description: form.description || null,
            event_type: form.event_type || null,
            severity: form.severity || null,
            fictional_date: form.fictional_date || null,
            sort_order: form.sort_order,
        };
        try {
            if (isNew) {
                await api.createTimelineEvent(universeId, timelineId, payload);
            } else {
                await api.updateTimelineEvent(universeId, timelineId, event.id, payload);
            }
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Title" error={errors.title} required>
                    <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} className={fieldClass} required />
                </WikiFormField>
                <WikiFormField label="Description" error={errors.description}>
                    <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} className={fieldClass} />
                </WikiFormField>
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Event Type" error={errors.event_type}>
                        <select value={form.event_type} onChange={(e) => setField('event_type', e.target.value)} className={fieldClass}>
                            <option value="">Select type…</option>
                            {EVENT_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </WikiFormField>
                    <WikiFormField label="Severity" error={errors.severity}>
                        <select value={form.severity} onChange={(e) => setField('severity', e.target.value)} className={fieldClass}>
                            <option value="">Select severity…</option>
                            {SEVERITY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </WikiFormField>
                    <WikiFormField label="Fictional Date" error={errors.fictional_date}>
                        <input type="text" value={form.fictional_date} onChange={(e) => setField('fictional_date', e.target.value)} className={fieldClass} placeholder="e.g., July 1998" />
                    </WikiFormField>
                    <WikiFormField label="Sort Order" error={errors.sort_order}>
                        <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value))} className={fieldClass} />
                    </WikiFormField>
                </div>
            </div>
            <FormActions saving={saving} onCancel={onCancel} submitLabel={isNew ? 'Create Event' : 'Save Event'} />
        </form>
    );
}

// ============================================================
// Media Source Basic Info Form
// ============================================================

export function MediaSourceBasicInfoForm({
    universeId,
    mediaSource,
    onSaved,
    onCancel,
}: {
    universeId: number;
    mediaSource: { id: number; name: string; description: string | null; media_type: string; release_date: string | null };
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        name: mediaSource.name,
        description: mediaSource.description ?? '',
        media_type: mediaSource.media_type,
        release_date: mediaSource.release_date ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setField = (name: string, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
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
        try {
            await api.updateMediaSource(universeId, mediaSource.id, {
                name: form.name,
                description: form.description || null,
                media_type: form.media_type,
                release_date: form.release_date || null,
            });
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Name" error={errors.name} required>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClass} required />
                </WikiFormField>
                <WikiFormField label="Description" error={errors.description}>
                    <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} className={fieldClass} />
                </WikiFormField>
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Media Type" error={errors.media_type} required>
                        <select value={form.media_type} onChange={(e) => setField('media_type', e.target.value)} className={fieldClass} required>
                            <option value="game">Game</option>
                            <option value="movie">Movie</option>
                            <option value="series">Series</option>
                            <option value="anime">Anime</option>
                            <option value="manga">Manga</option>
                            <option value="novel">Novel</option>
                            <option value="comic">Comic</option>
                            <option value="other">Other</option>
                        </select>
                    </WikiFormField>
                    <WikiFormField label="Release Date" error={errors.release_date}>
                        <input type="text" value={form.release_date} onChange={(e) => setField('release_date', e.target.value)} className={fieldClass} placeholder="e.g., 1996-03-22" />
                    </WikiFormField>
                </div>
            </div>
            <FormActions saving={saving} onCancel={onCancel} />
        </form>
    );
}

// ============================================================
// Attach Timeline Form (entity → timeline via pivot)
// ============================================================

export function AttachTimelineForm({
    universeId,
    entityId,
    onSaved,
    onCancel,
}: {
    universeId: number;
    entityId: number;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        timeline_id: '',
        role: '',
        fictional_start: '',
        fictional_end: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [timelines, setTimelines] = useState<ApiTimeline[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetchTimelines(universeId)
            .then((res) => setTimelines(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [universeId]);

    const setField = (name: string, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.timeline_id) { setErrors({ timeline_id: 'Select a timeline' }); return; }
        setSaving(true);
        setErrors({});
        try {
            await api.attachEntityToTimeline(universeId, Number(form.timeline_id), {
                entity_id: entityId,
                role: form.role || undefined,
                fictional_start: form.fictional_start || undefined,
                fictional_end: form.fictional_end || undefined,
                notes: form.notes || undefined,
            });
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Timeline" error={errors.timeline_id} required>
                    {loading ? (
                        <div className={`${fieldClass} flex items-center gap-1 text-slate-400`}><Loader2 className="size-3 animate-spin" /> Loading…</div>
                    ) : (
                        <select value={form.timeline_id} onChange={(e) => setField('timeline_id', e.target.value)} className={fieldClass} required>
                            <option value="">Select a timeline…</option>
                            {timelines.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}
                </WikiFormField>
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Role" error={errors.role}>
                        <input type="text" value={form.role} onChange={(e) => setField('role', e.target.value)} className={fieldClass} placeholder="e.g., protagonist" />
                    </WikiFormField>
                    <WikiFormField label="Fictional Start" error={errors.fictional_start}>
                        <input type="text" value={form.fictional_start} onChange={(e) => setField('fictional_start', e.target.value)} className={fieldClass} placeholder="e.g., July 1998" />
                    </WikiFormField>
                    <WikiFormField label="Fictional End" error={errors.fictional_end}>
                        <input type="text" value={form.fictional_end} onChange={(e) => setField('fictional_end', e.target.value)} className={fieldClass} placeholder="e.g., September 1998" />
                    </WikiFormField>
                </div>
                <WikiFormField label="Notes" error={errors.notes}>
                    <input type="text" value={form.notes} onChange={(e) => setField('notes', e.target.value)} className={fieldClass} />
                </WikiFormField>
            </div>
            <FormActions saving={saving} onCancel={onCancel} submitLabel="Attach to Timeline" />
        </form>
    );
}

// ============================================================
// Attach Media Source Form (entity → media source via pivot)
// ============================================================

export function AttachMediaSourceForm({
    universeId,
    entityId,
    onSaved,
    onCancel,
}: {
    universeId: number;
    entityId: number;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        media_source_id: '',
        role: '',
        description: '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mediaSources, setMediaSources] = useState<ApiMediaSource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetchMediaSources(universeId)
            .then((res) => setMediaSources(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [universeId]);

    const setField = (name: string, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.media_source_id) { setErrors({ media_source_id: 'Select a media source' }); return; }
        setSaving(true);
        setErrors({});
        try {
            await api.attachEntityToMediaSource(universeId, Number(form.media_source_id), {
                entity_id: entityId,
                role: form.role || undefined,
                description: form.description || undefined,
            });
            onSaved();
        } catch (err: any) {
            setErrors(parseErrors(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
            {errors._form && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors._form}</div>
            )}
            <div className="space-y-3">
                <WikiFormField label="Media Source" error={errors.media_source_id} required>
                    {loading ? (
                        <div className={`${fieldClass} flex items-center gap-1 text-slate-400`}><Loader2 className="size-3 animate-spin" /> Loading…</div>
                    ) : (
                        <select value={form.media_source_id} onChange={(e) => setField('media_source_id', e.target.value)} className={fieldClass} required>
                            <option value="">Select a media source…</option>
                            {mediaSources.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    )}
                </WikiFormField>
                <div className="grid grid-cols-2 gap-3">
                    <WikiFormField label="Role" error={errors.role}>
                        <input type="text" value={form.role} onChange={(e) => setField('role', e.target.value)} className={fieldClass} placeholder="e.g., playable character" />
                    </WikiFormField>
                    <WikiFormField label="Description" error={errors.description}>
                        <input type="text" value={form.description} onChange={(e) => setField('description', e.target.value)} className={fieldClass} />
                    </WikiFormField>
                </div>
            </div>
            <FormActions saving={saving} onCancel={onCancel} submitLabel="Attach to Media Source" />
        </form>
    );
}
