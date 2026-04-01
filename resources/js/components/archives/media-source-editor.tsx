import {
    AlertCircle,
    Edit3,
    Film,
    Loader2,
    Plus,
    Save,
    Trash2,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EntityPicker } from '@/components/archives/entity-picker';
import { ImageUploader } from '@/components/archives/image-uploader';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiEntitySummary, ApiMediaSource } from '@/types/api';

type Props = {
    universeId: number;
    mediaSourceId?: number;
};

type EditorTab = 'basic' | 'entities' | 'images';

const MEDIA_TYPES = ['game', 'movie', 'tv', 'series', 'book', 'comic', 'anime', 'dlc', 'spinoff', 'other'] as const;

export function MediaSourceEditor({ universeId, mediaSourceId }: Props) {
    const [mediaSource, setMediaSource] = useState<ApiMediaSource | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EditorTab>('basic');
    const isNew = !mediaSourceId;

    useEffect(() => {
        if (!isNew && mediaSourceId) {
            setLoading(true);
            api.fetchMediaSource(universeId, mediaSourceId)
                .then((res) => setMediaSource(res.data))
                .catch((err) => setError(err.message || 'Failed to load media source'))
                .finally(() => setLoading(false));
        }
    }, [universeId, mediaSourceId, isNew]);

    const refreshMediaSource = useCallback(() => {
        if (mediaSource?.id) {
            api.fetchMediaSource(universeId, mediaSource.id).then((res) => setMediaSource(res.data));
        }
    }, [universeId, mediaSource?.id]);

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
            { id: 'entities' as EditorTab, label: 'Entities', icon: <Users className="size-3.5" /> },
            { id: 'images' as EditorTab, label: 'Images', icon: <Film className="size-3.5" /> },
        ]),
    ];

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Film className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        {isNew ? 'NEW MEDIA SOURCE' : 'EDIT MEDIA SOURCE'}
                    </span>
                    {mediaSource && (
                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                             {mediaSource.name}
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
                        <MediaSourceBasicForm
                            universeId={universeId}
                            mediaSource={mediaSource}
                            onSaved={(saved) => setMediaSource(saved)}
                        />
                    )}
                    {activeTab === 'entities' && mediaSource && (
                        <MediaSourceEntities universeId={universeId} mediaSource={mediaSource} onRefresh={refreshMediaSource} />
                    )}
                    {activeTab === 'images' && mediaSource && (
                        <ImageUploader
                            images={mediaSource.images ?? []}
                            imageableType="media_source"
                            imageableId={mediaSource.id}
                            onImagesChange={(images) => setMediaSource({ ...mediaSource, images })}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Media Source Basic Form
// ============================================================

function MediaSourceBasicForm({
    universeId,
    mediaSource,
    onSaved,
}: {
    universeId: number;
    mediaSource: ApiMediaSource | null;
    onSaved: (ms: ApiMediaSource) => void;
}) {
    const isNew = !mediaSource;
    const [form, setForm] = useState({
        name: mediaSource?.name ?? '',
        slug: mediaSource?.slug ?? '',
        media_type: mediaSource?.media_type ?? 'game',
        release_date: mediaSource?.release_date ?? '',
        description: mediaSource?.description ?? '',
        sort_order: mediaSource?.sort_order ?? 0,
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

        const payload = { ...form, release_date: form.release_date || null };

        try {
            let res;
            if (isNew) {
                res = await api.createMediaSource(universeId, payload);
            } else {
                res = await api.updateMediaSource(universeId, mediaSource.id, payload);
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
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                        Media Type <span className="text-[var(--arc-danger)]">*</span>
                    </label>
                    <select value={form.media_type} onChange={(e) => setField('media_type', e.target.value)} className="arc-input text-xs">
                        {MEDIA_TYPES.map((t) => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">Release Date</label>
                    <input type="date" value={form.release_date} onChange={(e) => setField('release_date', e.target.value)} className="arc-input text-xs" />
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
                    {isNew ? 'Create Media Source' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ============================================================
// Media Source Entities (attach/detach)
// ============================================================

function MediaSourceEntities({
    universeId,
    mediaSource,
    onRefresh,
}: {
    universeId: number;
    mediaSource: ApiMediaSource;
    onRefresh: () => void;
}) {
    const entities = (mediaSource.entities ?? []) as ApiEntitySummary[];
    const [showAdd, setShowAdd] = useState(false);
    const [addEntityId, setAddEntityId] = useState<number | null>(null);
    const [addRole, setAddRole] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAttach = async () => {
        if (!addEntityId) return;
        setSaving(true);
        try {
            await api.attachEntityToMediaSource(universeId, mediaSource.id, {
                entity_id: addEntityId,
                role: addRole || undefined,
            });
            setShowAdd(false);
            setAddEntityId(null);
            setAddRole('');
            onRefresh();
        } catch {
            // Ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDetach = async (entityId: number) => {
        await api.detachEntityFromMediaSource(universeId, mediaSource.id, entityId);
        onRefresh();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">LINKED ENTITIES</span>
                {!showAdd && (
                    <button type="button" onClick={() => setShowAdd(true)} className="arc-btn text-xs">
                        <Plus className="size-3" /> Link Entity
                    </button>
                )}
            </div>

            {showAdd && (
                <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Entity</label>
                            <EntityPicker
                                universeId={universeId}
                                value={addEntityId}
                                onChange={(id) => setAddEntityId(id)}
                                excludeIds={entities.map((e) => e.id)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="arc-mono text-[10px] text-[var(--arc-text-muted)]">Role</label>
                            <input type="text" value={addRole} onChange={(e) => setAddRole(e.target.value)} className="arc-input text-xs" placeholder="e.g. protagonist" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAdd(false)} className="arc-btn text-xs">Cancel</button>
                        <button type="button" onClick={handleAttach} disabled={saving || !addEntityId} className="arc-btn arc-btn-primary text-xs">
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                            Link
                        </button>
                    </div>
                </div>
            )}

            {entities.map((entity) => (
                <div key={entity.id} className="flex items-center gap-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[var(--arc-text)]">{entity.name}</div>
                        <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                            {entity.entity_type?.name ?? 'Unknown type'}
                            {entity.pivot?.role ? ` · ${entity.pivot.role}` : ''}
                        </div>
                    </div>
                    <button type="button" onClick={() => handleDetach(entity.id)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}

            {entities.length === 0 && !showAdd && (
                <div className="py-6 text-center text-xs text-[var(--arc-text-muted)]">No entities linked yet</div>
            )}
        </div>
    );
}
