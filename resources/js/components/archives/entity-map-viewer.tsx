import {
    AlertCircle,
    ArrowRight,
    ChevronLeft,
    Edit,
    ExternalLink,
    Eye,
    EyeOff,
    Layers,
    Loader2,
    MapPin,
    Maximize2,
    User,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageOverlay, MapContainer, Marker, Polygon, Tooltip as LeafletTooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import {
    MARKER_COLORS,
    REGION_COLORS,
    MARKER_GLYPHS,
    createMarkerPin,
    pctToLatLng,
    regionPointsToLatLngs,
    getEntityProfileUrl,
    floorLabel,
    floorLabelLong,
} from '@/lib/map-utils';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiEntityMap,
    ApiEntityMapFloor,
    ApiEntityMapMarker,
    ApiEntityMapRegion,
    ApiEntityRelation,
    ApiEntitySummary,
} from '@/types/api';

//  Map controls 
function MapControls({ imageBounds }: { imageBounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    return (
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1">
            {(
                [
                    { icon: <ZoomIn className="size-3.5" />, title: 'Zoom in', fn: () => map.zoomIn() },
                    { icon: <ZoomOut className="size-3.5" />, title: 'Zoom out', fn: () => map.zoomOut() },
                    {
                        icon: <Maximize2 className="size-3.5" />,
                        title: 'Fit to view',
                        fn: () => map.fitBounds(imageBounds as L.LatLngBoundsLiteral),
                    },
                ] as const
            ).map(({ icon, title, fn }) => (
                <button
                    key={title}
                    title={title}
                    className="flex size-7 items-center justify-center rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]/90 text-[var(--arc-text)] shadow backdrop-blur-sm transition-colors hover:border-[var(--arc-accent)]/40 hover:text-[var(--arc-accent)]"
                    onClick={fn}
                >
                    {icon}
                </button>
            ))}
        </div>
    );
}

function BgClickHandler({ onBgClick }: { onBgClick: () => void }) {
    useMapEvents({ click: onBgClick });
    return null;
}

function MapResizeHandler() {
    const map = useMap();
    useEffect(() => {
        const container = map.getContainer();
        const ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(container);
        return () => ro.disconnect();
    }, [map]);
    return null;
}

//  SelectedItem type 
type SelectedItem =
    | { type: 'marker'; data: ApiEntityMapMarker }
    | { type: 'region'; data: ApiEntityMapRegion };

type Props = {
    universeId: number;
    entityId: number;
    mapId: number | string;
    onEntityNavigate?: (slug: string) => void;
    editLinkHref?: string;
};

// ══════════════════════════════════════════════════════════════════════
//  Main component
// ══════════════════════════════════════════════════════════════════════
export function EntityMapViewer({ universeId, entityId, mapId, onEntityNavigate, editLinkHref }: Props) {
    const [mapData, setMapData] = useState<ApiEntityMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
    const [visibleLayers, setVisibleLayers] = useState({ markers: true, regions: true });
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [legendOpen, setLegendOpen] = useState(false);
    const [hiddenMarkerTypes, setHiddenMarkerTypes] = useState<Set<string>>(new Set());
    const [hiddenRegionTypes, setHiddenRegionTypes] = useState<Set<string>>(new Set());
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.fetchEntityMap(universeId, entityId, mapId)
            .then((res) => {
                if (!cancelled) {
                    setMapData(res.data);
                    if (res.data.floors?.length) {
                        const gf =
                            res.data.floors.find((f) => f.floor_number === 1) ??
                            res.data.floors.find((f) => f.floor_number === 0) ??
                            res.data.floors[0];
                        setActiveFloorId(gf.id);
                    }
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load map');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [universeId, entityId, mapId]);

    const activeFloor = useMemo(
        () => mapData?.floors?.find((f) => f.id === activeFloorId) ?? null,
        [mapData, activeFloorId],
    );

    const floorImage = useMemo(() => activeFloor?.images?.[0] ?? null, [activeFloor]);

    const imageBounds = useMemo<L.LatLngBoundsExpression>(() => {
        const w = activeFloor?.image_width || 1000;
        const h = activeFloor?.image_height || 1000;
        return [[0, 0], [h, w]];
    }, [activeFloor]);

    const sortedFloors = useMemo(
        () => [...(mapData?.floors ?? [])].sort((a, b) => a.floor_number - b.floor_number),
        [mapData],
    );

    // Build a map of entity_id → markers on this floor for cross-referencing
    const floorEntityMarkerMap = useMemo(() => {
        const m = new Map<number, ApiEntityMapMarker>();
        activeFloor?.markers?.forEach((marker) => {
            if (marker.entity_id) m.set(marker.entity_id, marker);
        });
        return m;
    }, [activeFloor]);

    // Compute type counts for the legend
    const markerTypeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        activeFloor?.markers?.forEach((m) => {
            counts.set(m.marker_type, (counts.get(m.marker_type) || 0) + 1);
        });
        return counts;
    }, [activeFloor]);

    const regionTypeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        activeFloor?.regions?.forEach((r) => {
            counts.set(r.region_type, (counts.get(r.region_type) || 0) + 1);
        });
        return counts;
    }, [activeFloor]);

    // Filtered markers/regions based on type visibility
    const visibleMarkers = useMemo(
        () => activeFloor?.markers?.filter((m) => !hiddenMarkerTypes.has(m.marker_type)) ?? [],
        [activeFloor, hiddenMarkerTypes],
    );

    const visibleRegions = useMemo(
        () => activeFloor?.regions?.filter((r) => !hiddenRegionTypes.has(r.region_type)) ?? [],
        [activeFloor, hiddenRegionTypes],
    );

    const handleEntityClick = useCallback(
        (slug: string | undefined) => {
            if (!slug) return;
            if (onEntityNavigate) {
                onEntityNavigate(slug);
            } else {
                openWindow({
                    type: 'entity-dossier',
                    title: 'DOSSIER',
                    icon: 'D',
                    props: { key: `dossier-${universeId}-${slug}`, universeId, entitySlug: slug },
                });
            }
        },
        [openWindow, universeId, onEntityNavigate],
    );

    const handleOpenEditor = useCallback(() => {
        if (!mapData) return;
        openWindow({
            type: 'map-editor',
            title: `EDIT  ${mapData.name.toUpperCase()}`,
            icon: 'ED',
            props: {
                key: `map-editor-${universeId}-${entityId}-${mapData.id}`,
                universeId,
                entityId,
                mapId: mapData.id,
            },
            maximized: true,
        });
    }, [openWindow, mapData, universeId, entityId]);

    const handleSelect = useCallback((item: SelectedItem) => setSelectedItem(item), []);
    const handleClearSelection = useCallback(() => setSelectedItem(null), []);
    const handleFloorChange = useCallback((id: number) => {
        setActiveFloorId(id);
        setSelectedItem(null);
        setHiddenMarkerTypes(new Set());
        setHiddenRegionTypes(new Set());
    }, []);

    const handleSelectMarkerById = useCallback(
        (entityId: number) => {
            const marker = activeFloor?.markers?.find((m) => m.entity_id === entityId);
            if (marker) setSelectedItem({ type: 'marker', data: marker });
        },
        [activeFloor],
    );

    const toggleMarkerType = useCallback((type: string) => {
        setHiddenMarkerTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    }, []);

    const toggleRegionType = useCallback((type: string) => {
        setHiddenRegionTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    }, []);

    //  States 
    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--arc-bg)]">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] tracking-[0.3em] text-[var(--arc-text-muted)]">
                    LOADING MAP DATA
                </span>
            </div>
        );
    }

    if (error || !mapData) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--arc-bg)]">
                <AlertCircle className="size-7 text-[var(--arc-danger)]" />
                <p className="text-sm font-medium text-[var(--arc-danger)]">{error || 'Map not found'}</p>
            </div>
        );
    }

    if (!mapData.floors?.length || !activeFloor) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--arc-bg)]">
                <Layers className="size-7 opacity-20 text-[var(--arc-text-muted)]" />
                <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                    NO FLOOR DATA AVAILABLE
                </span>
            </div>
        );
    }

    const markerCount = activeFloor.markers?.length ?? 0;
    const regionCount = activeFloor.regions?.length ?? 0;

    return (
        <div className="flex h-full flex-col bg-[var(--arc-bg)]">
            {/*  Header  */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-[var(--arc-accent)]" />
                    <span className="arc-mono truncate text-[10px] font-bold tracking-[0.12em] text-[var(--arc-text)]">
                        {mapData.name.toUpperCase()}
                    </span>
                </div>

                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                    <button
                        className={cn(
                            'arc-mono flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-wider transition-colors',
                            visibleLayers.markers
                                ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                        )}
                        onClick={() => setVisibleLayers((l) => ({ ...l, markers: !l.markers }))}
                        title="Toggle marker pins"
                    >
                        <MapPin className="size-2.5" />
                        PINS
                    </button>
                    <button
                        className={cn(
                            'arc-mono flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-wider transition-colors',
                            visibleLayers.regions
                                ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                        )}
                        onClick={() => setVisibleLayers((l) => ({ ...l, regions: !l.regions }))}
                        title="Toggle zone regions"
                    >
                        <Layers className="size-2.5" />
                        ZONES
                    </button>

                    {/* Legend toggle */}
                    {(markerCount > 0 || regionCount > 0) && (
                        <button
                            className={cn(
                                'arc-mono flex items-center gap-1 rounded px-2 py-0.5 text-[9px] tracking-wider transition-colors',
                                legendOpen
                                    ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                    : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                            )}
                            onClick={() => setLegendOpen((v) => !v)}
                            title="Toggle map legend"
                        >
                            {legendOpen ? <EyeOff className="size-2.5" /> : <Eye className="size-2.5" />}
                            LEGEND
                        </button>
                    )}

                    {editLinkHref ? (
                        <a
                            href={editLinkHref}
                            className="arc-mono flex items-center gap-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-0.5 text-[9px] tracking-wider text-[var(--arc-text-muted)] no-underline transition-colors hover:border-[var(--arc-accent)]/40 hover:text-[var(--arc-accent)]"
                            title="Open in Archives to edit"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Edit className="size-2.5" />
                            EDIT
                        </a>
                    ) : (
                        <button
                            className="arc-mono flex items-center gap-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-0.5 text-[9px] tracking-wider text-[var(--arc-text-muted)] transition-colors hover:border-[var(--arc-accent)]/40 hover:text-[var(--arc-accent)]"
                            title="Open in map editor"
                            onClick={handleOpenEditor}
                        >
                            <Edit className="size-2.5" />
                            EDIT
                        </button>
                    )}
                </div>
            </div>

            {/*  Floor tabs (enhanced with counts + image indicator)  */}
            {sortedFloors.length > 1 && (
                <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                    {sortedFloors.map((floor) => {
                        const label = floorLabel(floor.floor_number);
                        const fMarkers = floor.markers?.length ?? 0;
                        const fRegions = floor.regions?.length ?? 0;
                        const hasImage = !!floor.images?.length;
                        return (
                            <button
                                key={floor.id}
                                className={cn(
                                    'arc-mono group relative flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-[9px] font-semibold tracking-wider transition-all',
                                    floor.id === activeFloorId
                                        ? 'bg-[var(--arc-accent)] text-white shadow-sm'
                                        : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface)] hover:text-[var(--arc-text)]',
                                )}
                                onClick={() => handleFloorChange(floor.id)}
                                title={`${floor.name} - ${fMarkers} pins, ${fRegions} zones${hasImage ? '' : ' (no image)'}`}
                            >
                                {/* Image indicator dot */}
                                {hasImage && (
                                    <span
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            floor.id === activeFloorId
                                                ? 'bg-white/60'
                                                : 'bg-[var(--arc-accent)]/40',
                                        )}
                                    />
                                )}
                                <span className="shrink-0 text-[8px] opacity-70">{label}</span>
                                <span className="max-w-[96px] truncate">{floor.name}</span>
                                {/* Compact indicator counts */}
                                {(fMarkers > 0 || fRegions > 0) && (
                                    <span
                                        className={cn(
                                            'ml-0.5 text-[7px] opacity-60',
                                            floor.id === activeFloorId ? 'text-white/70' : '',
                                        )}
                                    >
                                        {fMarkers > 0 ? `${fMarkers}P` : ''}{fMarkers > 0 && fRegions > 0 ? '·' : ''}{fRegions > 0 ? `${fRegions}Z` : ''}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/*  Body  */}
            <div className="flex flex-1 overflow-hidden">
                {/* Legend panel (collapsible left sidebar) */}
                {legendOpen && (
                    <MapLegend
                        markerTypeCounts={markerTypeCounts}
                        regionTypeCounts={regionTypeCounts}
                        hiddenMarkerTypes={hiddenMarkerTypes}
                        hiddenRegionTypes={hiddenRegionTypes}
                        onToggleMarkerType={toggleMarkerType}
                        onToggleRegionType={toggleRegionType}
                        onClose={() => setLegendOpen(false)}
                    />
                )}

                {/* Leaflet map */}
                <div className="relative flex-1 overflow-hidden">
                    <MapContainer
                        key={activeFloorId ?? 'no-floor'}
                        crs={L.CRS.Simple}
                        bounds={imageBounds}
                        maxZoom={4}
                        minZoom={-3}
                        zoomSnap={0.25}
                        zoomDelta={0.5}
                        attributionControl={false}
                        style={{ height: '100%', width: '100%', background: 'var(--arc-surface-alt)' }}
                    >
                        {floorImage && <ImageOverlay url={floorImage.url} bounds={imageBounds} />}

                        {/* Rendered regions */}
                        {visibleLayers.regions &&
                            visibleRegions.map((region) => (
                                <RegionOverlay
                                    key={region.id}
                                    region={region}
                                    bounds={imageBounds}
                                    selected={
                                        selectedItem?.type === 'region' &&
                                        selectedItem.data.id === region.id
                                    }
                                    onSelect={handleSelect}
                                />
                            ))}

                        {/* Rendered markers */}
                        {visibleLayers.markers &&
                            visibleMarkers.map((marker) => (
                                <MarkerOverlay
                                    key={marker.id}
                                    marker={marker}
                                    bounds={imageBounds}
                                    selected={
                                        selectedItem?.type === 'marker' &&
                                        selectedItem.data.id === marker.id
                                    }
                                    onSelect={handleSelect}
                                />
                            ))}

                        <MapControls imageBounds={imageBounds} />
                        <BgClickHandler onBgClick={handleClearSelection} />
                        <MapResizeHandler />
                    </MapContainer>

                    {!floorImage && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="arc-map-grid-bg absolute inset-0" />
                            <div className="relative z-10 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]/80 px-3 py-2 text-center backdrop-blur-sm">
                                <Layers className="mx-auto mb-1 size-5 text-[var(--arc-text-muted)] opacity-30" />
                                <p className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">
                                    NO FLOOR IMAGE - SCHEMATIC MODE
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info panel - slides in from right when item selected */}
                {selectedItem && (
                    <InfoPanel
                        item={selectedItem}
                        universeId={universeId}
                        floorEntityMarkerMap={floorEntityMarkerMap}
                        onClose={handleClearSelection}
                        onOpenDossier={handleEntityClick}
                        onSelectMarkerByEntityId={handleSelectMarkerById}
                    />
                )}
            </div>

            {/*  Footer  */}
            <div className="flex shrink-0 items-center gap-4 border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                <span className="arc-mono text-[8px] font-semibold text-[var(--arc-text-muted)]">
                    {floorLabelLong(activeFloor.floor_number)}
                </span>
                {markerCount > 0 && (
                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                        {markerCount} PIN{markerCount !== 1 ? 'S' : ''}
                    </span>
                )}
                {regionCount > 0 && (
                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                        {regionCount} ZONE{regionCount !== 1 ? 'S' : ''}
                    </span>
                )}
                {hiddenMarkerTypes.size > 0 && (
                    <span className="arc-mono text-[8px] text-[var(--arc-warning)]">
                        {hiddenMarkerTypes.size} TYPE{hiddenMarkerTypes.size !== 1 ? 'S' : ''} HIDDEN
                    </span>
                )}
                {selectedItem && (
                    <span className="arc-mono ml-auto text-[8px] font-semibold text-[var(--arc-accent)]">
                        ● {selectedItem.data.name.toUpperCase()}
                    </span>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  Map Legend (left sidebar - type-level filter)
// ══════════════════════════════════════════════════════════════════════
function MapLegend({
    markerTypeCounts,
    regionTypeCounts,
    hiddenMarkerTypes,
    hiddenRegionTypes,
    onToggleMarkerType,
    onToggleRegionType,
    onClose,
}: {
    markerTypeCounts: Map<string, number>;
    regionTypeCounts: Map<string, number>;
    hiddenMarkerTypes: Set<string>;
    hiddenRegionTypes: Set<string>;
    onToggleMarkerType: (type: string) => void;
    onToggleRegionType: (type: string) => void;
    onClose: () => void;
}) {
    return (
        <div className="animate-in slide-in-from-left-2 flex w-48 shrink-0 flex-col overflow-hidden border-r border-[var(--arc-border)] bg-[var(--arc-surface)] duration-150">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] px-3 py-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    LEGEND
                </span>
                <button
                    className="rounded p-0.5 text-[var(--arc-text-muted)] transition-colors hover:text-[var(--arc-text)]"
                    onClick={onClose}
                >
                    <ChevronLeft className="size-3.5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {/* Marker types */}
                {markerTypeCounts.size > 0 && (
                    <div>
                        <div className="arc-mono mb-1.5 flex items-center gap-1 text-[8px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            <MapPin className="size-2.5" /> MARKER TYPES
                        </div>
                        <div className="space-y-0.5">
                            {Array.from(markerTypeCounts.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => {
                                    const hidden = hiddenMarkerTypes.has(type);
                                    const color = MARKER_COLORS[type] || '#94a3b8';
                                    return (
                                        <button
                                            key={type}
                                            className={cn(
                                                'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-all',
                                                hidden
                                                    ? 'opacity-40 hover:opacity-60'
                                                    : 'hover:bg-[var(--arc-surface-alt)]',
                                            )}
                                            onClick={() => onToggleMarkerType(type)}
                                            title={hidden ? `Show ${type} markers` : `Hide ${type} markers`}
                                        >
                                            <div
                                                className={cn('size-2.5 shrink-0 rounded-full border', hidden && 'border-dashed')}
                                                style={{ background: hidden ? 'transparent' : color, borderColor: color }}
                                            />
                                            <span className="arc-mono flex-1 truncate text-[8px] font-semibold tracking-wider text-[var(--arc-text)]">
                                                {type.replace(/-/g, ' ').toUpperCase()}
                                            </span>
                                            <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">{count}</span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Region types */}
                {regionTypeCounts.size > 0 && (
                    <div>
                        <div className="arc-mono mb-1.5 flex items-center gap-1 text-[8px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                            <Layers className="size-2.5" /> ZONE TYPES
                        </div>
                        <div className="space-y-0.5">
                            {Array.from(regionTypeCounts.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => {
                                    const hidden = hiddenRegionTypes.has(type);
                                    const color = REGION_COLORS[type] || '#94a3b8';
                                    return (
                                        <button
                                            key={type}
                                            className={cn(
                                                'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-all',
                                                hidden
                                                    ? 'opacity-40 hover:opacity-60'
                                                    : 'hover:bg-[var(--arc-surface-alt)]',
                                            )}
                                            onClick={() => onToggleRegionType(type)}
                                            title={hidden ? `Show ${type} zones` : `Hide ${type} zones`}
                                        >
                                            <div
                                                className={cn('size-2.5 shrink-0 rounded-sm border', hidden && 'border-dashed')}
                                                style={{ background: hidden ? 'transparent' : color + '55', borderColor: color }}
                                            />
                                            <span className="arc-mono flex-1 truncate text-[8px] font-semibold tracking-wider text-[var(--arc-text)]">
                                                {type.replace(/-/g, ' ').toUpperCase()}
                                            </span>
                                            <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">{count}</span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  Info panel (right sidebar) - enriched with entity relations
// ══════════════════════════════════════════════════════════════════════
function InfoPanel({
    item,
    universeId,
    floorEntityMarkerMap,
    onClose,
    onOpenDossier,
    onSelectMarkerByEntityId,
}: {
    item: SelectedItem;
    universeId: number;
    floorEntityMarkerMap: Map<number, ApiEntityMapMarker>;
    onClose: () => void;
    onOpenDossier: (slug?: string) => void;
    onSelectMarkerByEntityId: (entityId: number) => void;
}) {
    const color =
        item.type === 'marker'
            ? (item.data.color || MARKER_COLORS[item.data.marker_type] || '#60a5fa')
            : (item.data.color || REGION_COLORS[item.data.region_type] || '#60a5fa');

    const typeLabel =
        item.type === 'marker'
            ? item.data.marker_type.replace(/-/g, ' ').toUpperCase()
            : item.data.region_type.replace(/-/g, ' ').toUpperCase();

    const entity = item.data.entity;
    const profileUrl = getEntityProfileUrl(entity);

    // Lazy-load relations when the panel opens - use the dedicated relations
    // endpoint rather than the heavy full-entity endpoint.
    type RelationsData = { outgoing: ApiEntityRelation[]; incoming: ApiEntityRelation[] };
    const [relationsData, setRelationsData] = useState<RelationsData | null>(null);
    const [loadingRelations, setLoadingRelations] = useState(false);

    useEffect(() => {
        setRelationsData(null);
        if (!entity?.id) return;
        setLoadingRelations(true);
        api.fetchEntityRelations(universeId, entity.id)
            .then((res) => setRelationsData(res))
            .catch(() => {/* silent - relations section just won't show */})
            .finally(() => setLoadingRelations(false));
    }, [universeId, entity?.id]);

    const relations = useMemo(() => {
        if (!relationsData) return [];
        const entries: {
            key: string;
            label: string;
            entity: ApiEntitySummary;
            direction: 'outgoing' | 'incoming';
            status: string | null | undefined;
            onThisFloor: boolean;
        }[] = [];

        relationsData.outgoing?.forEach((rel) => {
            entries.push({
                key: `out-${rel.id}`,
                label: rel.relation_type?.name ?? 'RELATED TO',
                entity: rel.to_entity,
                direction: 'outgoing',
                status: rel.status,
                onThisFloor: floorEntityMarkerMap.has(rel.to_entity.id),
            });
        });

        relationsData.incoming?.forEach((rel) => {
            entries.push({
                key: `in-${rel.id}`,
                label: rel.relation_type?.inverse_name ?? rel.relation_type?.name ?? 'RELATED TO',
                entity: rel.from_entity,
                direction: 'incoming',
                status: rel.status,
                onThisFloor: floorEntityMarkerMap.has(rel.from_entity.id),
            });
        });

        return entries;
    }, [relationsData, floorEntityMarkerMap]);

    // Group relations by label
    const relationGroups = useMemo(() => {
        const groups = new Map<string, typeof relations>();
        relations.forEach((r) => {
            if (!groups.has(r.label)) groups.set(r.label, []);
            groups.get(r.label)!.push(r);
        });
        return groups;
    }, [relations]);

    return (
        <div className="animate-in slide-in-from-right-2 flex w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--arc-border)] bg-[var(--arc-surface)] duration-150">
            {/* Panel header */}
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--arc-border)] px-3 py-2.5">
                <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="size-2 shrink-0 rounded-full border border-[rgba(0,0,0,0.08)]"
                            style={{ background: color }}
                        />
                        <span className="arc-mono text-[8px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                            {item.type === 'marker' ? 'MARKER PIN' : 'ZONE REGION'}
                        </span>
                    </div>
                    <h3 className="arc-mono mt-0.5 truncate text-[11px] font-bold tracking-wide text-[var(--arc-text)]">
                        {item.data.name.toUpperCase()}
                    </h3>
                    <span
                        className="arc-mono mt-0.5 inline-block rounded px-1.5 py-0.5 text-[8px] font-semibold tracking-wider"
                        style={{ background: color + '22', color }}
                    >
                        {typeLabel}
                    </span>
                </div>
                <button
                    className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-surface-alt)] hover:text-[var(--arc-text)]"
                    onClick={onClose}
                    title="Close"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Entity card (enhanced with profile image) */}
                {entity && (
                    <div className="border-b border-[var(--arc-border)] p-3">
                        <div className="arc-mono mb-2 text-[8px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                            LINKED ENTITY
                        </div>
                        <div className="flex items-start gap-2.5">
                            {/* Avatar - prefer profile image */}
                            <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                                {profileUrl ? (
                                    <img
                                        src={profileUrl}
                                        alt={entity.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center">
                                        {entity.entity_type ? (
                                            <TypeIcon entityType={entity.entity_type} size="md" />
                                        ) : (
                                            <User className="size-5 text-[var(--arc-text-muted)] opacity-40" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Text details */}
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold leading-tight text-[var(--arc-text)]">
                                    {entity.name}
                                </div>
                                {entity.entity_type && (
                                    <span
                                        className="arc-mono mt-0.5 inline-block rounded px-1.5 py-0.5 text-[8px] font-semibold"
                                        style={{
                                            background: (entity.entity_type.color || '#2563eb') + '18',
                                            color: entity.entity_type.color || 'var(--arc-accent)',
                                        }}
                                    >
                                        {entity.entity_type.name.toUpperCase()}
                                    </span>
                                )}
                                {entity.entity_status && (
                                    <div className="mt-1">
                                        <StatusBadge status={entity.entity_status} />
                                    </div>
                                )}
                                {entity.short_description && (
                                    <p className="mt-1 line-clamp-3 text-[9px] leading-relaxed text-[var(--arc-text-muted)]">
                                        {entity.short_description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            className="arc-mono mt-2.5 flex w-full items-center justify-center gap-1.5 rounded border border-[var(--arc-accent)]/25 py-1.5 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] transition-colors hover:bg-[var(--arc-accent)]/8"
                            onClick={() => onOpenDossier(entity.slug)}
                        >
                            <ExternalLink className="size-3" />
                            OPEN DOSSIER
                        </button>
                    </div>
                )}

                {/* Description */}
                {item.data.description && (
                    <div className="border-b border-[var(--arc-border)] p-3">
                        <div className="arc-mono mb-1.5 text-[8px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                            NOTES
                        </div>
                        <p className="text-[10px] leading-relaxed text-[var(--arc-text)]">
                            {item.data.description}
                        </p>
                    </div>
                )}

                {/* Entity Relations (lazy-loaded) */}
                {entity && (
                    <div className="border-b border-[var(--arc-border)] p-3">
                        <div className="arc-mono mb-1.5 flex items-center gap-1.5 text-[8px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                            RELATIONS
                            {loadingRelations && <Loader2 className="size-2.5 animate-spin text-[var(--arc-accent)]" />}
                            {relations.length > 0 && (
                                <span className="arc-mono text-[7px] text-[var(--arc-accent)]">{relations.length}</span>
                            )}
                        </div>

                        {!loadingRelations && relations.length === 0 && (
                            <p className="arc-mono text-[8px] text-[var(--arc-text-muted)]">No known relations.</p>
                        )}

                        {relationGroups.size > 0 && (
                            <div className="space-y-2">
                                {Array.from(relationGroups.entries()).map(([label, rels]) => (
                                    <div key={label}>
                                        <div className="arc-mono mb-0.5 text-[7px] font-bold tracking-wider text-[var(--arc-accent)]/70">
                                            {label.toUpperCase()} <span className="text-[var(--arc-text-muted)]">× {rels.length}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {rels.map((rel) => {
                                                const relProfileUrl = getEntityProfileUrl(rel.entity);
                                                return (
                                                    <button
                                                        key={rel.key}
                                                        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-[var(--arc-surface-alt)]"
                                                        onClick={() => {
                                                            if (rel.onThisFloor) {
                                                                onSelectMarkerByEntityId(rel.entity.id);
                                                            } else {
                                                                onOpenDossier(rel.entity.slug);
                                                            }
                                                        }}
                                                        title={rel.onThisFloor ? 'Jump to pin on this floor' : 'Open dossier'}
                                                    >
                                                        <ArrowRight
                                                            className={cn(
                                                                'size-2.5 shrink-0',
                                                                rel.direction === 'incoming' && 'rotate-180',
                                                                rel.direction === 'outgoing' ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]',
                                                            )}
                                                        />
                                                        <div className="size-5 shrink-0 overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-bg)]">
                                                            {relProfileUrl ? (
                                                                <img src={relProfileUrl} alt={rel.entity.name} className="size-full object-cover" />
                                                            ) : (
                                                                <div className="flex size-full items-center justify-center">
                                                                    <TypeIcon entityType={rel.entity.entity_type} size="sm" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block truncate text-[9px] font-medium text-[var(--arc-text)]">
                                                                {rel.entity.name}
                                                            </span>
                                                        </div>
                                                        {/* "On this floor" pin indicator */}
                                                        {rel.onThisFloor && (
                                                            <MapPin className="size-2.5 shrink-0 text-[var(--arc-accent)]" title="Also on this floor" />
                                                        )}
                                                        {rel.status && (
                                                            <span
                                                                className={cn(
                                                                    'size-1.5 shrink-0 rounded-full',
                                                                    rel.status === 'active' && 'bg-[var(--arc-success)]',
                                                                    rel.status === 'former' && 'bg-[var(--arc-text-muted)]',
                                                                    rel.status === 'unknown' && 'bg-[var(--arc-warning)]',
                                                                )}
                                                                title={rel.status}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Intel rows */}
                <div className="space-y-1.5 p-3">
                    <div className="arc-mono mb-1 text-[8px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                        INTEL
                    </div>
                    {item.type === 'marker' && (
                        <>
                            <InfoRow
                                label="X / Y"
                                value={`${item.data.x_percent.toFixed(1)}% × ${item.data.y_percent.toFixed(1)}%`}
                            />
                            <InfoRow
                                label="CATEGORY"
                                value={item.data.marker_type.replace(/-/g, ' ').toUpperCase()}
                            />
                        </>
                    )}
                    {item.type === 'region' && (
                        <>
                            <InfoRow
                                label="BOUNDARY"
                                value={`${item.data.boundary_points.length}-POINT POLYGON`}
                            />
                            <InfoRow
                                label="FILL"
                                value={`${Math.round((item.data.fill_opacity || 0) * 100)}% OPACITY`}
                            />
                            <InfoRow
                                label="ZONE TYPE"
                                value={item.data.region_type.replace(/-/g, ' ').toUpperCase()}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="arc-mono shrink-0 text-[8px] text-[var(--arc-text-muted)]">{label}</span>
            <span className="arc-mono truncate text-right text-[8px] text-[var(--arc-text)]">{value}</span>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  Marker overlay - with profile image pins + hover tooltip
// ══════════════════════════════════════════════════════════════════════
function MarkerOverlay({
    marker,
    bounds,
    selected,
    onSelect,
}: {
    marker: ApiEntityMapMarker;
    bounds: L.LatLngBoundsExpression;
    selected: boolean;
    onSelect: (item: SelectedItem) => void;
}) {
    const color = marker.color || MARKER_COLORS[marker.marker_type] || '#60a5fa';
    const profileUrl = getEntityProfileUrl(marker.entity);
    const icon = createMarkerPin(color, marker.marker_type, selected, profileUrl);
    const position = pctToLatLng(marker.x_percent, marker.y_percent, bounds);

    const entityName = marker.entity?.name;
    const entityType = marker.entity?.entity_type;

    return (
        <Marker
            position={position}
            icon={icon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e as unknown as Event);
                    onSelect({ type: 'marker', data: marker });
                },
            }}
        >
            <LeafletTooltip
                direction="top"
                offset={[0, -20]}
                className="arc-map-tooltip"
                permanent={false}
            >
                <div className="flex items-center gap-1.5">
                    {profileUrl && (
                        <img
                            src={profileUrl}
                            alt=""
                            className="size-5 shrink-0 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
                        />
                    )}
                    <div className="min-w-0">
                        <div className="truncate text-[10px] font-bold leading-tight">{marker.name}</div>
                        {entityName && entityName !== marker.name && (
                            <div className="truncate text-[8px] opacity-70">{entityName}</div>
                        )}
                        <div className="flex items-center gap-1">
                            <span
                                className="inline-block size-1.5 rounded-full"
                                style={{ background: color }}
                            />
                            <span className="text-[7px] font-semibold uppercase tracking-wider opacity-60">
                                {marker.marker_type.replace(/-/g, ' ')}
                            </span>
                            {entityType && (
                                <span
                                    className="rounded px-1 text-[7px] font-semibold"
                                    style={{
                                        background: (entityType.color || '#2563eb') + '22',
                                        color: entityType.color || '#2563eb',
                                    }}
                                >
                                    {entityType.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </LeafletTooltip>
        </Marker>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  Region overlay - with hover tooltip
// ══════════════════════════════════════════════════════════════════════
function RegionOverlay({
    region,
    bounds,
    selected,
    onSelect,
}: {
    region: ApiEntityMapRegion;
    bounds: L.LatLngBoundsExpression;
    selected: boolean;
    onSelect: (item: SelectedItem) => void;
}) {
    const positions = regionPointsToLatLngs(region.boundary_points, bounds);
    const color = region.color || REGION_COLORS[region.region_type] || '#60a5fa';
    const entityName = region.entity?.name;

    if (positions.length < 3) return null;

    return (
        <Polygon
            positions={positions}
            pathOptions={{
                color,
                weight: selected ? 3 : 1.5,
                opacity: selected ? 1 : 0.8,
                fillColor: color,
                fillOpacity: selected
                    ? Math.min((region.fill_opacity || 0.3) + 0.12, 0.88)
                    : region.fill_opacity || 0.3,
                dashArray:
                    region.region_type === 'restricted'
                        ? '7 4'
                        : region.region_type === 'corridor'
                          ? '4 3'
                          : undefined,
            }}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e as unknown as Event);
                    onSelect({ type: 'region', data: region });
                },
            }}
        >
            <LeafletTooltip
                direction="center"
                className="arc-map-tooltip"
                permanent={false}
            >
                <div className="min-w-0">
                    <div className="truncate text-[10px] font-bold leading-tight">{region.name}</div>
                    {entityName && entityName !== region.name && (
                        <div className="truncate text-[8px] opacity-70">{entityName}</div>
                    )}
                    <div className="flex items-center gap-1">
                        <span
                            className="inline-block size-1.5 rounded-sm"
                            style={{ background: color }}
                        />
                        <span className="text-[7px] font-semibold uppercase tracking-wider opacity-60">
                            {region.region_type.replace(/-/g, ' ')}
                        </span>
                    </div>
                </div>
            </LeafletTooltip>
        </Polygon>
    );
}
