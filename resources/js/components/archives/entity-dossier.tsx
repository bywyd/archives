import { AlertCircle, ChevronLeftIcon, ChevronRightIcon, Edit3, ExternalLinkIcon, FileSearch, FileText, GitBranch, GitBranchIcon, History, Loader2, Lock, MapPin, Pin, PinOff, Scale, Shield, SlidersHorizontal, Sparkles, Unlock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityAffiliationHistory } from '@/components/archives/entity-affiliation-history';
import { EntityAliases } from '@/components/archives/entity-aliases';
import { EntityConsciousnessRecords } from '@/components/archives/entity-consciousness-records';
import { EntityDeathRecords } from '@/components/archives/entity-death-records';
import { EntityInfectionRecords } from '@/components/archives/entity-infection-records';
import { EntityTransmissionLog } from '@/components/archives/entity-transmission-log';
import { EntityIntelligenceRecords } from '@/components/archives/entity-intelligence-records';
import { EntityInfobox } from '@/components/archives/entity-infobox';
import { EntityGallery } from '@/components/archives/entity-gallery';
import { EntityMapViewer } from '@/components/archives/entity-map-viewer';
import { EntityMaps } from '@/components/archives/entity-maps';
import { EntityMedia } from '@/components/archives/entity-media';
import { EntityMutationStages } from '@/components/archives/entity-mutation-stages';
import { EntityPowerProfiles } from '@/components/archives/entity-power-profiles';
import { EntityQuotes } from '@/components/archives/entity-quotes';
import { EntityRelations } from '@/components/archives/entity-relations';
import { EntitySections } from '@/components/archives/entity-sections';
import { EntityTimelineStrip } from '@/components/archives/entity-timeline-strip';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useHistoryStore } from '@/stores/history-store';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity } from '@/types/api';
import { router } from '@inertiajs/react';

type Props = {
    universeId: number;
    entitySlug: string;
};

type TabDef = {
    id: string;
    label: string;
    count?: number;
};

export function EntityDossier({ universeId, entitySlug }: Props) {
    const [entity, setEntity] = useState<ApiEntity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    const { addToHistory, pinItem, unpinItem, isPinned } = useHistoryStore();
    const { openWindow } = useWindowStore();
    const { can } = useAuth();
    const tabsRef = useRef<HTMLDivElement | null>(null)

    const scroll = (amount: number) => {
        if (tabsRef.current) {
        tabsRef.current.scrollBy({ left: amount, behavior: "smooth" })
        }
    }
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setActiveTab('overview');

        api.fetchEntity(universeId, entitySlug)
            .then((res) => {
                if (!cancelled) {
                    setEntity(res.data);
                    // Track in history
                    const profileImage = res.data.images?.find((img) => img.type === 'profile');
                    addToHistory({
                        type: 'entity',
                        entityId: res.data.id,
                        universeId,
                        slug: res.data.slug,
                        name: res.data.name,
                        shortDescription: res.data.short_description,
                        entityType: res.data.entity_type,
                        entityStatus: res.data.entity_status,
                        profileImage: profileImage?.thumbnail_url ?? profileImage?.url ?? null,
                    });
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Failed to load entity');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [universeId, entitySlug, addToHistory]);

    // Build available tabs from entity data
    const tabs = useMemo<TabDef[]>(() => {
        if (!entity) return [];
        const t: TabDef[] = [{ id: 'overview', label: 'Overview' }];

        // if ((entity.attributes?.length ?? 0) > 0 || (entity.timelines?.length ?? 0) > 0 || (entity.media_sources?.length ?? 0) > 0) {
        //     t.push({ id: 'subject-data', label: 'Subject Data' });
        // }
        if (entity.sections?.length) {
            t.push({ id: 'sections', label: 'Sections', count: entity.sections.length });
        }
        const relCount = (entity.outgoing_relations?.length ?? 0) + (entity.incoming_relations?.length ?? 0);
        if (relCount > 0) {
            t.push({ id: 'relations', label: 'Relations', count: relCount });
        }
        if (entity.infection_records?.length) {
            t.push({ id: 'infections', label: 'Infections', count: entity.infection_records.length });
        }
        if (entity.mutation_stages?.length) {
            t.push({ id: 'mutations', label: 'Mutations', count: entity.mutation_stages.length });
        }
        if (entity.affiliation_history?.length) {
            t.push({ id: 'affiliations', label: 'Affiliations', count: entity.affiliation_history.length });
        }
        if (entity.power_profiles?.length) {
            t.push({ id: 'powers', label: 'Abilities', count: entity.power_profiles.length });
        }
        if (entity.quotes?.length) {
            t.push({ id: 'quotes', label: 'Quotes', count: entity.quotes.length });
        }
        if (entity.consciousness_records?.length) {
            t.push({ id: 'consciousness', label: 'Consciousness', count: entity.consciousness_records.length });
        }
        if (entity.intelligence_records?.length) {
            t.push({ id: 'intelligence', label: 'Intelligence', count: entity.intelligence_records.length });
        }
        if (entity.death_records?.length) {
            t.push({ id: 'deaths', label: 'Deaths', count: entity.death_records.length });
        }
        if (entity.transmission_participants?.length || entity.transmission_records?.length) {
            t.push({ id: 'transmissions', label: 'Transmissions', count: entity.transmission_records?.length ?? 0 });
        }
        if (entity.maps?.length) {
            t.push({ id: 'maps', label: 'Maps', count: entity.maps.length });
        }
        if (entity.entity_type?.slug === 'map') {
            t.push({ id: 'map-viewer', label: 'Interactive Map' });
        }
        const galleryImages = entity.images?.filter((img) => img.type === 'gallery') ?? [];
        if (galleryImages.length > 0) {
            t.push({ id: 'gallery', label: 'Gallery', count: galleryImages.length });
        }
        return t;
    }, [entity]);


    if (loading) {
        return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--arc-bg)]">
            <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[var(--arc-accent)]/10 blur-xl" />
            <Loader2 className="relative size-6 animate-spin text-[var(--arc-accent)]" />
            </div>
            <div className="text-center">
            <span className="arc-mono block text-[10px] font-semibold tracking-[0.3em] text-[var(--arc-accent)]">
                LOADING DOSSIER
            </span>
            <div className="mt-2 flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="h-0.5 w-3 rounded-full bg-[var(--arc-accent)]"
                    style={{
                    opacity: 0.3 + i * 0.15,
                    animation: `pulse 1s ease-in-out ${i * 100}ms infinite`,
                    }}
                />
                ))}
            </div>
            </div>
        </div>
        )
    }

    if (error || !entity) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <p className="text-sm font-medium text-[var(--arc-danger)]">
                    {error || 'Entity not found'}
                </p>
                <p className="arc-mono text-[10px] text-[var(--arc-text-muted)]">DOSSIER RETRIEVAL FAILED</p>
            </div>
        );
    }

    const profileImage = entity.images?.find((img) => img.type === 'profile');
    const bannerImage = entity.images?.find((img) => img.type === 'banner');
    const dossierNumber = entity.id.toString().padStart(6, '0');
    const isClassified = entity.entity_status?.slug === 'classified';
    const pinned = isPinned(entity.id, universeId)
    const isMapEntity = entity.entity_type?.slug === 'map';
    const mapParentRelation = isMapEntity
        ? entity.incoming_relations?.find((r) => r.relation_type?.slug === 'has-map')
        : undefined;
    const mapParentEntityId = mapParentRelation?.from_entity_id;

    return (
        <div className={cn('flex h-full flex-col', isClassified && 'arc-classified-stamp')}>
            {/*  Dossier File Header  */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-1.5">
                <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded bg-[var(--arc-accent)]/10">
                    <FileText className="size-3 text-[var(--arc-accent)]" />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">DOSSIER</span>
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">#{dossierNumber}</span>
                </div>
                </div>

                <div className="flex items-center gap-1">
                {isClassified && (
                    <span className="mr-1 flex items-center gap-1 rounded border border-[var(--arc-classified)]/30 bg-[var(--arc-classified)]/5 px-1.5 py-0.5">
                    <Lock className="size-2.5 text-[var(--arc-classified)]" />
                    <span className="arc-mono text-[8px] font-bold tracking-wider text-[var(--arc-classified)]">
                        CLASSIFIED
                    </span>
                    </span>
                )}
                {/* open in wiki */}
                <ActionButton
                    icon={<ExternalLinkIcon className="size-3" />}
                    title="View in Wiki"
                    onClick={() => router.visit(`/w/${entity?.universe?.slug}/${entity.slug}`, { method: 'get', preserveState: true, preserveScroll: true })}
                />
                <ActionButton
                    icon={<GitBranch className="size-3" />}
                    title="View connections"
                    onClick={() =>
                    openWindow({
                        type: "connections-graph",
                        title: `${entity.name}  CONNECTIONS`,
                        icon: "CG",
                        props: { key: `connections-${universeId}-${entity.slug}`, universeId, entitySlug: entity.slug },
                    })
                    }
                />
                <ActionButton
                    icon={<FileSearch className="size-3" />}
                    title="Auto-briefing"
                    onClick={() =>
                    openWindow({
                        type: 'entity-briefing',
                        title: `BRIEFING - ${entity.name.toUpperCase()}`,
                        icon: 'BR',
                        props: { key: `briefing-${universeId}-${entity.slug}`, universeId, entitySlug: entity.slug },
                        size: { width: 680, height: 640 },
                    })
                    }
                />
                <ActionButton
                    icon={<Scale className="size-3" />}
                    title="Compare entities"
                    onClick={() =>
                    openWindow({
                        type: "entity-comparison",
                        title: "ENTITY COMPARISON",
                        icon: "EC",
                        props: { key: `comparison-${universeId}`, universeId, initialEntitySlugs: [entity.slug] },
                    })
                    }
                />
                {(entity.maps?.length ?? 0) > 0 && (
                <ActionButton
                    icon={<MapPin className="size-3" />}
                    title="View maps"
                    onClick={() => {
                    const firstMap = entity.maps?.[0];
                    if (firstMap) {
                        openWindow({
                            type: 'map-viewer',
                            title: `MAP  ${firstMap.name.toUpperCase()}`,
                            icon: 'MAP',
                            props: {
                                key: `map-${universeId}-${entity.id}-${firstMap.id}`,
                                universeId,
                                entityId: entity.id,
                                mapId: firstMap.id,
                            },
                            size: { width: 800, height: 600 },
                        });
                    }
                    }}
                />
                )}
                {isMapEntity && mapParentEntityId != null && (
                <ActionButton
                    icon={<MapPin className="size-3" />}
                    title="Open map viewer"
                    onClick={() =>
                        openWindow({
                            type: 'map-viewer',
                            title: `MAP  ${entity.name.toUpperCase()}`,
                            icon: 'MAP',
                            props: {
                                key: `map-${universeId}-${mapParentEntityId}-${entity.id}`,
                                universeId,
                                entityId: mapParentEntityId,
                                mapId: entity.id,
                            },
                            size: { width: 800, height: 600 },
                        })
                    }
                />
                )}
                <ActionButton
                    icon={<Edit3 className="size-3" />}
                    title="Edit entity"
                    onClick={() =>
                    openWindow({
                        type: "entity-editor",
                        title: `EDIT  ${entity.name}`,
                        icon: "ED",
                        props: {
                        key: `editor-${universeId}-${entity.slug}`,
                        universeId,
                        entityId: entity.id,
                        entitySlug: entity.slug,
                        },
                        size: { width: 700, height: 600 },
                    })
                    }
                />
                <ActionButton
                    icon={<History className="size-3" />}
                    title="Revision history"
                    onClick={() =>
                        openWindow({
                            type: 'entity-revisions',
                            title: `CHANGELOG  ${entity.name}`,
                            icon: 'REV',
                            props: {
                                key: `revisions-${universeId}-${entity.id}`,
                                universeId,
                                entityId: entity.id,
                                entityName: entity.name,
                            },
                            size: { width: 680, height: 560 },
                        })
                    }
                />
                {can('entities.lock') && (
                    <ActionButton
                        icon={entity.is_locked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                        title={entity.is_locked ? 'Unlock entity' : 'Lock entity'}
                        active={entity.is_locked}
                        variant="warning"
                        onClick={async () => {
                            await api.toggleEntityLock(universeId, entity.id);
                            setEntity((prev) => prev ? { ...prev, is_locked: !prev.is_locked } : prev);
                        }}
                    />
                )}
                {entity.entity_type?.slug === 'incident' && (
                    <>
                        <ActionButton
                            icon={<Sparkles className="size-3" />}
                            title="Event Reconstruction"
                            onClick={() =>
                                openWindow({
                                    type: 'event-reconstruction',
                                    title: `RECONSTRUCTION - ${entity.name}`,
                                    icon: 'RC',
                                    props: {
                                        key: `reconstruction-${universeId}-${entity.slug}`,
                                        universeId,
                                        incidentSlug: entity.slug,
                                    },
                                    size: { width: 960, height: 640 },
                                })
                            }
                        />
                        <ActionButton
                            icon={<SlidersHorizontal className="size-3" />}
                            title="Temporal Slider"
                            onClick={() =>
                                openWindow({
                                    type: 'temporal-slider',
                                    title: `TEMPORAL - ${entity.name}`,
                                    icon: 'TS',
                                    props: {
                                        key: `temporal-${universeId}-${entity.slug}`,
                                        universeId,
                                        incidentSlug: entity.slug,
                                    },
                                    size: { width: 960, height: 580 },
                                })
                            }
                        />
                    </>
                )}
                <ActionButton
                    icon={pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                    title={pinned ? "Unpin" : "Pin"}
                    active={pinned}
                    variant="warning"
                    onClick={() => {
                    const img = entity.images?.find((i) => i.type === "profile")
                    if (pinned) {
                        unpinItem(entity.id, universeId)
                    } else {
                        pinItem({
                        type: "entity",
                        entityId: entity.id,
                        universeId,
                        slug: entity.slug,
                        name: entity.name,
                        shortDescription: entity.short_description,
                        entityType: entity.entity_type,
                        entityStatus: entity.entity_status,
                        profileImage: img?.thumbnail_url ?? img?.url ?? null,
                        viewedAt: new Date().toISOString(),
                        })
                    }
                    }}
                />
                </div>
            </div>

            {/*  Banner  */}
            {bannerImage && (
                <div className="relative h-28 shrink-0 overflow-hidden">
                    <img src={bannerImage.url} alt="" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--arc-surface)]" />
                </div>
            )}

            {/*  Profile Header  */}
            <div className={cn('shrink-0 border-b  px-2 pb-0 pt-2', bannerImage && 'relative -mt-10')}>
                <div className="flex gap-3">
                    {/* Profile Image */}
                    <div className="size-24 shrink-0 overflow-hidden rounded border-2 border-[var(--arc-border-strong)] bg-[var(--arc-bg)] shadow-sm">
                        {profileImage ? (
                            <button
                                type="button"
                                className="size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--arc-accent)"
                                title="View full image"
                                onClick={() => openWindow({
                                    type: 'image-viewer',
                                    title: `${entity.name}  PROFILE`,
                                    icon: 'IMG',
                                    props: {
                                        key: `image-viewer-profile-${entity.id}`,
                                        images: [profileImage],
                                        initialIndex: 0,
                                    },
                                    size: { width: 600, height: 520 },
                                })}
                            >
                                <img src={profileImage.thumbnail_url ?? profileImage.url} alt={entity.name} className="size-full object-cover" />
                            </button>
                        ) : (
                            <div className="flex size-full items-center justify-center bg-[var(--arc-surface-alt)]">
                                <TypeIcon entityType={entity.entity_type} size="md" />
                            </div>
                        )}
                    </div>

                    {/* Name + Meta */}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <TypeIcon entityType={entity.entity_type} size="md" showLabel />
                            <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">/ SUBJECT #{dossierNumber}</span>
                            {entity.is_featured && (
                                <span className="flex items-center gap-1 rounded-full bg-[var(--arc-warning)]/12 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--arc-warning)]">
                                    <Shield className="size-2.5" />
                                    Priority
                                </span>
                            )}
                            {entity.tags?.map((tag) => (
                                <span
                                    key={tag.id}
                                    className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    style={{ color: tag.color ?? 'var(--arc-text-muted)', backgroundColor: `${tag.color ?? '#6B7280'}12` }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                        {/* arc-heading-accent */}
                        <h1 className="border-b-2 border-[var(--arc-accent)] mt-0.5 mb-1 inline-block text-base font-bold text-[var(--arc-text)]">
                            {entity.name}
                        </h1>
                        {entity.short_description && (
                            <p className="line-clamp-2 text-xs leading-snug text-[var(--arc-text-muted)]">{entity.short_description}</p>
                        )}
                        {entity.aliases && entity.aliases.length > 0 && (
                            <EntityAliases aliases={entity.aliases} />
                        )}
                    </div>
                </div>

                {/*  Tab Navigation  */}
                {/* tabs are overflowing */}
                <div className="mt-2">
                    {tabs.length > 1 && (
                        <div className="relative flex shrink-0 items-center bg-[var(--arc-surface)]">
                        <button
                            className="flex size-7 shrink-0 items-center justify-center text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                            onClick={() => scroll(-150)}
                        >
                            <ChevronLeftIcon className="size-3" />
                        </button>

                        <div ref={tabsRef} className="arc-tabs flex-1 overflow-x-auto scroll-smooth px-1" style={{ scrollbarWidth: "none" }}>
                            {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className="arc-tab"
                                data-active={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.count != null && <span className="arc-tab-badge">{tab.count}</span>}
                            </button>
                            ))}
                        </div>

                        <button
                            className="flex size-7 shrink-0 items-center justify-center text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                            onClick={() => scroll(150)}
                        >
                            <ChevronRightIcon className="size-3" />
                        </button>
                        </div>
                    )}
                </div>
            </div>

            {/*  Body  */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--arc-bg)]">
                <div className="arc-animate-slide-up space-y-5 p-4" key={activeTab}>
                        {activeTab === 'overview' && (
                            <>
                                {isMapEntity && mapParentEntityId != null && (
                                    <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-4">
                                        <div className="mb-3 flex items-center gap-2 border-b border-[var(--arc-border)] pb-2">
                                            <MapPin className="size-3 text-[var(--arc-accent)]" />
                                            <span className="arc-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--arc-accent)]">LOCATION INTELLIGENCE</span>
                                        </div>
                                        <p className="mb-3 text-xs text-[var(--arc-text-muted)]">
                                            This is an interactive location map. Use the viewer to explore floors, markers, and regions.
                                        </p>
                                        <button
                                            className="flex items-center gap-2 rounded border border-[var(--arc-accent)]/40 bg-[var(--arc-accent)]/5 px-3 py-1.5 text-xs text-[var(--arc-accent)] transition-colors hover:bg-[var(--arc-accent)]/10"
                                            onClick={() =>
                                                openWindow({
                                                    type: 'map-viewer',
                                                    title: `MAP  ${entity.name.toUpperCase()}`,
                                                    icon: 'MAP',
                                                    props: {
                                                        key: `map-${universeId}-${mapParentEntityId}-${entity.id}`,
                                                        universeId,
                                                        entityId: mapParentEntityId,
                                                        mapId: entity.id,
                                                    },
                                                    size: { width: 800, height: 600 },
                                                })
                                            }
                                        >
                                            <MapPin className="size-3" />
                                            Open Map Viewer
                                        </button>
                                    </div>
                                )}
                                {entity.content && (
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-8">
                                            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-4">
                                                <div className="mb-2 flex items-center gap-2 border-b border-[var(--arc-border)] pb-2">
                                                    <span className="arc-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--arc-accent)]">OVERVIEW</span>
                                                </div>
                                                <div className="prose prose-sm max-w-none text-[var(--arc-text)]" dangerouslySetInnerHTML={{ __html: entity.content }} />
                                            </div>
                                            {/* <EntitySections sections={entity.sections} universeId={universeId} /> */}
                                        </div>
                                        <div className="col-span-4">
                                            <div className="space-y-4">
                                                {entity.attributes?.length > 0 && <EntityInfobox attributes={entity.attributes} />}
                                                {entity.timelines?.length > 0 && <EntityTimelineStrip timelines={entity.timelines} universeId={universeId} />}
                                                {entity.media_sources?.length > 0 && <EntityMedia mediaSources={entity.media_sources} />}
                                                {(() => { const gi = entity.images?.filter((img) => img.type === 'gallery') ?? []; return gi.length > 0 ? <EntityGallery images={gi} galleryKey={`${entity.id}-overview`} galleryTitle={`${entity.name}  GALLERY`} /> : null; })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {tabs.length <= 1 && entity.sections?.length > 0 && <EntitySections sections={entity.sections} universeId={universeId} />}
                                {tabs.length <= 1 && (
                                    <>
                                        {(entity.outgoing_relations?.length > 0 || entity.incoming_relations?.length > 0) && (
                                            <EntityRelations outgoing={entity.outgoing_relations} incoming={entity.incoming_relations} currentEntityId={entity.id} universeId={universeId} />
                                        )}
                                        {entity.infection_records?.length > 0 && <EntityInfectionRecords records={entity.infection_records} universeId={universeId} />}
                                        {entity.mutation_stages?.length > 0 && <EntityMutationStages stages={entity.mutation_stages} universeId={universeId} />}
                                        {entity.affiliation_history?.length > 0 && <EntityAffiliationHistory history={entity.affiliation_history} universeId={universeId} />}
                                        {entity.power_profiles?.length > 0 && <EntityPowerProfiles profiles={entity.power_profiles} universeId={universeId} />}
                                        {entity.consciousness_records?.length > 0 && <EntityConsciousnessRecords records={entity.consciousness_records} universeId={universeId} />}
                                        {entity.intelligence_records?.length > 0 && <EntityIntelligenceRecords records={entity.intelligence_records} universeId={universeId} />}
                                        {entity.death_records?.length > 0 && <EntityDeathRecords records={entity.death_records} universeId={universeId} />}
                                        {(entity.transmission_participants?.length > 0 || entity.transmission_records?.length > 0) && <EntityTransmissionLog participants={entity.transmission_participants ?? []} records={entity.transmission_records ?? []} universeId={universeId} />}
                                        {entity.quotes?.length > 0 && <EntityQuotes quotes={entity.quotes} />}
                                    </>
                                )}
                            </>
                        )}
                        {activeTab === 'sections' && entity.sections && <EntitySections sections={entity.sections} universeId={universeId} />}
                        {activeTab === 'relations' && <EntityRelations outgoing={entity.outgoing_relations} incoming={entity.incoming_relations} currentEntityId={entity.id} universeId={universeId} />}
                        {activeTab === 'infections' && entity.infection_records && <EntityInfectionRecords records={entity.infection_records} universeId={universeId} />}
                        {activeTab === 'mutations' && entity.mutation_stages && <EntityMutationStages stages={entity.mutation_stages} universeId={universeId} />}
                        {activeTab === 'affiliations' && entity.affiliation_history && <EntityAffiliationHistory history={entity.affiliation_history} universeId={universeId} />}
                        {activeTab === 'powers' && entity.power_profiles && <EntityPowerProfiles profiles={entity.power_profiles} universeId={universeId} />}
                        {activeTab === 'quotes' && entity.quotes && <EntityQuotes quotes={entity.quotes} />}
                        {activeTab === 'consciousness' && entity.consciousness_records && <EntityConsciousnessRecords records={entity.consciousness_records} universeId={universeId} />}
                        {activeTab === 'intelligence' && entity.intelligence_records && <EntityIntelligenceRecords records={entity.intelligence_records} universeId={universeId} />}
                        {activeTab === 'deaths' && entity.death_records && <EntityDeathRecords records={entity.death_records} universeId={universeId} />}
                        {activeTab === 'transmissions' && <EntityTransmissionLog participants={entity.transmission_participants ?? []} records={entity.transmission_records ?? []} universeId={universeId} />}
                        {activeTab === 'maps' && entity.maps && <EntityMaps maps={entity.maps} universeId={universeId} entityId={entity.id} />}
                        {activeTab === 'map-viewer' && isMapEntity && mapParentEntityId != null && (
                            <div className="-m-4" style={{ height: '520px' }}>
                                <EntityMapViewer universeId={universeId} entityId={mapParentEntityId} mapId={entity.id} />
                            </div>
                        )}
                        {activeTab === 'gallery' && (() => { const gi = entity.images?.filter((img) => img.type === 'gallery') ?? []; return gi.length > 0 ? <EntityGallery images={gi} galleryKey={`${entity.id}-gallery`} galleryTitle={`${entity.name}  GALLERY`} /> : null; })()}

                </div>
            </div>

            {/*  Footer  */}
            <div className="flex shrink-0 items-center justify-between border-t-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-4 py-1.5">
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">DOSSIER #{dossierNumber}</span>
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    UPDATED: {new Date(entity.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase()}
                </span>
            </div>
        </div>
    );
}


function ActionButton({
  icon,
  title,
  onClick,
  active = false,
  variant = "accent",
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
  variant?: "accent" | "warning"
}) {
  const baseClasses = "flex size-6 items-center justify-center rounded transition-all"
  const variantClasses = {
    accent: active
      ? "bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]"
      : "text-[var(--arc-text-muted)] hover:bg-[var(--arc-accent)]/5 hover:text-[var(--arc-accent)]",
    warning: active
      ? "bg-[var(--arc-warning)]/10 text-[var(--arc-warning)]"
      : "text-[var(--arc-text-muted)] hover:bg-[var(--arc-warning)]/5 hover:text-[var(--arc-warning)]",
  }

  return (
    <button className={cn(baseClasses, variantClasses[variant])} title={title} onClick={onClick}>
      {icon}
    </button>
  )
}

function ContentPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--arc-border)] bg-[var(--arc-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--arc-border)] px-3 py-2">
        <div className="h-3 w-0.5 rounded-full bg-[var(--arc-accent)]" />
        <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
