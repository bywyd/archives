import {
    AlertCircle,
    ChevronDown,
    CornerDownLeft,
    GripVertical,
    ImageIcon,
    Layers,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Save,
    Trash2,
    Undo2,
    Upload,
    UploadCloud,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, ImageOverlay, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { EntityPicker } from '@/components/archives/entity-picker';
import { ImageUploader } from '@/components/archives/image-uploader';
import type {
    ApiEntityMap,
    ApiEntityMapFloor,
    ApiEntityMapMarker,
    ApiEntityMapRegion,
    ApiImage,
} from '@/types/api';

//  Same coordinate helpers as viewer 
function pctToLatLng(xPct: number, yPct: number, bounds: L.LatLngBoundsExpression): L.LatLng {
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const lat = b.getSouth() + (1 - yPct / 100) * (b.getNorth() - b.getSouth());
    const lng = b.getWest() + (xPct / 100) * (b.getEast() - b.getWest());
    return L.latLng(lat, lng);
}

function latLngToPct(latlng: L.LatLng, bounds: L.LatLngBoundsExpression): { x: number; y: number } {
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const x = ((latlng.lng - b.getWest()) / (b.getEast() - b.getWest())) * 100;
    const y = (1 - (latlng.lat - b.getSouth()) / (b.getNorth() - b.getSouth())) * 100;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

function regionPointsToLatLngs(points: { x: number; y: number }[], bounds: L.LatLngBoundsExpression): L.LatLng[] {
    return points.map((p) => pctToLatLng(p.x, p.y, bounds));
}

const MARKER_TYPES = [
    'poi', 'item', 'character', 'event', 'entrance', 'exit',
    'save-point', 'boss', 'note', 'threat', 'objective', 'secret', 'safe-room', 'custom',
] as const;
const REGION_TYPES = [
    'room', 'zone', 'corridor', 'outdoor', 'restricted', 'safe',
    'boss-arena', 'containment', 'lab', 'storage', 'utility', 'exterior', 'safe-room', 'custom',
] as const;

const COLOR_PRESETS = [
    '#3b82f6', '#60a5fa', '#34d399', '#10b981',
    '#f59e0b', '#fbbf24', '#f87171', '#ef4444',
    '#a78bfa', '#8b5cf6', '#fb923c', '#22d3ee',
    '#1e293b', '#64748b', '#e2e8f0', '#ffffff',
] as const;

const MARKER_COLORS: Record<string, string> = {
    poi: '#60a5fa', item: '#fbbf24', character: '#34d399', event: '#f87171',
    entrance: '#818cf8', exit: '#fb923c', 'save-point': '#22d3ee', boss: '#ef4444',
    note: '#a78bfa', threat: '#dc2626', objective: '#6366f1', secret: '#a855f7',
    'safe-room': '#4ade80', custom: '#94a3b8',
};

function createEditorMarkerIcon(type: string, active: boolean): L.DivIcon {
    const color = MARKER_COLORS[type] || MARKER_COLORS.poi;
    return L.divIcon({
        className: 'arc-map-marker',
        html: `<div style="
            width: ${active ? 16 : 12}px; height: ${active ? 16 : 12}px; border-radius: 50%;
            background: ${color}; border: 2px solid ${active ? '#fff' : 'rgba(0,0,0,0.6)'};
            box-shadow: 0 0 ${active ? 10 : 6}px ${color}80;
        " />`,
        iconSize: [active ? 16 : 12, active ? 16 : 12],
        iconAnchor: [active ? 8 : 6, active ? 8 : 6],
    });
}

type EditorMode = 'select' | 'place-marker' | 'draw-region';

//  Color swatch picker 
function ColorPalette({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
    return (
        <div className="space-y-1.5">
            <div className="grid grid-cols-8 gap-1">
                {COLOR_PRESETS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        title={c}
                        className={cn(
                            'size-5 rounded border-2 transition-transform hover:scale-110',
                            value.toLowerCase() === c.toLowerCase()
                                ? 'border-[var(--arc-accent)] scale-110'
                                : 'border-transparent',
                        )}
                        style={{ background: c }}
                        onClick={() => onChange(c)}
                    />
                ))}
            </div>
            <input
                type="text"
                className="arc-input w-full text-xs"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#hex or leave blank for auto"
            />
        </div>
    );
}

type Props = {
    universeId: number;
    entityId: number;
    mapId?: number;
};

export function EntityMapEditor({ universeId, entityId, mapId }: Props) {
    const [mapData, setMapData] = useState<ApiEntityMap | null>(null);
    const [loading, setLoading] = useState(!!mapId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Map metadata form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Floor state
    const [activeFloorId, setActiveFloorId] = useState<number | null>(null);

    // Editor mode
    const [mode, setMode] = useState<EditorMode>('select');
    const [selectedMarker, setSelectedMarker] = useState<ApiEntityMapMarker | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<ApiEntityMapRegion | null>(null);

    // Region drawing state
    const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);

    // Side panel
    const [panelView, setPanelView] = useState<'floors' | 'marker' | 'region' | 'new-floor' | 'floor-image'>('floors');

    //  Load map data 
    useEffect(() => {
        if (!mapId) return;
        setLoading(true);
        api.fetchEntityMap(universeId, entityId, mapId)
            .then((res) => {
                setMapData(res.data);
                setName(res.data.name);
                setDescription(res.data.description || '');
                if (res.data.floors?.length) {
                    setActiveFloorId(res.data.floors[0].id);
                }
            })
            .catch((err) => setError(err.message || 'Failed to load map'))
            .finally(() => setLoading(false));
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

    const refreshMap = useCallback(() => {
        if (!mapData?.id) return;
        api.fetchEntityMap(universeId, entityId, mapData.id)
            .then((res) => {
                setMapData(res.data);
                setName(res.data.name);
                setDescription(res.data.description || '');
            });
    }, [universeId, entityId, mapData?.id]);

    //  Save map metadata 
    const saveMapMeta = useCallback(async () => {
        setSaving(true);
        try {
            if (mapData) {
                const res = await api.updateEntityMap(universeId, entityId, mapData.id, { name, description });
                setMapData(res.data);
            } else {
                const res = await api.createEntityMap(universeId, entityId, { name, description });
                setMapData(res.data);
                if (res.data.floors?.length) {
                    setActiveFloorId(res.data.floors[0].id);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save map');
        } finally {
            setSaving(false);
        }
    }, [universeId, entityId, mapData, name, description]);

    //  Floor CRUD 
    const addFloor = useCallback(async (floorName: string, floorNumber: number) => {
        if (!mapData) return;
        try {
            await api.createMapFloor(universeId, entityId, mapData.id, { name: floorName, floor_number: floorNumber });
            refreshMap();
            setPanelView('floors');
        } catch (err: any) {
            setError(err.message || 'Failed to add floor');
        }
    }, [universeId, entityId, mapData, refreshMap]);

    const deleteFloor = useCallback(async (floorId: number) => {
        if (!mapData) return;
        try {
            await api.deleteMapFloor(universeId, entityId, mapData.id, floorId);
            if (activeFloorId === floorId) setActiveFloorId(null);
            refreshMap();
        } catch (err: any) {
            setError(err.message || 'Failed to delete floor');
        }
    }, [universeId, entityId, mapData, activeFloorId, refreshMap]);

    //  Marker CRUD 
    const placeMarker = useCallback(async (xPct: number, yPct: number) => {
        if (!mapData || !activeFloorId) return;
        try {
            const res = await api.createMapMarker(universeId, entityId, mapData.id, {
                entity_map_floor_id: activeFloorId,
                name: 'New Marker',
                x_percent: xPct,
                y_percent: yPct,
                marker_type: 'poi',
            });
            refreshMap();
            setSelectedMarker(res.data);
            setPanelView('marker');
            setMode('select');
        } catch (err: any) {
            setError(err.message || 'Failed to place marker');
        }
    }, [universeId, entityId, mapData, activeFloorId, refreshMap]);

    const updateMarker = useCallback(async (markerId: number, data: Record<string, unknown>) => {
        if (!mapData) return;
        try {
            const res = await api.updateMapMarker(universeId, entityId, mapData.id, markerId, data);
            setSelectedMarker(res.data);
            refreshMap();
        } catch (err: any) {
            setError(err.message || 'Failed to update marker');
        }
    }, [universeId, entityId, mapData, refreshMap]);

    const deleteMarker = useCallback(async (markerId: number) => {
        if (!mapData) return;
        try {
            await api.deleteMapMarker(universeId, entityId, mapData.id, markerId);
            setSelectedMarker(null);
            setPanelView('floors');
            refreshMap();
        } catch (err: any) {
            setError(err.message || 'Failed to delete marker');
        }
    }, [universeId, entityId, mapData, refreshMap]);

    //  Region CRUD 
    const finishRegion = useCallback(async () => {
        if (!mapData || !activeFloorId || drawingPoints.length < 3) return;
        try {
            const res = await api.createMapRegion(universeId, entityId, mapData.id, {
                entity_map_floor_id: activeFloorId,
                name: 'New Region',
                boundary_points: drawingPoints,
                region_type: 'room',
            });
            setDrawingPoints([]);
            refreshMap();
            setSelectedRegion(res.data);
            setPanelView('region');
            setMode('select');
        } catch (err: any) {
            setError(err.message || 'Failed to create region');
        }
    }, [universeId, entityId, mapData, activeFloorId, drawingPoints, refreshMap]);

    const updateRegion = useCallback(async (regionId: number, data: Record<string, unknown>) => {
        if (!mapData) return;
        try {
            const res = await api.updateMapRegion(universeId, entityId, mapData.id, regionId, data);
            setSelectedRegion(res.data);
            refreshMap();
        } catch (err: any) {
            setError(err.message || 'Failed to update region');
        }
    }, [universeId, entityId, mapData, refreshMap]);

    const deleteRegion = useCallback(async (regionId: number) => {
        if (!mapData) return;
        try {
            await api.deleteMapRegion(universeId, entityId, mapData.id, regionId);
            setSelectedRegion(null);
            setPanelView('floors');
            refreshMap();
        } catch (err: any) {
            setError(err.message || 'Failed to delete region');
        }
    }, [universeId, entityId, mapData, refreshMap]);

    //  Loading state 
    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--arc-bg)]">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-xs tracking-widest text-[var(--arc-text-muted)]">LOADING MAP EDITOR...</span>
            </div>
        );
    }

    //  No map yet → show creation form 
    if (!mapData && !mapId) {
        return (
            <div className="flex h-full flex-col bg-[var(--arc-bg)]">
                <div className="flex shrink-0 items-center gap-2 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                    <MapPin className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        CREATE NEW MAP
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mx-auto max-w-md space-y-4">
                        <FieldGroup label="MAP NAME">
                            <input
                                type="text"
                                className="arc-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Spencer Mansion"
                            />
                        </FieldGroup>
                        <FieldGroup label="DESCRIPTION">
                            <textarea
                                className="arc-input w-full resize-none"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description..."
                            />
                        </FieldGroup>
                        {error && <p className="text-xs text-[var(--arc-danger)]">{error}</p>}
                        <button
                            className="arc-btn-primary flex items-center gap-2"
                            disabled={!name.trim() || saving}
                            onClick={saveMapMeta}
                        >
                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            CREATE MAP
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const floors = mapData?.floors ?? [];

    return (
        <div className="flex h-full flex-col bg-[var(--arc-bg)]">
            {/*  Header  */}
            <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <div className="flex items-center gap-2">
                    <Pencil className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        EDIT MAP
                    </span>
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]"> {mapData?.name}</span>
                </div>

                <div className="flex items-center gap-1">
                    {/* Mode buttons */}
                    <ModeButton
                        active={mode === 'select'}
                        label="SELECT"
                        onClick={() => { setMode('select'); setDrawingPoints([]); }}
                    />
                    <ModeButton
                        active={mode === 'place-marker'}
                        label="+ MARKER"
                        disabled={!activeFloor}
                        onClick={() => { setMode('place-marker'); setDrawingPoints([]); }}
                    />
                    <ModeButton
                        active={mode === 'draw-region'}
                        label="+ REGION"
                        disabled={!activeFloor}
                        onClick={() => { setMode('draw-region'); setDrawingPoints([]); }}
                    />
                    {mode === 'draw-region' && drawingPoints.length > 0 && (
                        <button
                            className="arc-mono flex items-center gap-1 rounded border border-[var(--arc-border)] px-2 py-0.5 text-[9px] tracking-wider text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]"
                            title="Undo last point"
                            onClick={() => setDrawingPoints((pts) => pts.slice(0, -1))}
                        >
                            <Undo2 className="size-3" /> UNDO
                        </button>
                    )}
                    {mode === 'draw-region' && drawingPoints.length >= 3 && (
                        <button
                            className="arc-mono flex items-center gap-1 rounded bg-[var(--arc-accent)] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[var(--arc-bg)] hover:bg-[var(--arc-accent)]/80"
                            onClick={finishRegion}
                        >
                            <CornerDownLeft className="size-3" /> FINISH ({drawingPoints.length})
                        </button>
                    )}
                </div>
            </div>

            {/*  Body  */}
            <div className="flex flex-1 overflow-hidden">
                {/* Side panel */}
                <div className="flex w-64 shrink-0 flex-col border-r border-[var(--arc-border)] bg-[var(--arc-surface)]">
                    <SidePanel
                        mapData={mapData}
                        floors={floors}
                        activeFloor={activeFloor}
                        activeFloorId={activeFloorId}
                        panelView={panelView}
                        selectedMarker={selectedMarker}
                        selectedRegion={selectedRegion}
                        universeId={universeId}
                        onSelectFloor={setActiveFloorId}
                        onAddFloor={addFloor}
                        onDeleteFloor={deleteFloor}
                        onUpdateMarker={updateMarker}
                        onDeleteMarker={deleteMarker}
                        onUpdateRegion={updateRegion}
                        onDeleteRegion={deleteRegion}
                        onSetPanelView={setPanelView}
                        onFloorImagesChange={(_images: ApiImage[]) => refreshMap()}
                        name={name}
                        description={description}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onSaveMeta={saveMapMeta}
                        saving={saving}
                        error={error}
                    />
                </div>

                {/* Map area */}
                <div className="relative flex-1 overflow-hidden">
                    {activeFloor ? (
                        <>
                            <MapContainer
                                key={activeFloor.id}
                                crs={L.CRS.Simple}
                                bounds={imageBounds}
                                maxZoom={4}
                                minZoom={-2}
                                zoomSnap={0.25}
                                attributionControl={false}
                                style={{ height: '100%', width: '100%', background: 'var(--arc-surface-alt)', cursor: mode === 'place-marker' ? 'crosshair' : mode === 'draw-region' ? 'crosshair' : 'grab' }}
                            >
                                {floorImage && <ImageOverlay url={floorImage.url} bounds={imageBounds} />}

                                {/* Existing regions */}
                                {activeFloor.regions?.map((region) => (
                                    <Polygon
                                        key={region.id}
                                        positions={regionPointsToLatLngs(region.boundary_points, imageBounds)}
                                        pathOptions={{
                                            color: region.color || '#60a5fa',
                                            weight: selectedRegion?.id === region.id ? 3 : 2,
                                            fillOpacity: region.fill_opacity,
                                            dashArray: selectedRegion?.id === region.id ? undefined : '4 4',
                                        }}
                                        eventHandlers={{
                                            click: () => {
                                                if (mode === 'select') {
                                                    setSelectedRegion(region);
                                                    setSelectedMarker(null);
                                                    setPanelView('region');
                                                }
                                            },
                                        }}
                                    />
                                ))}

                                {/* Drawing preview */}
                                {mode === 'draw-region' && drawingPoints.length >= 2 && (
                                    <Polygon
                                        positions={regionPointsToLatLngs(drawingPoints, imageBounds)}
                                        pathOptions={{ color: '#22d3ee', weight: 2, fillOpacity: 0.15, dashArray: '6 3' }}
                                    />
                                )}

                                {/* Existing markers (draggable) */}
                                {activeFloor.markers?.map((marker) => (
                                    <Marker
                                        key={marker.id}
                                        position={pctToLatLng(marker.x_percent, marker.y_percent, imageBounds)}
                                        icon={createEditorMarkerIcon(marker.marker_type, selectedMarker?.id === marker.id)}
                                        draggable={mode === 'select'}
                                        eventHandlers={{
                                            click: () => {
                                                if (mode === 'select') {
                                                    setSelectedMarker(marker);
                                                    setSelectedRegion(null);
                                                    setPanelView('marker');
                                                }
                                            },
                                            dragend: (e) => {
                                                const latlng = (e.target as L.Marker).getLatLng();
                                                const pct = latLngToPct(latlng, imageBounds);
                                                updateMarker(marker.id, { x_percent: pct.x, y_percent: pct.y });
                                            },
                                        }}
                                    />
                                ))}

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

                                <EditorMapEvents
                                    mode={mode}
                                    bounds={imageBounds}
                                    onPlaceMarker={placeMarker}
                                    onAddDrawingPoint={(pt) => setDrawingPoints((prev) => [...prev, pt])}
                                />
                                <MapResizeHandler />
                            </MapContainer>

                            {/* Grid + schematic notice when no floor image */}
                            {!floorImage && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="arc-map-grid-bg absolute inset-0" />
                                    <div className="relative z-10 text-center">
                                        <ImageIcon className="mx-auto size-7 opacity-20 text-[var(--arc-text-muted)]" />
                                        <p className="arc-mono mt-1.5 text-[9px] tracking-widest text-[var(--arc-text-muted)]">SCHEMATIC MODE  NO IMAGE</p>
                                        <button
                                            className="pointer-events-auto arc-mono mt-2 flex items-center gap-1.5 rounded bg-[var(--arc-accent)] px-3 py-1.5 text-[9px] font-bold tracking-wider text-white hover:bg-[var(--arc-accent)]/80 mx-auto"
                                            onClick={() => setPanelView('floor-image')}
                                        >
                                            <UploadCloud className="size-3.5" />
                                            UPLOAD IMAGE
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <Layers className="mx-auto size-8 opacity-20 text-[var(--arc-text-muted)]" />
                                <p className="arc-mono mt-2 text-[10px] tracking-widest text-[var(--arc-text-muted)]">SELECT OR CREATE A FLOOR</p>
                                <p className="arc-mono mt-1 text-[9px] text-[var(--arc-text-muted)]">Use the panel on the left</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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

//  Map click handler 
function EditorMapEvents({
    mode,
    bounds,
    onPlaceMarker,
    onAddDrawingPoint,
}: {
    mode: EditorMode;
    bounds: L.LatLngBoundsExpression;
    onPlaceMarker: (x: number, y: number) => void;
    onAddDrawingPoint: (pt: { x: number; y: number }) => void;
}) {
    useMapEvents({
        click(e) {
            const pct = latLngToPct(e.latlng, bounds);
            if (pct.x < 0 || pct.x > 100 || pct.y < 0 || pct.y > 100) return;
            if (mode === 'place-marker') {
                onPlaceMarker(pct.x, pct.y);
            } else if (mode === 'draw-region') {
                onAddDrawingPoint(pct);
            }
        },
    });
    return null;
}

//  Mode toggle button 
function ModeButton({ active, label, disabled, onClick }: { active: boolean; label: string; disabled?: boolean; onClick: () => void }) {
    return (
        <button
            className={cn(
                'arc-mono rounded px-2 py-0.5 text-[9px] font-semibold tracking-wider transition-colors',
                active ? 'bg-[var(--arc-accent)]/15 text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                disabled && 'cursor-not-allowed opacity-30',
            )}
            disabled={disabled}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

//  Field group wrapper 
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">{label}</span>
            {children}
        </label>
    );
}

//  Side Panel 
function SidePanel({
    mapData,
    floors,
    activeFloor,
    activeFloorId,
    panelView,
    selectedMarker,
    selectedRegion,
    universeId,
    onSelectFloor,
    onAddFloor,
    onDeleteFloor,
    onUpdateMarker,
    onDeleteMarker,
    onUpdateRegion,
    onDeleteRegion,
    onSetPanelView,
    onFloorImagesChange,
    name,
    description,
    onNameChange,
    onDescriptionChange,
    onSaveMeta,
    saving,
    error,
}: {
    mapData: ApiEntityMap | null;
    floors: ApiEntityMapFloor[];
    activeFloor: ApiEntityMapFloor | null;
    activeFloorId: number | null;
    panelView: string;
    selectedMarker: ApiEntityMapMarker | null;
    selectedRegion: ApiEntityMapRegion | null;
    universeId: number;
    onSelectFloor: (id: number) => void;
    onAddFloor: (name: string, floorNumber: number) => void;
    onDeleteFloor: (id: number) => void;
    onUpdateMarker: (id: number, data: Record<string, unknown>) => void;
    onDeleteMarker: (id: number) => void;
    onUpdateRegion: (id: number, data: Record<string, unknown>) => void;
    onDeleteRegion: (id: number) => void;
    onSetPanelView: (view: 'floors' | 'marker' | 'region' | 'new-floor' | 'floor-image') => void;
    onFloorImagesChange: (images: ApiImage[]) => void;
    name: string;
    description: string;
    onNameChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
    onSaveMeta: () => void;
    saving: boolean;
    error: string | null;
}) {
    return (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Map meta */}
            <div className="border-b border-[var(--arc-border)] p-3 space-y-2">
                <FieldGroup label="MAP NAME">
                    <input
                        type="text"
                        className="arc-input w-full text-xs"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                    />
                </FieldGroup>
                <FieldGroup label="DESCRIPTION">
                    <textarea
                        className="arc-input w-full resize-none text-xs"
                        rows={2}
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                    />
                </FieldGroup>
                <button
                    className="arc-mono flex w-full items-center justify-center gap-1.5 rounded bg-[var(--arc-accent)]/10 px-2 py-1 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20"
                    disabled={!name.trim() || saving}
                    onClick={onSaveMeta}
                >
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    SAVE
                </button>
                {error && <p className="text-[9px] text-[var(--arc-danger)]">{error}</p>}
            </div>

            {/* Floors list */}
            {panelView === 'floors' && (
                <div className="flex-1 p-2 space-y-1">
                    <div className="flex items-center justify-between px-1 pb-1">
                        <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">FLOORS</span>
                        <button
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/10"
                            onClick={() => onSetPanelView('new-floor')}
                        >
                            <Plus className="size-3" />
                        </button>
                    </div>
                    {floors.length === 0 && (
                        <p className="arc-mono px-1 text-[9px] text-[var(--arc-text-muted)]">No floors yet. Add one to get started.</p>
                    )}
                    {floors.map((floor) => (
                        <button
                            key={floor.id}
                            className={cn(
                                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors',
                                floor.id === activeFloorId
                                    ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                    : 'text-[var(--arc-text)] hover:bg-[var(--arc-surface-alt)]',
                            )}
                            onClick={() => onSelectFloor(floor.id)}
                        >
                            <div className="flex items-center gap-2">
                                <Layers className="size-3 shrink-0 opacity-50" />
                                <div>
                                    <span className="arc-mono block text-[9px] font-semibold tracking-wider">{floor.name.toUpperCase()}</span>
                                    <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                                        F{floor.floor_number} • {floor.markers?.length ?? 0}M / {floor.regions?.length ?? 0}R
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button
                                    className="rounded p-0.5 text-[var(--arc-text-muted)] hover:bg-[var(--arc-accent)]/10 hover:text-[var(--arc-accent)]"
                                    title="Upload floor image"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectFloor(floor.id);
                                        onSetPanelView('floor-image');
                                    }}
                                >
                                    <ImageIcon className="size-3" />
                                </button>
                                <button
                                    className="rounded p-0.5 text-[var(--arc-text-muted)] hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)]"
                                    title="Delete floor"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFloor(floor.id);
                                    }}
                                >
                                    <Trash2 className="size-3" />
                                </button>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* New floor form */}
            {panelView === 'new-floor' && (
                <NewFloorForm
                    nextNumber={floors.length + 1}
                    onAdd={onAddFloor}
                    onCancel={() => onSetPanelView('floors')}
                />
            )}

            {/* Marker editor */}
            {panelView === 'marker' && selectedMarker && (
                <MarkerEditor
                    marker={selectedMarker}
                    universeId={universeId}
                    onUpdate={onUpdateMarker}
                    onDelete={onDeleteMarker}
                    onClose={() => { onSetPanelView('floors'); }}
                />
            )}

            {/* Region editor */}
            {panelView === 'region' && selectedRegion && (
                <RegionEditor
                    region={selectedRegion}
                    universeId={universeId}
                    onUpdate={onUpdateRegion}
                    onDelete={onDeleteRegion}
                    onClose={() => { onSetPanelView('floors'); }}
                />
            )}

            {/* Floor image uploader */}
            {panelView === 'floor-image' && activeFloor && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <ImageIcon className="size-3 text-[var(--arc-accent)]" />
                            <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">FLOOR IMAGE</span>
                        </div>
                        <button
                            className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]"
                            onClick={() => onSetPanelView('floors')}
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                    <div className="arc-mono rounded border border-[var(--arc-border)] px-2 py-1 text-[9px] text-[var(--arc-text-muted)]">
                        {activeFloor.name.toUpperCase()}  F{activeFloor.floor_number}
                    </div>
                    <p className="text-[9px] text-[var(--arc-text-muted)]">
                        The first image will be used as the floor plan overlay. Recommended: use a top-down map image.
                    </p>
                    <ImageUploader
                        images={activeFloor.images ?? []}
                        imageableType="map_floor"
                        imageableId={activeFloor.id}
                        onImagesChange={onFloorImagesChange}
                    />
                </div>
            )}
        </div>
    );
}

//  New Floor Form 
function NewFloorForm({ nextNumber, onAdd, onCancel }: { nextNumber: number; onAdd: (name: string, num: number) => void; onCancel: () => void }) {
    const [floorName, setFloorName] = useState('');
    const [floorNumber, setFloorNumber] = useState(nextNumber);

    return (
        <div className="flex-1 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">NEW FLOOR</span>
                <button className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]" onClick={onCancel}>
                    <X className="size-3.5" />
                </button>
            </div>
            <FieldGroup label="FLOOR NAME">
                <input type="text" className="arc-input w-full text-xs" value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="e.g. Ground Floor" />
            </FieldGroup>
            <FieldGroup label="FLOOR NUMBER">
                <input type="number" className="arc-input w-full text-xs" value={floorNumber} onChange={(e) => setFloorNumber(Number(e.target.value))} />
            </FieldGroup>
            <button
                className="arc-mono flex w-full items-center justify-center gap-1.5 rounded bg-[var(--arc-accent)] px-2 py-1.5 text-[9px] font-bold tracking-wider text-[var(--arc-bg)] hover:bg-[var(--arc-accent)]/80"
                disabled={!floorName.trim()}
                onClick={() => onAdd(floorName, floorNumber)}
            >
                <Plus className="size-3" />
                ADD FLOOR
            </button>
        </div>
    );
}

//  Marker Editor 
function MarkerEditor({
    marker,
    universeId,
    onUpdate,
    onDelete,
    onClose,
}: {
    marker: ApiEntityMapMarker;
    universeId: number;
    onUpdate: (id: number, data: Record<string, unknown>) => void;
    onDelete: (id: number) => void;
    onClose: () => void;
}) {
    const [markerName, setMarkerName] = useState(marker.name);
    const [markerDesc, setMarkerDesc] = useState(marker.description || '');
    const [markerType, setMarkerType] = useState(marker.marker_type);
    const [markerColor, setMarkerColor] = useState(marker.color || '');
    const [entityId, setEntityId] = useState<number | null>(marker.entity_id ?? null);

    useEffect(() => {
        setMarkerName(marker.name);
        setMarkerDesc(marker.description || '');
        setMarkerType(marker.marker_type);
        setMarkerColor(marker.color || '');
        setEntityId(marker.entity_id ?? null);
    }, [marker]);

    return (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div className="flex items-center justify-between">
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">EDIT MARKER</span>
                <button className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]" onClick={onClose}>
                    <X className="size-3.5" />
                </button>
            </div>
            <FieldGroup label="NAME">
                <input type="text" className="arc-input w-full text-xs" value={markerName} onChange={(e) => setMarkerName(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="LINKED ENTITY">
                <EntityPicker
                    universeId={universeId}
                    value={entityId}
                    onChange={(id) => setEntityId(id)}
                    placeholder="Search entities..."
                />
            </FieldGroup>
            <FieldGroup label="DESCRIPTION">
                <textarea className="arc-input w-full resize-none text-xs" rows={2} value={markerDesc} onChange={(e) => setMarkerDesc(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="TYPE">
                <select className="arc-input w-full text-xs" value={markerType} onChange={(e) => setMarkerType(e.target.value as typeof markerType)}>
                    {MARKER_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/-/g, ' ').toUpperCase()}</option>
                    ))}
                </select>
            </FieldGroup>
            <FieldGroup label="COLOR">
                <ColorPalette value={markerColor} onChange={setMarkerColor} />
            </FieldGroup>
            <div className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                Position: ({marker.x_percent.toFixed(1)}%, {marker.y_percent.toFixed(1)}%)  drag pin to reposition
            </div>
            <div className="flex items-center gap-2 pt-1">
                <button
                    className="arc-mono flex flex-1 items-center justify-center gap-1 rounded bg-[var(--arc-accent)]/10 px-2 py-1.5 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20"
                    onClick={() => onUpdate(marker.id, { name: markerName, description: markerDesc, marker_type: markerType, color: markerColor || null, entity_id: entityId })}
                >
                    <Save className="size-3" /> SAVE
                </button>
                <button
                    className="flex items-center justify-center rounded bg-[var(--arc-danger)]/10 p-1.5 text-[var(--arc-danger)] hover:bg-[var(--arc-danger)]/20"
                    title="Delete marker"
                    onClick={() => onDelete(marker.id)}
                >
                    <Trash2 className="size-3" />
                </button>
            </div>
        </div>
    );
}

//  Region Editor 
function RegionEditor({
    region,
    universeId,
    onUpdate,
    onDelete,
    onClose,
}: {
    region: ApiEntityMapRegion;
    universeId: number;
    onUpdate: (id: number, data: Record<string, unknown>) => void;
    onDelete: (id: number) => void;
    onClose: () => void;
}) {
    const [regionName, setRegionName] = useState(region.name);
    const [regionDesc, setRegionDesc] = useState(region.description || '');
    const [regionType, setRegionType] = useState(region.region_type);
    const [regionColor, setRegionColor] = useState(region.color || '');
    const [fillOpacity, setFillOpacity] = useState(region.fill_opacity);
    const [entityId, setEntityId] = useState<number | null>(region.entity_id ?? null);

    useEffect(() => {
        setRegionName(region.name);
        setRegionDesc(region.description || '');
        setRegionType(region.region_type);
        setRegionColor(region.color || '');
        setFillOpacity(region.fill_opacity);
        setEntityId(region.entity_id ?? null);
    }, [region]);

    return (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div className="flex items-center justify-between">
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">EDIT REGION</span>
                <button className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]" onClick={onClose}>
                    <X className="size-3.5" />
                </button>
            </div>
            <FieldGroup label="NAME">
                <input type="text" className="arc-input w-full text-xs" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="LINKED ENTITY">
                <EntityPicker
                    universeId={universeId}
                    value={entityId}
                    onChange={(id) => setEntityId(id)}
                    placeholder="Search entities..."
                />
            </FieldGroup>
            <FieldGroup label="DESCRIPTION">
                <textarea className="arc-input w-full resize-none text-xs" rows={2} value={regionDesc} onChange={(e) => setRegionDesc(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="TYPE">
                <select className="arc-input w-full text-xs" value={regionType} onChange={(e) => setRegionType(e.target.value as typeof regionType)}>
                    {REGION_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/-/g, ' ').toUpperCase()}</option>
                    ))}
                </select>
            </FieldGroup>
            <FieldGroup label="COLOR">
                <ColorPalette value={regionColor} onChange={setRegionColor} />
            </FieldGroup>
            <FieldGroup label="FILL OPACITY">
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="flex-1"
                        value={fillOpacity}
                        onChange={(e) => setFillOpacity(Number(e.target.value))}
                    />
                    <span className="arc-mono w-8 shrink-0 text-right text-[8px] text-[var(--arc-text-muted)]">{(fillOpacity * 100).toFixed(0)}%</span>
                </div>
            </FieldGroup>
            <div className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                {region.boundary_points.length} boundary points
            </div>
            <div className="flex items-center gap-2 pt-1">
                <button
                    className="arc-mono flex flex-1 items-center justify-center gap-1 rounded bg-[var(--arc-accent)]/10 px-2 py-1.5 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20"
                    onClick={() => onUpdate(region.id, { name: regionName, description: regionDesc, region_type: regionType, color: regionColor || null, fill_opacity: fillOpacity, entity_id: entityId })}
                >
                    <Save className="size-3" /> SAVE
                </button>
                <button
                    className="flex items-center justify-center rounded bg-[var(--arc-danger)]/10 p-1.5 text-[var(--arc-danger)] hover:bg-[var(--arc-danger)]/20"
                    title="Delete region"
                    onClick={() => onDelete(region.id)}
                >
                    <Trash2 className="size-3" />
                </button>
            </div>
        </div>
    );
}
