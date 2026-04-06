import { useEffect, useMemo, useRef, useState } from 'react';
import {
    MapContainer,
    ImageOverlay,
    Marker,
    Polygon,
    Tooltip as LeafletTooltip,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { ImageIcon, UploadCloud } from 'lucide-react';
import {
    createEditorMarkerIcon,
    pctToLatLng,
    latLngToPct,
    regionPointsToLatLngs,
    getEntityProfileUrl,
} from '@/lib/map-utils';
import { useMapEditorStore } from './use-map-editor-store';
import { RegionVertexEditor } from './region-vertex-editor';
import type { EditorMode } from './use-map-editor-store';

export function EditorCanvas() {
    const mode = useMapEditorStore((s) => s.mode);
    const selection = useMapEditorStore((s) => s.selection);
    const activeFloorId = useMapEditorStore((s) => s.activeFloorId);
    const drawingPoints = useMapEditorStore((s) => s.drawingPoints);
    const mapData = useMapEditorStore((s) => s.mapData);
    const select = useMapEditorStore((s) => s.select);
    const clearSelection = useMapEditorStore((s) => s.clearSelection);
    const placeMarker = useMapEditorStore((s) => s.placeMarker);
    const addDrawingPoint = useMapEditorStore((s) => s.addDrawingPoint);
    const updateMarker = useMapEditorStore((s) => s.updateMarker);
    const patchFloorDimensions = useMapEditorStore((s) => s.patchFloorDimensions);

    // Derive active floor reactively from subscribed state
    const activeFloor = useMemo(
        () => mapData?.floors?.find((f) => f.id === activeFloorId) ?? null,
        [mapData, activeFloorId],
    );
    const floorImage = activeFloor?.images?.[0] ?? null;

    // Track measured image dimensions so we aren't locked to the stored (possibly null) values.
    // Key is `${floorId}-${imageUrl}` so we re-measure whenever the floor or its image changes.
    const [measuredDims, setMeasuredDims] = useState<{ w: number; h: number } | null>(null);
    const measureKey = activeFloor && floorImage ? `${activeFloor.id}-${floorImage.url}` : null;
    const lastMeasureKey = useRef<string | null>(null);

    useEffect(() => {
        if (!measureKey || !floorImage || !activeFloor) return;
        if (lastMeasureKey.current === measureKey) return;
        lastMeasureKey.current = measureKey;

        // Use stored dimensions when available; otherwise probe via Image element
        const storedW = activeFloor.image_width;
        const storedH = activeFloor.image_height;
        if (storedW && storedH) {
            setMeasuredDims({ w: storedW, h: storedH });
            return;
        }

        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w && h) {
                setMeasuredDims({ w, h });
                // Persist so next load skips the probe
                patchFloorDimensions(activeFloor.id, w, h);
            }
        };
        img.src = floorImage.url;
    }, [measureKey, floorImage, activeFloor, patchFloorDimensions]);

    // Reset measured dims when switching floors so old dims don't bleed through
    useEffect(() => {
        setMeasuredDims(null);
    }, [activeFloorId]);

    const imageBounds = useMemo<L.LatLngBoundsExpression>(() => {
        const w = measuredDims?.w ?? activeFloor?.image_width ?? null;
        const h = measuredDims?.h ?? activeFloor?.image_height ?? null;
        if (w && h) return [[0, 0], [h, w]];
        return [[0, 0], [600, 800]];
    }, [measuredDims, activeFloor?.image_width, activeFloor?.image_height]);

    if (!activeFloor) {
        return <EmptyCanvasState />;
    }

    const cursorStyle =
        mode === 'place-marker' ? 'crosshair' :
        mode === 'draw-region' ? 'crosshair' : 'grab';

    return (
        <div className="relative h-full w-full">
            <MapContainer
                key={activeFloor.id}
                crs={L.CRS.Simple}
                maxZoom={6}
                minZoom={-5}
                zoomSnap={0.25}
                attributionControl={false}
                style={{
                    height: '100%',
                    width: '100%',
                    background: 'var(--arc-surface-alt)',
                    cursor: cursorStyle,
                }}
            >
                {floorImage && (
                    <ImageOverlay url={floorImage.url} bounds={imageBounds} />
                )}

                {/* Regions */}
                {activeFloor.regions?.map((region) => {
                    const isSelected = selection?.type === 'region' && selection.id === region.id;
                    return (
                        <Polygon
                            key={region.id}
                            positions={regionPointsToLatLngs(region.boundary_points, imageBounds)}
                            pathOptions={{
                                color: region.color || '#60a5fa',
                                weight: isSelected ? 3 : 2,
                                fillOpacity: region.fill_opacity,
                                dashArray: isSelected ? undefined : '4 4',
                            }}
                            eventHandlers={{
                                click: () => {
                                    if (mode === 'select') {
                                        select({ type: 'region', id: region.id });
                                    }
                                },
                            }}
                        >
                            <LeafletTooltip
                                direction="center"
                                className="arc-map-tooltip"
                                permanent={false}
                            >
                                <div className="text-[9px] font-bold">{region.name}</div>
                            </LeafletTooltip>
                        </Polygon>
                    );
                })}

                {/* Region vertex editor — shown when a region is selected in select mode */}
                {selection?.type === 'region' && mode === 'select' && (() => {
                    const region = activeFloor.regions?.find((r) => r.id === selection.id);
                    return region ? (
                        <RegionVertexEditor region={region} bounds={imageBounds} />
                    ) : null;
                })()}

                {/* Drawing preview */}
                {mode === 'draw-region' && drawingPoints.length >= 2 && (
                    <Polygon
                        positions={regionPointsToLatLngs(drawingPoints, imageBounds)}
                        pathOptions={{
                            color: '#22d3ee',
                            weight: 2,
                            fillOpacity: 0.15,
                            dashArray: '6 3',
                        }}
                    />
                )}

                {/* Markers */}
                {activeFloor.markers?.map((marker) => {
                    const profileUrl = getEntityProfileUrl(marker.entity);
                    const isSelected = selection?.type === 'marker' && selection.id === marker.id;
                    return (
                        <Marker
                            key={marker.id}
                            position={pctToLatLng(marker.x_percent, marker.y_percent, imageBounds)}
                            icon={createEditorMarkerIcon(marker.marker_type, isSelected, profileUrl)}
                            draggable={mode === 'select'}
                            eventHandlers={{
                                click: () => {
                                    if (mode === 'select') {
                                        select({ type: 'marker', id: marker.id });
                                    }
                                },
                                dragend: (e) => {
                                    const latlng = (e.target as L.Marker).getLatLng();
                                    const pct = latLngToPct(latlng, imageBounds);
                                    updateMarker(marker.id, {
                                        x_percent: pct.x,
                                        y_percent: pct.y,
                                    });
                                },
                            }}
                        >
                            <LeafletTooltip
                                direction="top"
                                offset={[0, -14]}
                                className="arc-map-tooltip"
                                permanent={false}
                            >
                                <div className="text-[9px] font-bold">{marker.name}</div>
                            </LeafletTooltip>
                        </Marker>
                    );
                })}

                {/* Drawing point markers */}
                {drawingPoints.map((pt, i) => (
                    <Marker
                        key={`draw-${i}`}
                        position={pctToLatLng(pt.x, pt.y, imageBounds)}
                        icon={L.divIcon({
                            className: 'arc-map-marker',
                            html: `<div style="width:8px;height:8px;border-radius:50%;background:#22d3ee;border:2px solid #fff;" />`,
                            iconSize: [8, 8],
                            iconAnchor: [4, 4],
                        })}
                    />
                ))}

                <MapEventHandler
                    mode={mode}
                    bounds={imageBounds}
                    onPlaceMarker={placeMarker}
                    onAddDrawingPoint={addDrawingPoint}
                    onBackgroundClick={clearSelection}
                />
                <MapResizeHandler />
                <MapInitializer imageBounds={imageBounds} floorId={activeFloor.id} />
            </MapContainer>

            {/* Schematic overlay when no floor image */}
            {!floorImage && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="arc-map-grid-bg absolute inset-0" />
                    <div className="relative z-10 text-center">
                        <ImageIcon className="mx-auto size-7 opacity-20 text-[var(--arc-text-muted)]" />
                        <p className="arc-mono mt-1.5 text-[9px] tracking-widest text-[var(--arc-text-muted)]">
                            SCHEMATIC MODE — NO IMAGE
                        </p>
                        <button
                            className="pointer-events-auto arc-mono mt-2 flex items-center gap-1.5 rounded bg-[var(--arc-accent)] px-3 py-1.5 text-[9px] font-bold tracking-wider text-white hover:bg-[var(--arc-accent)]/80 mx-auto transition-colors"
                            onClick={() => {
                                // Select the floor to open property panel with image uploader
                                useMapEditorStore.getState().select({ type: 'floor', id: activeFloor.id });
                            }}
                        >
                            <UploadCloud className="size-3.5" />
                            UPLOAD IMAGE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyCanvasState() {
    return (
        <div className="flex h-full items-center justify-center bg-[var(--arc-surface-alt)]">
            <div className="text-center">
                <div className="mx-auto size-12 rounded-full bg-[var(--arc-border)]/20 flex items-center justify-center">
                    <ImageIcon className="size-5 text-[var(--arc-text-muted)] opacity-40" />
                </div>
                <p className="arc-mono mt-3 text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                    ADD A FLOOR TO BEGIN
                </p>
                <p className="arc-mono mt-1 text-[8px] text-[var(--arc-text-muted)]">
                    Use the floor panel on the left
                </p>
            </div>
        </div>
    );
}

/** Handles map clicks for placing markers and drawing regions */
function MapEventHandler({
    mode,
    bounds,
    onPlaceMarker,
    onAddDrawingPoint,
    onBackgroundClick,
}: {
    mode: EditorMode;
    bounds: L.LatLngBoundsExpression;
    onPlaceMarker: (x: number, y: number) => void;
    onAddDrawingPoint: (pt: { x: number; y: number }) => void;
    onBackgroundClick: () => void;
}) {
    useMapEvents({
        click(e) {
            const pct = latLngToPct(e.latlng, bounds);

            if (mode === 'place-marker') {
                onPlaceMarker(pct.x, pct.y);
            } else if (mode === 'draw-region') {
                onAddDrawingPoint(pct);
            } else {
                // In select mode, clicking empty space deselects
                const target = e.originalEvent?.target as HTMLElement | undefined;
                if (target?.classList?.contains('leaflet-container') || target?.tagName === 'IMG') {
                    onBackgroundClick();
                }
            }
        },
    });
    return null;
}

/** Keeps Leaflet in sync when the container is resized */
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

/**
 * On floor mount, fit the image so it fills the canvas WIDTH (or height if taller).
 * This gives a much larger initial working area compared to the default Leaflet
 * fit-both-dimensions approach, which compresses wide images into a tiny box.
 */
function MapInitializer({ imageBounds, floorId }: { imageBounds: L.LatLngBoundsExpression; floorId: number }) {
    const map = useMap();
    const lastKey = useRef<string | null>(null);

    useEffect(() => {
        // Re-fit whenever the floor changes OR whenever bounds change (dims resolved async)
        const bounds = L.latLngBounds(imageBounds as L.LatLngBoundsLiteral);
        const key = `${floorId}-${bounds.getEast()}-${bounds.getNorth()}`;
        if (lastKey.current === key) return;
        lastKey.current = key;

        requestAnimationFrame(() => {
            map.invalidateSize();
            const imgW = bounds.getEast() - bounds.getWest();
            const imgH = bounds.getNorth() - bounds.getSouth();
            const { x: canvasW, y: canvasH } = map.getSize();

            const zoomByWidth  = Math.log2(canvasW / imgW);
            const zoomByHeight = Math.log2(canvasH / imgH);
            const zoom = Math.min(zoomByWidth, zoomByHeight);
            const snapped = Math.round(zoom / 0.25) * 0.25;

            map.setView(bounds.getCenter(), snapped, { animate: false });
        });
    }, [map, imageBounds, floorId]);

    return null;
}
