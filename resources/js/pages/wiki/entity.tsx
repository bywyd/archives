import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Edit3, Film, History, Images, Layers, Loader2, Lock, Map, MoreHorizontal, Trash2, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RecordFormPanel, RECORD_TYPE_LABELS } from '@/components/archives/record-form-panel';
import { OpenInWorkspace } from '@/components/wiki/open-in-workspace';
import { WikiCategories } from '@/components/wiki/wiki-categories';
import { WikiTaggedEntities } from '@/components/wiki/wiki-tagged-entities';
import { WikiEditProvider, useWikiEdit } from '@/components/wiki/wiki-edit-context';
import { AttachMediaSourceForm, AttachTimelineForm, EntityBasicInfoForm, WikiSectionForm } from '@/components/wiki/wiki-edit-forms';
import { WikiInfobox } from '@/components/wiki/wiki-infobox';
import {
    EditModeToggle,
    AddItemButton,
    DeleteItemButton,
    LockToggleButton,
    useInlineSave,
} from '@/components/wiki/wiki-inline-editor';
import { WikiSectionHeading } from '@/components/wiki/wiki-section-heading';
import { RecordBlock } from '@/components/wiki/record-section';
import {
    WikiAffiliations,
    WikiConsciousnessRecords,
    WikiDeathRecords,
    WikiInfectionRecords,
    WikiIntelligenceRecords,
    WikiMutationStages,
    WikiPowerProfiles,
    WikiQuotes,
    WikiTransmissionParticipants,
    WikiTransmissionRecords,
} from '@/components/wiki/wiki-records';
import { WikiRelations } from '@/components/wiki/wiki-relations';
import { WikiSections } from '@/components/wiki/wiki-sections';
import { useAuth } from '@/hooks/use-auth';
import type { RecordType } from '@/lib/api';
import WikiLayout from '@/layouts/wiki-layout';
import { EntityMapViewer } from '@/components/archives/entity-map-viewer';
import * as api from '@/lib/api';
import type { ApiEntity, ApiEntityMap, ApiImage, ApiSidebarTree } from '@/types/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Props = {
    universe: { id: number; name: string; slug: string; is_locked?: boolean; settings?: Record<string, unknown> | null; images?: ApiImage[] };
    entity: ApiEntity;
    sidebarTree: ApiSidebarTree;
};

export default function EntityPage(props: Props) {
    return (
        <WikiEditProvider>
            <EntityPageContent {...props} />
        </WikiEditProvider>
    );
}

function EntityPageContent({ universe, entity, sidebarTree }: Props) {
    const { canEditContent, can } = useAuth();
    const { editMode } = useWikiEdit();
    const save = useInlineSave();
    const canEdit = canEditContent({ universeLocked: universe.is_locked, entityLocked: entity.is_locked });

    const [editingBasicInfo, setEditingBasicInfo] = useState(false);
    const [addingSection, setAddingSection] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    // activeRecord: id=null → adding new; id=N → editing existing
    const [activeRecord, setActiveRecord] = useState<{ type: RecordType; id: number | null; record: Record<string, any> | null } | null>(null);
    const [attachingTimeline, setAttachingTimeline] = useState(false);
    const [attachingMedia, setAttachingMedia] = useState(false);

    const profileImage = entity.images?.find((i: ApiImage) => i.type === 'profile') ?? null;
    const aliases = entity.aliases?.map((a) => a.alias) ?? [];

    // Build table of contents from sections + record types
    const toc = useMemo(() => {
        const items: { id: string; title: string; children?: { id: string; title: string }[] }[] = [];

        if (entity.content) items.push({ id: 'section-overview', title: 'Overview' });

        const topSections = entity.sections?.filter((s) => !s.parent_id).sort((a, b) => a.sort_order - b.sort_order) ?? [];
        for (const s of topSections) {
            const children = s.children?.sort((a, b) => a.sort_order - b.sort_order).map((c) => ({
                id: `section-${c.slug}`,
                title: c.title,
            }));
            items.push({ id: `section-${s.slug}`, title: s.title, children });
        }

        if (entity.outgoing_relations?.length || entity.incoming_relations?.length) items.push({ id: 'section-relations', title: 'Relations' });
        if (entity.infection_records?.length) items.push({ id: 'section-infections', title: 'Infection Records' });
        if (entity.mutation_stages?.length) items.push({ id: 'section-mutations', title: 'Mutation Stages' });
        if (entity.affiliation_history?.length) items.push({ id: 'section-affiliations', title: 'Affiliation History' });
        if (entity.death_records?.length) items.push({ id: 'section-deaths', title: 'Death Records' });
        if (entity.power_profiles?.length) items.push({ id: 'section-powers', title: 'Power Profiles' });
        if (entity.consciousness_records?.length) items.push({ id: 'section-consciousness', title: 'Consciousness Records' });
        if (entity.intelligence_records?.length) items.push({ id: 'section-intelligence', title: 'Intelligence Records' });
        if (entity.quotes?.length) items.push({ id: 'section-quotes', title: 'Quotes' });
        if (entity.transmission_participants?.length) items.push({ id: 'section-transmission-participants', title: 'Transmission Participants' });
        if (entity.transmission_records?.length) items.push({ id: 'section-transmission-records', title: 'Transmission Records' });
        if (entity.timelines?.length) items.push({ id: 'section-timelines', title: 'Appearances in Timelines' });
        if (entity.media_sources?.length) items.push({ id: 'section-media', title: 'Media Appearances' });
        if (entity.categories?.length) items.push({ id: 'section-categories', title: 'Categories' });
        if (entity.tags?.length) items.push({ id: 'section-related-tags', title: 'Related by Tag' });
        if (entity.maps?.length) items.push({ id: 'section-maps', title: 'Maps' });
        if (entity.entity_type?.slug === 'map') {
            const hasMapRel = entity.incoming_relations?.find((r) => r.relation_type?.slug === 'has-map');
            if (hasMapRel) items.push({ id: 'section-interactive-map', title: 'Interactive Map' });
        }

        return items;
    }, [entity]);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        name: entity.name,
        description: entity.short_description ?? entity.content?.slice(0, 200) ?? '',
        image: profileImage?.url,
        url: `/w/${universe.slug}/${entity.slug}`,
        isPartOf: { '@type': 'WebSite', name: 'Archives' },
    };

    // Helpers
    const deleteRecord = (type: RecordType) => (id: number) =>
        save(() => api.deleteEntityRecord(universe.id, entity.id, type, id), 'Record deleted');

    const deleteSection = (id: number) =>
        save(() => api.deleteEntitySection(universe.id, entity.id, id), 'Section deleted');

    const deleteRelation = (id: number) =>
        save(() => api.deleteRelation(universe.id, id), 'Relation deleted');

    const detachTimeline = (timelineId: number) =>
        save(() => api.detachEntityFromTimeline(universe.id, timelineId, entity.id), 'Detached from timeline');

    const detachMedia = (mediaSourceId: number) =>
        save(() => api.detachEntityFromMediaSource(universe.id, mediaSourceId, entity.id), 'Detached from media source');

    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                ...(entity.entity_type ? [{ title: entity.entity_type.name, href: `/w/${universe.slug}/type/${entity.entity_type.slug}` }] : []),
                { title: entity.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
            toc={toc}
            aside={
                <WikiInfobox
                    name={entity.name}
                    image={profileImage}
                    attributes={entity.attributes ?? []}
                    type={entity.entity_type?.name}
                    status={entity.entity_status?.name}
                    statusColor={entity.entity_status?.color}
                    aliases={aliases}
                    short_description={entity.short_description}
                />
            }
        >
            <Head title={entity.name + " - " + universe.name}>
                <meta name="description" content={entity.short_description ?? `Information about ${entity.name} in the ${universe.name} universe.`} />
                <meta property="og:title" content={`${entity.name}  ${universe.name}`} />
                <meta property="og:description" content={entity.short_description ?? ''} />
                {profileImage && <meta property="og:image" content={profileImage.url} />}
                <meta property="og:type" content="article" />
                <link rel="canonical" href={`/w/${universe.slug}/${entity.slug}`} />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Head>

            {/* Title + Edit Controls */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{entity.name}</h1>
                        {entity.entity_type && (
                            <span
                                className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide${!entity.entity_type.color ? ' border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800' : ''}`}
                                style={entity.entity_type.color ? {
                                    borderColor: entity.entity_type.color,
                                    color: entity.entity_type.color,
                                    backgroundColor: entity.entity_type.color + '15',
                                } : undefined}
                            >
                                {entity.entity_type.name}
                            </span>
                        )}
                    </div>
                    {entity.short_description && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{entity.short_description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <EditModeToggle
                        canEdit={canEdit}
                        isLocked={!!(entity.is_locked || universe.is_locked)}
                        lockLabel={entity.is_locked ? 'Entity locked' : 'Universe locked'}
                    />
                    {editMode && (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
                                <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingBasicInfo(true)}>
                                    <Edit3 className="mr-2 size-3.5" /> Edit Info
                                </DropdownMenuItem>
                                {can('entities.lock') && (
                                    <DropdownMenuItem onClick={async () => { await api.toggleEntityLock(universe.id, entity.id); save(() => Promise.resolve(), entity.is_locked ? 'Entity unlocked' : 'Entity locked'); }}>
                                        {entity.is_locked ? <Unlock className="mr-2 size-3.5" /> : <Lock className="mr-2 size-3.5" />}
                                        {entity.is_locked ? 'Unlock Entity' : 'Lock Entity'}
                                    </DropdownMenuItem>
                                )}
                                {can('universes.lock') && (
                                    <DropdownMenuItem onClick={async () => { await api.toggleUniverseLock(universe.id); save(() => Promise.resolve(), universe.is_locked ? 'Universe unlocked' : 'Universe locked'); }}>
                                        {universe.is_locked ? <Unlock className="mr-2 size-3.5" /> : <Lock className="mr-2 size-3.5" />}
                                        {universe.is_locked ? 'Unlock Universe' : 'Lock Universe'}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Link
                        href={`/w/${universe.slug}/${entity.slug}/history`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:border-blue-200 hover:text-blue-600 dark:hover:border-blue-800 dark:hover:text-blue-400 transition-colors"
                        title="View revision history"
                    >
                        <History className="size-3" />
                        History
                    </Link>
                    <OpenInWorkspace universeSlug={universe.slug} entitySlug={entity.slug} />
                </div>
            </div>

            {/* Basic Info Edit Form */}
            {editingBasicInfo && (
                <div className="mb-4">
                    <EntityBasicInfoForm
                        universeId={universe.id}
                        entity={entity}
                        onSaved={() => { setEditingBasicInfo(false); save(() => Promise.resolve(), 'Basic info saved'); }}
                        onCancel={() => setEditingBasicInfo(false)}
                    />
                </div>
            )}

            {/* Mobile infobox (shown only when aside panel is hidden, i.e. < xl) */}
            <div className="xl:hidden mb-6 rounded-lg border border-slate-200 dark:border-slate-700/60 p-4 bg-white dark:bg-slate-900/60">
                <WikiInfobox
                    name={entity.name}
                    image={profileImage}
                    attributes={entity.attributes ?? []}
                    type={entity.entity_type?.name}
                    status={entity.entity_status?.name}
                    statusColor={entity.entity_status?.color}
                    aliases={aliases}
                    short_description={entity.short_description}
                />
            </div>

            {/* Overview */}
            {entity.content && (
                <WikiSectionHeading id="section-overview" title="Overview">
                    <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-300 [&_p]:mb-3.5 [&_p:last-child]:mb-0 prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: entity.content }} />
                </WikiSectionHeading>
            )}

            {/* Interactive Map (for map-type entities) */}
            {entity.entity_type?.slug === 'map' && (() => {
                const hasMapRel = entity.incoming_relations?.find((r) => r.relation_type?.slug === 'has-map');
                const parentEntityId = hasMapRel?.from_entity_id;
                if (!parentEntityId) return null;
                return (
                    <WikiSectionHeading id="section-interactive-map" title="Interactive Map" icon={<Map className="size-5 text-blue-500" />}>
                        <div
                            className="wiki-arc-theme overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                            style={{ height: 'calc(100vh - 20rem)', minHeight: '480px' }}
                        >
                            <EntityMapViewer
                                universeId={universe.id}
                                entityId={parentEntityId}
                                mapId={entity.id}
                                onEntityNavigate={(slug) => router.visit(`/w/${universe.slug}/${slug}`)}
                            />
                        </div>
                    </WikiSectionHeading>
                );
            })()}

            {/* Sections */}
            <WikiSections
                sections={entity.sections ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteSection : undefined}
                onEdit={editMode ? (id) => setEditingSectionId(id) : undefined}
                editingId={editingSectionId}
                renderEditForm={(section) => (
                    <WikiSectionForm
                        universeId={universe.id}
                        universeSlug={universe.slug}
                        entityId={entity.id}
                        section={section}
                        onSaved={() => { setEditingSectionId(null); save(() => Promise.resolve(), 'Section saved'); }}
                        onCancel={() => setEditingSectionId(null)}
                    />
                )}
            />
            {editMode && (
                <div className="mt-3">
                    {addingSection ? (
                        <WikiSectionForm
                            universeId={universe.id}
                            universeSlug={universe.slug}
                            entityId={entity.id}
                            nextSortOrder={(entity.sections?.length ?? 0)}
                            onSaved={() => { setAddingSection(false); save(() => Promise.resolve(), 'Section created'); }}
                            onCancel={() => setAddingSection(false)}
                        />
                    ) : (
                        editingSectionId === null && <AddItemButton label="Add Section" onClick={() => setAddingSection(true)} />
                    )}
                </div>
            )}

            {/* Relations */}
            <WikiRelations
                outgoing={entity.outgoing_relations ?? []}
                incoming={entity.incoming_relations ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRelation : undefined}
            />

            {/* Specialized records - each with inline edit/create */}
            <RecordBlock type="infection-records" label="Infection Record" records={entity.infection_records ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiInfectionRecords records={entity.infection_records ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="mutation-stages" label="Mutation Stage" records={entity.mutation_stages ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiMutationStages stages={entity.mutation_stages ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="affiliation-history" label="Affiliation" records={entity.affiliation_history ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiAffiliations records={entity.affiliation_history ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="death-records" label="Death Record" records={entity.death_records ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiDeathRecords records={entity.death_records ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="power-profiles" label="Power Profile" records={entity.power_profiles ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiPowerProfiles profiles={entity.power_profiles ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="consciousness-records" label="Consciousness Record" records={entity.consciousness_records ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiConsciousnessRecords records={entity.consciousness_records ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="intelligence-records" label="Intelligence Record" records={entity.intelligence_records ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiIntelligenceRecords records={entity.intelligence_records ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="quotes" label="Quote" records={entity.quotes ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiQuotes quotes={entity.quotes ?? []} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="transmission-participants" label="Transmission Participant" records={entity.transmission_participants ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiTransmissionParticipants participants={entity.transmission_participants ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            <RecordBlock type="transmission-records" label="Transmission Record" records={entity.transmission_records ?? []} universeId={universe.id} entityId={entity.id} universeSlug={universe.slug} editMode={editMode} activeRecord={activeRecord} setActiveRecord={setActiveRecord} deleteRecord={deleteRecord} save={save}>
                {(rp) => <WikiTransmissionRecords records={entity.transmission_records ?? []} universeSlug={universe.slug} onDelete={rp.onDelete} onEdit={rp.onEdit} editingId={rp.editingId} renderEditForm={rp.renderEditForm} />}
            </RecordBlock>

            {/* Timeline appearances */}
            {(entity.timelines && entity.timelines.length > 0 || editMode) && (
                <WikiSectionHeading id="section-timelines" title="Appearances in Timelines" icon={<CalendarDays className="size-5 text-slate-400 dark:text-slate-500 shrink-0" />} count={entity.timelines?.length || undefined}>
                    {entity.timelines && entity.timelines.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[0.8125rem] [&_th]:bg-slate-50 dark:[&_th]:bg-slate-800/60 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.6875rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 dark:[&_th]:text-slate-400 [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800 [&_td]:align-middle [&_tbody_tr:hover]:bg-blue-50/50 dark:[&_tbody_tr:hover]:bg-blue-950/20 [&_tbody_tr:last-child_td]:border-b-0">
                            <thead>
                                <tr><th>Timeline</th><th>Role</th><th>Period</th><th>Notes</th>{editMode && <th></th>}</tr>
                            </thead>
                            <tbody>
                                {entity.timelines.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <Link href={`/w/${universe.slug}/timeline/${t.slug}`} className="text-blue-600 dark:text-blue-400 no-underline hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
                                                {t.name}
                                            </Link>
                                        </td>
                                        <td className="dark:text-slate-300">{t.pivot?.role ?? ''}</td>
                                        <td className="text-slate-400 dark:text-slate-500">
                                            {t.pivot?.fictional_start ?? '?'}  {t.pivot?.fictional_end ?? '?'}
                                        </td>
                                        <td className="text-slate-500 dark:text-slate-400">{t.pivot?.notes ?? ''}</td>
                                        {editMode && (
                                            <td>
                                                <DetachButton onDetach={() => detachTimeline(t.id)} />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                    {editMode && (
                        <div className="mt-3">
                            {attachingTimeline ? (
                                <AttachTimelineForm
                                    universeId={universe.id}
                                    entityId={entity.id}
                                    onSaved={() => { setAttachingTimeline(false); save(() => Promise.resolve(), 'Attached to timeline'); }}
                                    onCancel={() => setAttachingTimeline(false)}
                                />
                            ) : (
                                <AddItemButton label="Attach to Timeline" onClick={() => setAttachingTimeline(true)} />
                            )}
                        </div>
                    )}
                </WikiSectionHeading>
            )}

            {/* Media appearances */}
            {(entity.media_sources && entity.media_sources.length > 0 || editMode) && (
                <WikiSectionHeading id="section-media" title="Media Appearances" icon={<Film className="size-5 text-slate-400 dark:text-slate-500 shrink-0" />} count={entity.media_sources?.length || undefined}>
                    {entity.media_sources && entity.media_sources.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[0.8125rem] [&_th]:bg-slate-50 dark:[&_th]:bg-slate-800/60 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.6875rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 dark:[&_th]:text-slate-400 [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800 [&_td]:align-middle [&_tbody_tr:hover]:bg-blue-50/50 dark:[&_tbody_tr:hover]:bg-blue-950/20 [&_tbody_tr:last-child_td]:border-b-0">
                            <thead>
                                <tr><th>Media</th><th>Type</th><th>Role</th><th>Description</th>{editMode && <th></th>}</tr>
                            </thead>
                            <tbody>
                                {entity.media_sources.map((m) => (
                                    <tr key={m.id}>
                                        <td>
                                            <Link href={`/w/${universe.slug}/media/${m.slug}`} className="text-blue-600 dark:text-blue-400 no-underline hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
                                                {m.name}
                                            </Link>
                                        </td>
                                        <td><span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 whitespace-nowrap">{m.media_type}</span></td>
                                        <td className="dark:text-slate-300">{m.pivot?.role ?? ''}</td>
                                        <td className="text-slate-500 dark:text-slate-400">{m.pivot?.description ?? ''}</td>
                                        {editMode && (
                                            <td>
                                                <DetachButton onDetach={() => detachMedia(m.id)} />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                    {editMode && (
                        <div className="mt-3">
                            {attachingMedia ? (
                                <AttachMediaSourceForm
                                    universeId={universe.id}
                                    entityId={entity.id}
                                    onSaved={() => { setAttachingMedia(false); save(() => Promise.resolve(), 'Attached to media source'); }}
                                    onCancel={() => setAttachingMedia(false)}
                                />
                            ) : (
                                <AddItemButton label="Attach to Media Source" onClick={() => setAttachingMedia(true)} />
                            )}
                        </div>
                    )}
                </WikiSectionHeading>
            )}

            {/* Categories */}
            <WikiCategories
                categories={entity.categories ?? []}
                universeId={universe.id}
                universeSlug={universe.slug}
            />

            {/* Related entities grouped by tag */}
            <WikiTaggedEntities
                universeId={universe.id}
                universeSlug={universe.slug}
                entityId={entity.id}
                hasTags={!!(entity.tags && entity.tags.length > 0)}
            />

            {/* Maps */}
            {entity.maps && entity.maps.length > 0 && (
                <WikiSectionHeading id="section-maps" title="Maps" icon={<Map className="size-5 text-blue-500" />} count={entity.maps.length}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {entity.maps.map((m: ApiEntityMap) => (
                            <MapCard key={m.id} map={m} universeSlug={universe.slug} entitySlug={entity.slug} />
                        ))}
                    </div>
                </WikiSectionHeading>
            )}

            {/* Gallery */}
            {entity.images && entity.images.filter((i: ApiImage) => i.type === 'gallery').length > 0 && (
                <WikiSectionHeading id="section-gallery" title="Gallery" icon={<Images className="size-5 text-slate-400 dark:text-slate-500 shrink-0" />}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {entity.images.filter((i: ApiImage) => i.type === 'gallery').map((img) => (
                            <figure key={img.id} className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                                <div className="overflow-hidden">
                                    <img
                                        src={img.url}
                                        alt={img.alt_text ?? entity.name}
                                        loading="lazy"
                                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                {img.caption && (
                                    <figcaption className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                        {img.caption}
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                </WikiSectionHeading>
            )}
        </WikiLayout>
    );
}

function MapCard({ map, universeSlug, entitySlug }: { map: ApiEntityMap; universeSlug: string; entitySlug: string }) {
    const floorCount = map.floors?.length ?? map.floors_count ?? 0;
    return (
        <Link
            href={`/w/${universeSlug}/${entitySlug}/maps/${map.slug}`}
            className="group flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md hover:no-underline"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">{map.name}</span>
                <div className="flex shrink-0 gap-1.5">
                    {map.is_featured && (
                        <span className="rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">★ Featured</span>
                    )}
                    {floorCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <Layers className="size-2.5" />{floorCount}F
                        </span>
                    )}
                </div>
            </div>
            {map.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{map.description}</p>}
            <span className="mt-auto text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">View Map →</span>
        </Link>
    );
}

function DetachButton({ onDetach }: { onDetach: () => Promise<void> }) {
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
