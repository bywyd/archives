import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Edit3, Film, History, Images, Layers, Loader2, Map, Trash2 } from 'lucide-react';
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

            {/* Title + Edit Mode Toggle */}
            <div className="mb-4 flex items-start justify-between gap-3">
                {/* <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">{entity.name}</h1>
                    {entity.entity_type && (
                        <span
                            className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                            style={entity.entity_type.color ? {
                                borderColor: entity.entity_type.color,
                                color: entity.entity_type.color,
                                backgroundColor: entity.entity_type.color + '15',
                            } : { borderColor: '#e2e8f0', color: '#64748b', backgroundColor: '#f8fafc' }}
                        >
                            {entity.entity_type.name}
                        </span>
                    )}
                    {entity.short_description && (
                        <p className="mt-0.5 text-sm text-slate-500">{entity.short_description}</p>
                    )}
                </div> */}
                <div className="flex shrink-0 items-center gap-2">
                    {editMode && !editingBasicInfo && (
                        <button
                            onClick={() => setEditingBasicInfo(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:text-slate-900"
                        >
                            <Edit3 className="size-3" />
                            Edit Info
                        </button>
                    )}
                    <EditModeToggle
                        canEdit={canEdit}
                        isLocked={!!(entity.is_locked || universe.is_locked)}
                        lockLabel={entity.is_locked ? 'Entity locked' : 'Universe locked'}
                    />
                    {editMode && can('entities.lock') && (
                        <LockToggleButton
                            isLocked={entity.is_locked}
                            onToggle={async () => { await api.toggleEntityLock(universe.id, entity.id); save(() => Promise.resolve(), entity.is_locked ? 'Entity unlocked' : 'Entity locked'); }}
                            label="Entity"
                        />
                    )}
                    {editMode && can('universes.lock') && (
                        <LockToggleButton
                            isLocked={!!universe.is_locked}
                            onToggle={async () => { await api.toggleUniverseLock(universe.id); save(() => Promise.resolve(), universe.is_locked ? 'Universe unlocked' : 'Universe locked'); }}
                            label="Universe"
                        />
                    )}
                    <Link
                        href={`/w/${universe.slug}/${entity.slug}/history`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-blue-200 hover:text-blue-600 transition-colors"
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

            {/* Infobox */}
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

            {/* Overview */}
            {entity.content && (
                <div className="mb-8 scroll-mt-20" id="section-overview">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                        <a href="#section-overview" className="hover:text-blue-600">Overview</a>
                    </h2>
                    <div className="text-sm leading-relaxed text-slate-800 [&_p]:mb-3.5 [&_p:last-child]:mb-0 prose-sm" dangerouslySetInnerHTML={{ __html: entity.content }} />
                </div>
            )}

            {/* Interactive Map (for map-type entities) */}
            {entity.entity_type?.slug === 'map' && (() => {
                const hasMapRel = entity.incoming_relations?.find((r) => r.relation_type?.slug === 'has-map');
                const parentEntityId = hasMapRel?.from_entity_id;
                if (!parentEntityId) return null;
                return (
                    <div className="mb-8 scroll-mt-20" id="section-interactive-map">
                        <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                            <Map className="size-5 text-blue-500" />
                            <a href="#section-interactive-map" className="hover:text-blue-600">Interactive Map</a>
                        </h2>
                        <div
                            className="wiki-arc-theme overflow-hidden rounded-xl border border-slate-200 shadow-sm"
                            style={{ height: 'calc(100vh - 20rem)', minHeight: '480px' }}
                        >
                            <EntityMapViewer
                                universeId={universe.id}
                                entityId={parentEntityId}
                                mapId={entity.id}
                                onEntityNavigate={(slug) => router.visit(`/w/${universe.slug}/${slug}`)}
                            />
                        </div>
                    </div>
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
            <WikiInfectionRecords
                records={entity.infection_records ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('infection-records') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'infection-records', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'infection-records' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="infection-records"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'infection-records' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="infection-records"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'infection-records') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Infection Record" onClick={() => setActiveRecord({ type: 'infection-records', id: null, record: null })} />
                </div>
            )}

            <WikiMutationStages
                stages={entity.mutation_stages ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('mutation-stages') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'mutation-stages', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'mutation-stages' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="mutation-stages"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'mutation-stages' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="mutation-stages"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'mutation-stages') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Mutation Stage" onClick={() => setActiveRecord({ type: 'mutation-stages', id: null, record: null })} />
                </div>
            )}

            <WikiAffiliations
                records={entity.affiliation_history ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('affiliation-history') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'affiliation-history', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'affiliation-history' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="affiliation-history"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'affiliation-history' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="affiliation-history"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'affiliation-history') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Affiliation" onClick={() => setActiveRecord({ type: 'affiliation-history', id: null, record: null })} />
                </div>
            )}

            <WikiDeathRecords
                records={entity.death_records ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('death-records') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'death-records', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'death-records' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="death-records"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'death-records' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="death-records"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'death-records') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Death Record" onClick={() => setActiveRecord({ type: 'death-records', id: null, record: null })} />
                </div>
            )}

            <WikiPowerProfiles
                profiles={entity.power_profiles ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('power-profiles') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'power-profiles', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'power-profiles' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="power-profiles"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'power-profiles' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="power-profiles"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'power-profiles') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Power Profile" onClick={() => setActiveRecord({ type: 'power-profiles', id: null, record: null })} />
                </div>
            )}

            <WikiConsciousnessRecords
                records={entity.consciousness_records ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('consciousness-records') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'consciousness-records', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'consciousness-records' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="consciousness-records"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'consciousness-records' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="consciousness-records"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'consciousness-records') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Consciousness Record" onClick={() => setActiveRecord({ type: 'consciousness-records', id: null, record: null })} />
                </div>
            )}

            <WikiIntelligenceRecords
                records={entity.intelligence_records ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('intelligence-records') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'intelligence-records', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'intelligence-records' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="intelligence-records"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'intelligence-records' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="intelligence-records"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'intelligence-records') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Intelligence Record" onClick={() => setActiveRecord({ type: 'intelligence-records', id: null, record: null })} />
                </div>
            )}

            <WikiQuotes
                quotes={entity.quotes ?? []}
                onDelete={editMode ? deleteRecord('quotes') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'quotes', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'quotes' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="quotes"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'quotes' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="quotes"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'quotes') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Quote" onClick={() => setActiveRecord({ type: 'quotes', id: null, record: null })} />
                </div>
            )}

            <WikiTransmissionParticipants
                participants={entity.transmission_participants ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('transmission-participants') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'transmission-participants', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'transmission-participants' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="transmission-participants"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'transmission-participants' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="transmission-participants"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'transmission-participants') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Transmission Participant" onClick={() => setActiveRecord({ type: 'transmission-participants', id: null, record: null })} />
                </div>
            )}

            <WikiTransmissionRecords
                records={entity.transmission_records ?? []}
                universeSlug={universe.slug}
                onDelete={editMode ? deleteRecord('transmission-records') : undefined}
                onEdit={editMode ? (r) => setActiveRecord({ type: 'transmission-records', id: r.id, record: r }) : undefined}
                editingId={activeRecord?.type === 'transmission-records' ? activeRecord.id : null}
                renderEditForm={(r) => (
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="transmission-records"
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                )}
            />
            {editMode && activeRecord?.type === 'transmission-records' && activeRecord.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universe.id}
                        entityId={entity.id}
                        recordType="transmission-records"
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && (!activeRecord || activeRecord.type !== 'transmission-records') && (
                <div className="mt-2 mb-6">
                    <AddItemButton label="Add Transmission Record" onClick={() => setActiveRecord({ type: 'transmission-records', id: null, record: null })} />
                </div>
            )}

            {/* Timeline appearances */}
            {(entity.timelines && entity.timelines.length > 0 || editMode) && (
                <div className="mb-8 scroll-mt-20" id="section-timelines">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                        <CalendarDays className="size-5 text-slate-400 shrink-0" />
                        <a href="#section-timelines" className="hover:text-blue-600">Appearances in Timelines</a>
                    </h2>
                    {entity.timelines && entity.timelines.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-[0.8125rem] [&_th]:bg-slate-50 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.6875rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_th]:border-b [&_th]:border-slate-200 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100 [&_td]:align-middle [&_tbody_tr:hover]:bg-blue-50/50 [&_tbody_tr:last-child_td]:border-b-0">
                            <thead>
                                <tr><th>Timeline</th><th>Role</th><th>Period</th><th>Notes</th>{editMode && <th></th>}</tr>
                            </thead>
                            <tbody>
                                {entity.timelines.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <Link href={`/w/${universe.slug}/timeline/${t.slug}`} className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors">
                                                {t.name}
                                            </Link>
                                        </td>
                                        <td>{t.pivot?.role ?? ''}</td>
                                        <td className="text-slate-400">
                                            {t.pivot?.fictional_start ?? '?'}  {t.pivot?.fictional_end ?? '?'}
                                        </td>
                                        <td className="text-slate-500">{t.pivot?.notes ?? ''}</td>
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
                </div>
            )}

            {/* Media appearances */}
            {(entity.media_sources && entity.media_sources.length > 0 || editMode) && (
                <div className="mb-8 scroll-mt-20" id="section-media">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                        <Film className="size-5 text-slate-400 shrink-0" />
                        <a href="#section-media" className="hover:text-blue-600">Media Appearances</a>
                    </h2>
                    {entity.media_sources && entity.media_sources.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-[0.8125rem] [&_th]:bg-slate-50 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.6875rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_th]:border-b [&_th]:border-slate-200 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100 [&_td]:align-middle [&_tbody_tr:hover]:bg-blue-50/50 [&_tbody_tr:last-child_td]:border-b-0">
                            <thead>
                                <tr><th>Media</th><th>Type</th><th>Role</th><th>Description</th>{editMode && <th></th>}</tr>
                            </thead>
                            <tbody>
                                {entity.media_sources.map((m) => (
                                    <tr key={m.id}>
                                        <td>
                                            <Link href={`/w/${universe.slug}/media/${m.slug}`} className="text-blue-600 no-underline hover:text-blue-700 hover:underline transition-colors">
                                                {m.name}
                                            </Link>
                                        </td>
                                        <td><span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap">{m.media_type}</span></td>
                                        <td>{m.pivot?.role ?? ''}</td>
                                        <td className="text-slate-500">{m.pivot?.description ?? ''}</td>
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
                </div>
            )}

            {/* Categories */}
            <WikiCategories
                categories={entity.categories ?? []}
                universeId={universe.id}
                universeSlug={universe.slug}
            />

            {/* Tags */}
            {/* {entity.tags && entity.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                    {entity.tags.map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap" style={tag.color ? { borderColor: tag.color, color: tag.color, backgroundColor: tag.color + '08' } : undefined}>
                            {tag.name}
                        </span>
                    ))}
                </div>
            )} */}

            {/* Related entities grouped by tag */}
            <WikiTaggedEntities
                universeId={universe.id}
                universeSlug={universe.slug}
                entityId={entity.id}
                hasTags={!!(entity.tags && entity.tags.length > 0)}
            />

            {/* Maps */}
            {entity.maps && entity.maps.length > 0 && (
                <div className="mb-8 mt-6 scroll-mt-20" id="section-maps">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                        <Map className="size-5 text-blue-500" />
                        <a href="#section-maps" className="hover:text-blue-600">Maps</a>
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {entity.maps.map((m: ApiEntityMap) => (
                            <MapCard key={m.id} map={m} universeSlug={universe.slug} entitySlug={entity.slug} />
                        ))}
                    </div>
                </div>
            )}

            {/* Gallery */}
            {entity.images && entity.images.filter((i: ApiImage) => i.type === 'gallery').length > 0 && (
                <div className="mb-8 mt-6 scroll-mt-20" id="section-gallery">
                    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
                        <Images className="size-5 text-slate-400 shrink-0" />
                        Gallery
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {entity.images.filter((i: ApiImage) => i.type === 'gallery').map((img) => (
                            <figure key={img.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-hidden">
                                    <img
                                        src={img.url}
                                        alt={img.alt_text ?? entity.name}
                                        loading="lazy"
                                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                {img.caption && (
                                    <figcaption className="border-t border-slate-200 px-2 py-1.5 text-[11px] leading-snug text-slate-500">
                                        {img.caption}
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                </div>
            )}
        </WikiLayout>
    );
}

function MapCard({ map, universeSlug, entitySlug }: { map: ApiEntityMap; universeSlug: string; entitySlug: string }) {
    const floorCount = map.floors?.length ?? map.floors_count ?? 0;
    return (
        <Link
            href={`/w/${universeSlug}/${entitySlug}/maps/${map.slug}`}
            className="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md hover:no-underline"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600">{map.name}</span>
                <div className="flex shrink-0 gap-1.5">
                    {map.is_featured && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">★ Featured</span>
                    )}
                    {floorCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                            <Layers className="size-2.5" />{floorCount}F
                        </span>
                    )}
                </div>
            </div>
            {map.description && <p className="text-xs text-slate-500 line-clamp-2">{map.description}</p>}
            <span className="mt-auto text-xs font-medium text-blue-600 group-hover:underline">View Map →</span>
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
