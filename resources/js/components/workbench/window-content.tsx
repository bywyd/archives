import { lazy, Suspense } from 'react';
import type { WindowState } from '@/stores/window-store';
// import { EntityConnectionsGraph } from '../archives/entity-connections-graph';

const AdvancedSearchBriefing  = lazy(() => import('@/components/archives/advanced-search-briefing').then((m) => ({ default: m.AdvancedSearchBriefing })));
const EntityComparison        = lazy(() => import('@/components/archives/entity-comparison').then((m) => ({ default: m.EntityComparison })));
const EntityConnectionsGraph  = lazy(() => import('@/components/archives/entity-connections-graph').then((m) => ({ default: m.EntityConnectionsGraph })));
const EntityDiscovery         = lazy(() => import('@/components/archives/entity-discovery').then((m) => ({ default: m.EntityDiscovery })));
const EntityDossier           = lazy(() => import('@/components/archives/entity-dossier').then((m) => ({ default: m.EntityDossier })));
const EntityEditor            = lazy(() => import('@/components/archives/entity-editor').then((m) => ({ default: m.EntityEditor })));
const EntityList              = lazy(() => import('@/components/archives/entity-list').then((m) => ({ default: m.EntityList })));
const MediaSourceDetail       = lazy(() => import('@/components/archives/media-source-detail').then((m) => ({ default: m.MediaSourceDetail })));
const MediaSourceEditor       = lazy(() => import('@/components/archives/media-source-editor').then((m) => ({ default: m.MediaSourceEditor })));
const MediaSourcesPanel       = lazy(() => import('@/components/archives/media-sources-panel').then((m) => ({ default: m.MediaSourcesPanel })));
const RecentlyViewed          = lazy(() => import('@/components/archives/recently-viewed').then((m) => ({ default: m.RecentlyViewed })));
const SearchBriefingWindow    = lazy(() => import('@/components/archives/search-briefing-window').then((m) => ({ default: m.SearchBriefingWindow })));
const SearchConnectionsWindow = lazy(() => import('@/components/archives/search-connections-window').then((m) => ({ default: m.SearchConnectionsWindow })));
const SearchSubjectsWindow    = lazy(() => import('@/components/archives/search-subjects-window').then((m) => ({ default: m.SearchSubjectsWindow })));
const SearchTerminal          = lazy(() => import('@/components/archives/search-terminal').then((m) => ({ default: m.SearchTerminal })));
const TimelineEditor          = lazy(() => import('@/components/archives/timeline-editor').then((m) => ({ default: m.TimelineEditor })));
const TimelineView            = lazy(() => import('@/components/archives/timeline-view').then((m) => ({ default: m.TimelineView })));
const UniverseDashboard       = lazy(() => import('@/components/archives/universe-dashboard').then((m) => ({ default: m.UniverseDashboard })));
const ImageViewerWindow       = lazy(() => import('@/components/archives/image-viewer-window').then((m) => ({ default: m.ImageViewerWindow })));
const EntityMapViewer          = lazy(() => import('@/components/archives/entity-map-viewer').then((m) => ({ default: m.EntityMapViewer })));
const EntityMapEditor          = lazy(() => import('@/components/archives/map-editor').then((m) => ({ default: m.EntityMapEditor })));
const LicenseDisclaimer       = lazy(() => import('../legal/license-disclaimer').then((m) => ({ default: m.LicenseDisclaimer })));
const LoginWindow             = lazy(() => import('@/components/auth/login-window').then((m) => ({ default: m.LoginWindow })));
const EntityRevisionsWindow   = lazy(() => import('@/components/archives/entity-revisions-window').then((m) => ({ default: m.EntityRevisionsWindow })));
const EventReconstruction     = lazy(() => import('@/components/archives/event-reconstruction').then((m) => ({ default: m.EventReconstruction })));
const TemporalSlider          = lazy(() => import('@/components/archives/temporal-slider').then((m) => ({ default: m.TemporalSlider })));
const EntityBriefing          = lazy(() => import('@/components/archives/entity-briefing').then((m) => ({ default: m.EntityBriefing })));

function WindowFallback() {
    return (
        <div className="flex h-full items-center justify-center gap-2 font-mono text-[10px] tracking-widest uppercase text-(--arc-text-muted)">
            <span className="inline-block w-1.5 h-1.5 animate-pulse bg-(--arc-accent)/50" />
            Loading
        </div>
    );
}

type Props = {
    window: WindowState;
};

export function WindowContent({ window: win }: Props) {
    return (
        <Suspense fallback={<WindowFallback />}>
            {renderContent(win)}
        </Suspense>
    );
}

function renderContent(win: WindowState) {
    switch (win.type) {
        case 'search':
            return <SearchTerminal {...win.props} />;
        case 'advanced-search':
            return (
                <AdvancedSearchBriefing
                    universeId={win.props.universeId as number | undefined}
                    initialQuery={win.props.initialQuery as string | undefined}
                />
            );
        case 'entity-dossier':
            return (
                <EntityDossier
                    universeId={win.props.universeId as number}
                    entitySlug={win.props.entitySlug as string}
                />
            );
        case 'universe-dashboard':
            return (
                <UniverseDashboard
                    universeId={win.props.universeId as number}
                />
            );
        case 'timeline':
            return (
                <TimelineView
                    universeId={win.props.universeId as number}
                    timelineId={win.props.timelineId as number}
                />
            );
        case 'entity-list':
            return (
                <EntityList
                    universeId={win.props.universeId as number}
                    typeSlug={win.props.typeSlug as string | undefined}
                />
            );
        case 'media-sources':
            return (
                <MediaSourcesPanel
                    universeId={win.props.universeId as number}
                />
            );
        case 'media-source-detail':
            return (
                <MediaSourceDetail
                    universeId={win.props.universeId as number}
                    mediaSourceId={win.props.mediaSourceId as number}
                />
            );
        case 'discovery':
            return (
                <EntityDiscovery
                    universeId={win.props.universeId as number | undefined}
                />
            );
        case 'recently-viewed':
            return (
                <div className="h-full overflow-y-auto p-4">
                    <RecentlyViewed
                        universeId={win.props.universeId as number | undefined}
                        maxItems={30}
                        showPinned={true}
                        showClearButton={true}
                    />
                </div>
            );
        case 'connections-graph':
            return (
                <EntityConnectionsGraph
                    universeId={win.props.universeId as number}
                    entitySlug={win.props.entitySlug as string}
                />
            );
        case 'entity-comparison':
            return (
                <EntityComparison
                    universeId={win.props.universeId as number}
                    initialEntitySlugs={win.props.initialEntitySlugs as string[] | undefined}
                />
            );
        case 'entity-editor':
            return (
                <EntityEditor
                    universeId={win.props.universeId as number}
                    entityId={win.props.entityId as number | undefined}
                    entitySlug={win.props.entitySlug as string | undefined}
                    initialTab={win.props.initialTab as string | undefined}
                />
            );
        case 'timeline-editor':
            return (
                <TimelineEditor
                    universeId={win.props.universeId as number}
                    timelineId={win.props.timelineId as number | undefined}
                />
            );
        case 'media-source-editor':
            return (
                <MediaSourceEditor
                    universeId={win.props.universeId as number}
                    mediaSourceId={win.props.mediaSourceId as number | undefined}
                />
            );
        case 'search-briefing':
            return (
                <SearchBriefingWindow
                    briefing={win.props.briefing as any}
                    queryRaw={win.props.queryRaw as string}
                />
            );
        case 'search-subjects':
            return (
                <SearchSubjectsWindow
                    results={win.props.results as any}
                    subjectProfiles={win.props.subjectProfiles as any}
                    universeId={win.props.universeId as number}
                />
            );
        case 'search-connections':
            return (
                <SearchConnectionsWindow
                    nodes={win.props.nodes as any}
                    edges={win.props.edges as any}
                    keyConnections={win.props.keyConnections as any}
                    results={win.props.results as any}
                    universeId={win.props.universeId as number}
                />
            );
        case 'license-disclaimer':
            return <LicenseDisclaimer />;
        case 'login':
            return <LoginWindow />;
        case 'image-viewer':
            return (
                <ImageViewerWindow
                    images={win.props.images as import('@/types/api').ApiImage[]}
                    initialIndex={win.props.initialIndex as number | undefined}
                />
            );
        case 'map-viewer':
            return (
                <EntityMapViewer
                    universeId={win.props.universeId as number}
                    entityId={win.props.entityId as number}
                    mapId={win.props.mapId as number | string}
                />
            );
        case 'map-editor':
            return (
                <EntityMapEditor
                    universeId={win.props.universeId as number}
                    entityId={win.props.entityId as number}
                    mapId={win.props.mapId as number | undefined}
                />
            );
        case 'entity-revisions':
            return (
                <EntityRevisionsWindow
                    universeId={win.props.universeId as number}
                    entityId={win.props.entityId as number}
                    entityName={win.props.entityName as string}
                />
            );
        case 'event-reconstruction':
            return (
                <EventReconstruction
                    universeId={win.props.universeId as number}
                    incidentSlug={win.props.incidentSlug as string}
                    initialEventSlug={win.props.initialEventSlug as string | undefined}
                />
            );
        case 'temporal-slider':
            return (
                <TemporalSlider
                    universeId={win.props.universeId as number}
                    incidentSlug={win.props.incidentSlug as string}
                />
            );
        case 'entity-briefing':
            return (
                <EntityBriefing
                    universeId={win.props.universeId as number}
                    entitySlug={win.props.entitySlug as string}
                />
            );
        default:
            return (
                <div className="flex h-full items-center justify-center text-(--arc-text-muted)">
                    <p>Unknown window type: {win.type}</p>
                </div>
            );
    }
}
