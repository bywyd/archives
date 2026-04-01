import { Head } from '@inertiajs/react';
import { Calendar, Edit3, Film, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { WikiEditProvider, useWikiEdit } from '@/components/wiki/wiki-edit-context';
import { MediaSourceBasicInfoForm } from '@/components/wiki/wiki-edit-forms';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import {
    EditModeToggle,
    LockToggleButton,
    useInlineSave,
} from '@/components/wiki/wiki-inline-editor';
import { useAuth } from '@/hooks/use-auth';
import WikiLayout from '@/layouts/wiki-layout';
import * as api from '@/lib/api';
import type { ApiEntitySummary, ApiImage, ApiMediaSource, ApiSidebarTree, ApiTag } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string; is_locked?: boolean };
    mediaSource: ApiMediaSource & { entities?: ApiEntitySummary[]; tags?: ApiTag[] };
    sidebarTree: ApiSidebarTree;
};

export default function MediaSourcePage(props: Props) {
    return (
        <WikiEditProvider>
            <MediaSourcePageContent {...props} />
        </WikiEditProvider>
    );
}

function MediaSourcePageContent({ universe, mediaSource, sidebarTree }: Props) {
    const { canEditContent, can } = useAuth();
    const { editMode } = useWikiEdit();
    const save = useInlineSave();
    const canEdit = canEditContent({ universeLocked: universe.is_locked });

    const banner = mediaSource.images?.find((i: ApiImage) => i.type === 'banner' || i.type === 'profile');
    const icon = mediaSource.images?.find((i: ApiImage) => i.type === 'icon');

    const [editingBasicInfo, setEditingBasicInfo] = useState(false);

    const detachEntity = (entityId: number) =>
        save(() => api.detachEntityFromMediaSource(universe.id, mediaSource.id, entityId), 'Entity detached');

    const handleBasicInfoSaved = () => { setEditingBasicInfo(false); save(() => Promise.resolve(), 'Media source updated'); };

    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                { title: 'Media Sources', href: `/w/${universe.slug}` },
                { title: mediaSource.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
        >
            <Head title={mediaSource.name +" - " + universe.name}>
                <meta name="description" content={mediaSource.description ?? `Media source: ${mediaSource.name} in ${universe.name}.`} />
                <link rel="canonical" href={`/w/${universe.slug}/media/${mediaSource.slug}`} />
            </Head>

            {banner && (
                <div className="-mx-6 -mt-4 mb-6 overflow-hidden rounded-b-lg">
                    <img src={banner.url} alt={mediaSource.name} loading="lazy" className="h-44 w-full object-cover" />
                    {icon && (
                        <img src={icon.url} alt={mediaSource.name} loading="lazy" className="absolute top-16 left-6 h-20 w-20 rounded-full border-4 border-white object-cover" />
                    )}

                </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-900">{mediaSource.name}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap">{mediaSource.media_type}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {editMode && !editingBasicInfo && (
                        <button onClick={() => setEditingBasicInfo(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                            <Edit3 className="size-3" /> Edit Info
                        </button>
                    )}
                    <EditModeToggle canEdit={canEdit} isLocked={!!universe.is_locked} lockLabel="Universe locked" />
                    {editMode && can('universes.lock') && (
                        <LockToggleButton
                            isLocked={!!universe.is_locked}
                            onToggle={async () => { await api.toggleUniverseLock(universe.id); save(() => Promise.resolve(), universe.is_locked ? 'Universe unlocked' : 'Universe locked'); }}
                            label="Universe"
                        />
                    )}
                </div>
            </div>

            {editingBasicInfo && (
                <div className="mb-4">
                    <MediaSourceBasicInfoForm
                        universeId={universe.id}
                        mediaSource={mediaSource}
                        onSaved={handleBasicInfoSaved}
                        onCancel={() => setEditingBasicInfo(false)}
                    />
                </div>
            )}

            {/* Info card */}
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs shadow-sm">
                <div className="flex items-center gap-1.5">
                    <Film className="size-3.5 text-blue-600" />
                    <span className="text-slate-400">Type:</span>
                    <span className="font-medium text-slate-900">{mediaSource.media_type}</span>
                </div>
                {mediaSource.release_date && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-blue-600" />
                        <span className="text-slate-400">Released:</span>
                        <span className="font-medium text-slate-900">{mediaSource.release_date}</span>
                    </div>
                )}
            </div>

            {mediaSource.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-500">{mediaSource.description}</p>
            )}

            {/* Tags */}
            {mediaSource.tags && mediaSource.tags.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-1.5">
                    {mediaSource.tags.map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap" style={tag.color ? { borderColor: tag.color, color: tag.color, backgroundColor: tag.color + '08' } : undefined}>
                            {tag.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Entities */}
            {mediaSource.entities && mediaSource.entities.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">Featured Entities ({mediaSource.entities.length})</h2>
                    <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {mediaSource.entities.map((e) => (
                            <div key={e.id} className="relative">
                                <WikiEntityCard entity={e} universeSlug={universe.slug} />
                                {editMode && (
                                    <div className="absolute right-1 top-1">
                                        <MediaDetachBtn onDetach={() => detachEntity(e.id)} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </WikiLayout>
    );
}

function MediaDetachBtn({ onDetach }: { onDetach: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <button
            onClick={async () => { setBusy(true); try { await onDetach(); } catch {} finally { setBusy(false); } }}
            disabled={busy}
            className="rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Detach"
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
    );
}
