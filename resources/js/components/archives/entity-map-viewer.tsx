import {
    AlertCircle,
    Edit,
    ExternalLink,
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
import { ImageOverlay, MapContainer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityMap, ApiEntityMapMarker, ApiEntityMapRegion } from '@/types/api';

//  Type → glyph 
const MARKER_GLYPHS: Record<string, string> = {
    poi: '●',
    character: 'P',
    item: '◆',
    event: '!',
    entrance: '▶',
    exit: '◀',
    'save-point': '✦',
    boss: '★',
    note: '?',
    threat: '▲',
    objective: '⊕',
    secret: '◇',
    'safe-room': 'S',
    custom: '·',
};

//  Type → default color 
const MARKER_COLORS: Record<string, string> = {
    poi: '#60a5fa',
    item: '#fbbf24',
    character: '#34d399',
    event: '#f87171',
    entrance: '#818cf8',
    exit: '#fb923c',
    'save-point': '#22d3ee',
    boss: '#ef4444',
    note: '#a78bfa',
    threat: '#dc2626',
    objective: '#6366f1',
    secret: '#a855f7',
    'safe-room': '#4ade80',
    custom: '#94a3b8',
};

const REGION_COLORS: Record<string, string> = {
    room: '#60a5fa',
    zone: '#34d399',
    corridor: '#a78bfa',
    outdoor: '#22d3ee',
    restricted: '#ef4444',
    safe: '#4ade80',
    'boss-arena': '#f87171',
    containment: '#7c3aed',
    lab: '#0d9488',
    storage: '#d97706',
    utility: '#9a3412',
    exterior: '#6b7280',
    'safe-room': '#4ade80',
    custom: '#94a3b8',
};

//  SVG teardrop pin factory 
function makeTeardropPath(cx: number, cy: number, r: number, tipY: number): string {
    return [
        `M${cx} ${cy - r}`,
        `A${r} ${r} 0 0 1 ${cx + r} ${cy}`,
        `C${cx + r} ${cy + r * 0.9},${cx + r * 0.4} ${tipY - 4},${cx} ${tipY}`,
        `C${cx - r * 0.4} ${tipY - 4},${cx - r} ${cy + r * 0.9},${cx - r} ${cy}`,
        `A${r} ${r} 0 0 1 ${cx} ${cy - r} Z`,
    ].join(' ');
}

function createMarkerPin(color: string, markerType: string, selected: boolean): L.DivIcon {
    const size = selected ? 26 : 22;
    const r = size / 2 - 1;
    const cx = size / 2;
    const height = Math.round(size * 1.4);
    const tipY = height - 1;
    const innerR = Math.round(r * 0.44);
    const fontSize = Math.max(6, Math.round(r * 0.48));
    const rawGlyph = MARKER_GLYPHS[markerType] || '●';
    const glyph = rawGlyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const strokeColor = selected ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.28)';
    const strokeWidth = selected ? '2' : '1.5';
    const shadowStr = `drop-shadow(0 ${selected ? '3px 8px' : '1px 4px'} ${color}55)`;

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">`,
        `<path d="${makeTeardropPath(cx, cx, r, tipY)}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`,
        `<circle cx="${cx}" cy="${cx}" r="${innerR}" fill="rgba(0,0,0,0.22)"/>`,
        `<text x="${cx}" y="${cx + fontSize * 0.4}" font-size="${fontSize}" text-anchor="middle"`,
        ` fill="rgba(255,255,255,0.95)" font-family="monospace" font-weight="bold">${glyph}</text>`,
        `</svg>`,
    ].join('');

    return L.divIcon({
        className: 'arc-map-pin',
        html: `<div style="filter:${shadowStr}">${svg}</div>`,
        iconSize: [size, height],
        iconAnchor: [cx, tipY],
    });
}

//  Coordinate helpers 
function pctToLatLng(xPct: number, yPct: number, bounds: L.LatLngBoundsExpression): L.LatLng {
    const b = L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const lat = b.getSouth() + (1 - yPct / 100) * (b.getNorth() - b.getSouth());
    const lng = b.getWest() + (xPct / 100) * (b.getEast() - b.getWest());
    return L.latLng(lat, lng);
}

function regionPointsToLatLngs(points: { x: number; y: number }[], bounds: L.LatLngBoundsExpression): L.LatLng[] {
    return points.map((p) => pctToLatLng(p.x, p.y, bounds));
}

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

//  Invalidate Leaflet size on container resize 
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
    /** Wiki-mode: navigate to entity wiki page instead of opening a dossier window. */
    onEntityNavigate?: (slug: string) => void;
    /** Wiki-mode: replace the EDIT window button with a link pointing here. */
    editLinkHref?: string;
};

//  Main component 
export function EntityMapViewer({ universeId, entityId, mapId, onEntityNavigate, editLinkHref }: Props) {
    const [mapData, setMapData] = useState<ApiEntityMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
    const [visibleLayers, setVisibleLayers] = useState({ markers: true, regions: true });
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
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

    // Floors sorted ascending by floor_number (B2 → ... → GF → 1F → ...)
    const sortedFloors = useMemo(
        () => [...(mapData?.floors ?? [])].sort((a, b) => a.floor_number - b.floor_number),
        [mapData],
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
            size: { width: 920, height: 660 },
        });
    }, [openWindow, mapData, universeId, entityId]);

    const handleSelect = useCallback((item: SelectedItem) => setSelectedItem(item), []);
    const handleClearSelection = useCallback(() => setSelectedItem(null), []);
    const handleFloorChange = useCallback((id: number) => {
        setActiveFloorId(id);
        setSelectedItem(null);
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

            {/*  Floor tabs  */}
            {sortedFloors.length > 1 && (
                <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                    {sortedFloors.map((floor) => {
                        const label =
                            floor.floor_number > 0
                                ? `F${floor.floor_number}`
                                : floor.floor_number === 0
                                  ? 'GF'
                                  : `B${Math.abs(floor.floor_number)}`;
                        return (
                            <button
                                key={floor.id}
                                className={cn(
                                    'arc-mono flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-[9px] font-semibold tracking-wider transition-all',
                                    floor.id === activeFloorId
                                        ? 'bg-[var(--arc-accent)] text-white shadow-sm'
                                        : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface)] hover:text-[var(--arc-text)]',
                                )}
                                onClick={() => handleFloorChange(floor.id)}
                            >
                                <span className="shrink-0 text-[8px] opacity-70">{label}</span>
                                <span className="max-w-[96px] truncate">{floor.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/*  Body  */}
            <div className="flex flex-1 overflow-hidden">
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
                            activeFloor.regions?.map((region) => (
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
                            activeFloor.markers?.map((marker) => (
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

                    {/* Grid overlay + notice when no floor image */}
                    {!floorImage && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="arc-map-grid-bg absolute inset-0" />
                            <div className="relative z-10 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]/80 px-3 py-2 text-center backdrop-blur-sm">
                                <Layers className="mx-auto mb-1 size-5 text-[var(--arc-text-muted)] opacity-30" />
                                <p className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">
                                    NO FLOOR IMAGE  SCHEMATIC MODE
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info panel  slides in from right when item selected */}
                {selectedItem && (
                    <InfoPanel
                        item={selectedItem}
                        onClose={handleClearSelection}
                        onOpenDossier={handleEntityClick}
                    />
                )}
            </div>

            {/*  Footer  */}
            <div className="flex shrink-0 items-center gap-4 border-t border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                <span className="arc-mono text-[8px] font-semibold text-[var(--arc-text-muted)]">
                    {activeFloor.floor_number > 0
                        ? `FLOOR ${activeFloor.floor_number}`
                        : activeFloor.floor_number === 0
                          ? 'GROUND FLOOR'
                          : `BASEMENT ${Math.abs(activeFloor.floor_number)}`}
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
                {selectedItem && (
                    <span className="arc-mono ml-auto text-[8px] font-semibold text-[var(--arc-accent)]">
                        ● {selectedItem.data.name.toUpperCase()}
                    </span>
                )}
            </div>
        </div>
    );
}

//  Info panel (right sidebar) 
function InfoPanel({
    item,
    onClose,
    onOpenDossier,
}: {
    item: SelectedItem;
    onClose: () => void;
    onOpenDossier: (slug?: string) => void;
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
                {/* Entity card */}
                {entity && (
                    <div className="border-b border-[var(--arc-border)] p-3">
                        <div className="arc-mono mb-2 text-[8px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                            LINKED ENTITY
                        </div>
                        <div className="flex items-start gap-2.5">
                            {/* Avatar */}
                            <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                                {entity.images?.[0] ? (
                                    <img
                                        src={entity.images[0].thumbnail_url ?? entity.images[0].url}
                                        alt={entity.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center">
                                        <User className="size-5 text-[var(--arc-text-muted)] opacity-40" />
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
                                    <div
                                        className="arc-mono mt-1 text-[8px]"
                                        style={{
                                            color: entity.entity_status.color || 'var(--arc-text-muted)',
                                        }}
                                    >
                                        ● {entity.entity_status.name.toUpperCase()}
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

//  Marker overlay sub-component 
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
    const icon = createMarkerPin(color, marker.marker_type, selected);
    const position = pctToLatLng(marker.x_percent, marker.y_percent, bounds);

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
        />
    );
}

//  Region overlay sub-component 
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
        />
    );
}
