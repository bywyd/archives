import {
    AlertCircle,
    Calendar,
    Clock,
    Edit3,
    Loader2,
    Plus,
    Save,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EntityPicker } from '@/components/archives/entity-picker';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiTimeline, ApiTimelineEvent } from '@/types/api';

type Props = {
    universeId: number;
    timelineId?: number;
};

type EditorTab = 'basic' | 'events';

export function TimelineEditor({ universeId, timelineId }: Props) {
    const [timeline, setTimeline] = useState<ApiTimeline | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EditorTab>('basic');
    const isNew = !timelineId;

    useEffect(() => {
        if (!isNew && timelineId) {
            setLoading(true);
            api.fetchTimeline(universeId, timelineId)
                .then((res) => setTimeline(res.data))
                .catch((err) => setError(err.message || 'Failed to load timeline'))
                .finally(() => setLoading(false));
        }
    }, [universeId, timelineId, isNew]);

    const refreshTimeline = useCallback(() => {
        if (timeline?.id) {
            api.fetchTimeline(universeId, timeline.id).then((res) => setTimeline(res.data));
        }
    }, [universeId, timeline?.id]);

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-xs tracking-widest text-[var(--arc-text-muted)]">LOADING...</span>
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
            { id: 'events' as EditorTab, label: 'Events', icon: <Calendar className="size-3.5" /> },
        ]),
    ];

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Clock className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        {isNew ? 'NEW TIMELINE' : 'EDIT TIMELINE'}
                    </span>
                    {timeline && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                             {timeline.name}
                        </span>
                    )}
                </div>
            </div>

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

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="p-4">
                    {activeTab === 'basic' && (
                        <TimelineBasicForm
                            universeId={universeId}
                            timeline={timeline}
                            onSaved={(saved) => setTimeline(saved)}
                        />
                    )}
                    {activeTab === 'events' && timeline && (
                        <EventsEditor universeId={universeId} timeline={timeline} onRefresh={refreshTimeline} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Timeline Basic Form
// ============================================================

function TimelineBasicForm({
    universeId,
    timeline,
    onSaved,
}: {
    universeId: number;
    timeline: ApiTimeline | null;
    onSaved: (tl: ApiTimeline) => void;
}) {
    const isNew = !timeline;
    const [form, setForm] = useState({
        name: timeline?.name ?? '',
        slug: timeline?.slug ?? '',
        description: timeline?.description ?? '',
        sort_order: timeline?.sort_order ?? 0,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [autoSlug, setAutoSlug] = useState(isNew);

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const setField = (name: string, value: any) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'name' && autoSlug) next.slug = slugify(value);
            return next;
        });
        setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            let res;
            if (isNew) {
                res = await api.createTimeline(universeId, form);
            } else {
                res = await api.updateTimeline(universeId, timeline.id, form);
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
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Name <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="arc-input text-xs" required />
                    {errors.name && <p className="text-[10px] text-[var(--arc-danger)]">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Slug</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => { setAutoSlug(false); setField('slug', e.target.value); }}
                            className="arc-input flex-1 text-xs"
                        />
                        {!autoSlug && isNew && (
                            <button type="button" onClick={() => { setAutoSlug(true); setField('name', form.name); }} className="arc-btn text-[10px]">
                                Auto
                            </button>
                        )}
                    </div>
                </div>
                <div className="col-span-2 space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Description</label>
                    <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} className="arc-input text-xs" />
                </div>
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Sort Order</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value))} className="arc-input text-xs max-w-32" />
                </div>
            </div>

            <div className="flex items-center justify-end border-t border-[var(--arc-border)] pt-3">
                <button type="submit" disabled={saving} className="arc-btn arc-btn-primary text-xs">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    {isNew ? 'Create Timeline' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ============================================================
// Events Editor
// ============================================================

const EVENT_TYPES = ['incident', 'discovery', 'founding', 'death', 'battle', 'outbreak', 'political', 'research', 'deployment', 'other'] as const;
const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical', 'extinction-level'] as const;

function EventsEditor({
    universeId,
    timeline,
    onRefresh,
}: {
    universeId: number;
    timeline: ApiTimeline;
    onRefresh: () => void;
}) {
    const [events, setEvents] = useState<ApiTimelineEvent[]>(timeline.events ?? []);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        fictional_date: '',
        event_type: 'other' as string,
        severity: '' as string,
        entity_id: null as number | null,
        sort_order: 0,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.fetchTimelineEvents(universeId, timeline.id).then((res) => setEvents(res.data));
    }, [universeId, timeline.id]);

    const startNew = () => {
        setEditingId('new');
        setForm({ title: '', description: '', fictional_date: '', event_type: 'other', severity: '', entity_id: null, sort_order: events.length });
    };

    const startEdit = (event: ApiTimelineEvent) => {
        setEditingId(event.id);
        setForm({
            title: event.title,
            description: event.description ?? '',
            fictional_date: event.fictional_date ?? '',
            event_type: event.event_type ?? 'other',
            severity: event.severity ?? '',
            entity_id: event.entity_id,
            sort_order: event.sort_order,
        });
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            ...form,
            severity: form.severity || null,
            entity_id: form.entity_id || null,
            fictional_date: form.fictional_date || null,
        };

        try {
            if (editingId === 'new') {
                await api.createTimelineEvent(universeId, timeline.id, payload);
            } else {
                await api.updateTimelineEvent(universeId, timeline.id, editingId as number, payload);
            }
            setEditingId(null);
            const res = await api.fetchTimelineEvents(universeId, timeline.id);
            setEvents(res.data);
            onRefresh();
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (eventId: number) => {
        await api.deleteTimelineEvent(universeId, timeline.id, eventId);
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        onRefresh();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">EVENTS</span>
                <button type="button" onClick={startNew} className="arc-btn text-xs">
                    <Plus className="size-3" /> Add Event
                </button>
            </div>

            {editingId !== null && (
                <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                className="arc-input text-xs"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Date (Fictional)</label>
                            <input
                                type="text"
                                value={form.fictional_date}
                                onChange={(e) => setForm((p) => ({ ...p, fictional_date: e.target.value }))}
                                className="arc-input text-xs"
                                placeholder="e.g. 1998-07-24"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Event Type</label>
                            <select value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))} className="arc-input text-xs">
                                {EVENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Severity</label>
                            <select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))} className="arc-input text-xs">
                                <option value="">None</option>
                                {SEVERITY_LEVELS.map((s) => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Related Entity</label>
                            <EntityPicker
                                universeId={universeId}
                                value={form.entity_id}
                                onChange={(id) => setForm((p) => ({ ...p, entity_id: id }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Sort Order</label>
                            <input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="arc-input text-xs max-w-24" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="arc-input text-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingId(null)} className="arc-btn text-xs">Cancel</button>
                        <button type="button" onClick={handleSave} disabled={saving} className="arc-btn arc-btn-primary text-xs">
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                            Save
                        </button>
                    </div>
                </div>
            )}

            {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">#{event.sort_order}</span>
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[var(--arc-text)]">{event.title}</div>
                        <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {event.event_type ?? 'other'}
                            {event.fictional_date ? ` · ${event.fictional_date}` : ''}
                            {event.severity ? ` · ${event.severity}` : ''}
                            {event.entity?.name ? ` · ${event.entity.name}` : ''}
                        </div>
                    </div>
                    <button type="button" onClick={() => startEdit(event)} className="arc-btn arc-btn-sm text-[10px]">
                        <Edit3 className="size-3" /> Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(event.id)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}

            {events.length === 0 && editingId === null && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No events yet</div>
            )}
        </div>
    );
}
