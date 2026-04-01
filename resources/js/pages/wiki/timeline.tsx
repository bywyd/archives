import { Head, Link } from '@inertiajs/react';
import { Edit3, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { WikiEditProvider, useWikiEdit } from '@/components/wiki/wiki-edit-context';
import { TimelineBasicInfoForm, TimelineEventForm } from '@/components/wiki/wiki-edit-forms';
import { WikiEntityCard } from '@/components/wiki/wiki-entity-card';
import {
    EditModeToggle,
    AddItemButton,
    LockToggleButton,
    useInlineSave,
} from '@/components/wiki/wiki-inline-editor';
import { useAuth } from '@/hooks/use-auth';
import WikiLayout from '@/layouts/wiki-layout';
import * as api from '@/lib/api';
import type { ApiEntitySummary, ApiSidebarTree, ApiTimeline, ApiTimelineEvent } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string; is_locked?: boolean };
    timeline: ApiTimeline & { events?: ApiTimelineEvent[]; entities?: ApiEntitySummary[] };
    sidebarTree: ApiSidebarTree;
};

const SEVERITY_COLORS: Record<string, string> = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
    'extinction-level': 'text-red-800 bg-red-100',
};

export default function TimelinePage(props: Props) {
    return (
        <WikiEditProvider>
            <TimelinePageContent {...props} />
        </WikiEditProvider>
    );
}

function TimelinePageContent({ universe, timeline, sidebarTree }: Props) {
    const { canEditContent, can } = useAuth();
    const { editMode } = useWikiEdit();
    const save = useInlineSave();
    const canEdit = canEditContent({ universeLocked: universe.is_locked });

    const [editingBasicInfo, setEditingBasicInfo] = useState(false);
    const [addingEvent, setAddingEvent] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const events = (timeline.events ?? []).sort((a, b) => a.sort_order - b.sort_order);

    const deleteEvent = (eventId: number) =>
        save(() => api.deleteTimelineEvent(universe.id, timeline.id, eventId), 'Event deleted');

    const detachEntity = (entityId: number) =>
        save(() => api.detachEntityFromTimeline(universe.id, timeline.id, entityId), 'Entity detached');

    const handleBasicInfoSaved = () => { setEditingBasicInfo(false); save(() => Promise.resolve(), 'Timeline updated'); };
    const handleEventSaved = () => { setAddingEvent(false); setEditingEventId(null); save(() => Promise.resolve(), editingEventId ? 'Event updated' : 'Event created'); };

    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                { title: 'Timelines', href: `/w/${universe.slug}` },
                { title: timeline.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
        >
            <Head title={timeline.name + " - " + universe.name}>
                <meta name="description" content={timeline.description ?? `Timeline: ${timeline.name} in ${universe.name}.`} />
                <link rel="canonical" href={`/w/${universe.slug}/timeline/${timeline.slug}`} />
            </Head>

            <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">{timeline.name}</h1>
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
                    <TimelineBasicInfoForm
                        universeId={universe.id}
                        timeline={timeline}
                        onSaved={handleBasicInfoSaved}
                        onCancel={() => setEditingBasicInfo(false)}
                    />
                </div>
            )}

            {timeline.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-500">{timeline.description}</p>
            )}

            {/* Events */}
            {(events.length > 0 || editMode) && (
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">Events</h2>
                    {events.length > 0 && (
                        <div className="relative ml-4 border-l-2 border-blue-100">
                            {events.map((event) => (
                                <div key={event.id} className="relative mb-4 ml-6">
                                    <div className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-blue-600 bg-white shadow-sm" />

                                    {editingEventId === event.id ? (
                                        <TimelineEventForm
                                            universeId={universe.id}
                                            timelineId={timeline.id}
                                            event={event}
                                            onSaved={handleEventSaved}
                                            onCancel={() => setEditingEventId(null)}
                                        />
                                    ) : (
                                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md relative">
                                            {editMode && (
                                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingEventId(event.id)}
                                                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-neutral-100 hover:text-slate-900 dark:hover:bg-neutral-800"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="size-3" />
                                                    </button>
                                                    <EventDeleteBtn onDelete={() => deleteEvent(event.id)} />
                                                </div>
                                            )}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-900">{event.title}</span>
                                            {event.event_type && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap">{event.event_type}</span>}
                                            {event.severity && (
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[event.severity] ?? 'text-gray-600 bg-gray-50'}`}>
                                                    {event.severity}
                                                </span>
                                            )}
                                        </div>
                                        {event.fictional_date && (
                                            <div className="mt-1 text-[11px] text-slate-400">{event.fictional_date}</div>
                                        )}
                                        {event.description && (
                                            <p className="mt-2 text-xs leading-relaxed text-slate-500">{event.description}</p>
                                        )}
                                        {(event.entity || event.location) && (
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                {event.entity && (
                                                    <div>
                                                        <span className="text-slate-400">Entity: </span>
                                                        <Link href={`/w/${universe.slug}/${event.entity.slug}`} className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors">
                                                            {event.entity.name}
                                                        </Link>
                                                    </div>
                                                )}
                                                {event.location && (
                                                    <div>
                                                        <span className="text-slate-400">Location: </span>
                                                        <Link href={`/w/${universe.slug}/${event.location.slug}`} className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors">
                                                            {event.location.name}
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {event.participants && event.participants.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                                                <span className="text-slate-400">Participants:</span>
                                                {event.participants.map((p) => (
                                                    <span key={p.id}>
                                                        {p.entity ? (
                                                            <Link href={`/w/${universe.slug}/${p.entity.slug}`} className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors">
                                                                {p.entity.name}
                                                            </Link>
                                                        ) : ''}
                                                        {p.role && <span className="text-slate-400"> ({p.role})</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {editMode && (
                        <div className="mt-3">
                            <AddItemButton label="Add Event" onClick={() => setAddingEvent(true)} />
                        </div>
                    )}
                    {addingEvent && (
                        <div className="mt-3">
                            <TimelineEventForm
                                universeId={universe.id}
                                timelineId={timeline.id}
                                nextSortOrder={events.length}
                                onSaved={handleEventSaved}
                                onCancel={() => setAddingEvent(false)}
                            />
                        </div>
                    )}
                </section>
            )}

            {/* Related entities */}
            {timeline.entities && timeline.entities.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">Related Entities</h2>
                    <div className="stagger-children grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {timeline.entities.map((e) => (
                            <div key={e.id} className="relative">
                                <WikiEntityCard entity={e} universeSlug={universe.slug} />
                                {editMode && (
                                    <div className="absolute right-1 top-1">
                                        <EventDeleteBtn onDelete={() => detachEntity(e.id)} />
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

function EventDeleteBtn({ onDelete }: { onDelete: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <button
            onClick={async () => { setBusy(true); try { await onDelete(); } catch {} finally { setBusy(false); } }}
            disabled={busy}
            className="rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete"
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
    );
}
