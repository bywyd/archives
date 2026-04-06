import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/api';
import type {
    ApiEntityMap,
    ApiEntityMapFloor,
    ApiEntityMapMarker,
    ApiEntityMapRegion,
    ApiImage,
} from '@/types/api';

export type EditorMode = 'select' | 'place-marker' | 'draw-region';

export type Selection =
    | { type: 'marker'; id: number }
    | { type: 'region'; id: number }
    | { type: 'floor'; id: number }
    | null;

interface MapEditorState {
    // Context
    universeId: number;
    entityId: number;

    // Data
    mapData: ApiEntityMap | null;
    loading: boolean;
    saving: boolean;

    // Meta form
    name: string;
    description: string;
    dirtyMeta: boolean;

    // Floor
    activeFloorId: number | null;

    // Editor mode
    mode: EditorMode;
    selection: Selection;
    drawingPoints: { x: number; y: number }[];

    // Computed helpers
    getActiveFloor: () => ApiEntityMapFloor | null;
    getSelectedMarker: () => ApiEntityMapMarker | null;
    getSelectedRegion: () => ApiEntityMapRegion | null;
    getFloorImage: () => ApiImage | null;

    // Initialization
    init: (universeId: number, entityId: number, mapId?: number) => void;

    // Meta
    setName: (name: string) => void;
    setDescription: (desc: string) => void;
    saveMapMeta: () => Promise<void>;

    // Floor
    setActiveFloor: (id: number | null) => void;
    addFloor: (name: string, floorNumber: number) => Promise<void>;
    deleteFloor: (floorId: number) => Promise<void>;
    updateFloorImages: (floorId: number) => void;
    patchFloorDimensions: (floorId: number, width: number, height: number) => Promise<void>;

    // Mode & Selection
    setMode: (mode: EditorMode) => void;
    select: (selection: Selection) => void;
    clearSelection: () => void;

    // Drawing
    addDrawingPoint: (pt: { x: number; y: number }) => void;
    undoDrawingPoint: () => void;
    cancelDrawing: () => void;

    // Marker CRUD
    placeMarker: (xPct: number, yPct: number) => Promise<void>;
    updateMarker: (markerId: number, data: Record<string, unknown>) => Promise<void>;
    deleteMarker: (markerId: number) => Promise<void>;

    // Region CRUD
    finishRegion: () => Promise<void>;
    updateRegion: (regionId: number, data: Record<string, unknown>) => Promise<void>;
    updateRegionVertices: (regionId: number, points: { x: number; y: number }[]) => Promise<void>;
    deleteRegion: (regionId: number) => Promise<void>;

    // Full refresh (fallback)
    refreshMap: () => Promise<void>;
}

export const useMapEditorStore = create<MapEditorState>((set, get) => ({
    universeId: 0,
    entityId: 0,
    mapData: null,
    loading: false,
    saving: false,
    name: '',
    description: '',
    dirtyMeta: false,
    activeFloorId: null,
    mode: 'select',
    selection: null,
    drawingPoints: [],

    // Computed
    getActiveFloor: () => {
        const { mapData, activeFloorId } = get();
        return mapData?.floors?.find((f) => f.id === activeFloorId) ?? null;
    },

    getSelectedMarker: () => {
        const { selection, mapData, activeFloorId } = get();
        if (!selection || selection.type !== 'marker') return null;
        const floor = mapData?.floors?.find((f) => f.id === activeFloorId);
        return floor?.markers?.find((m) => m.id === selection.id) ?? null;
    },

    getSelectedRegion: () => {
        const { selection, mapData, activeFloorId } = get();
        if (!selection || selection.type !== 'region') return null;
        const floor = mapData?.floors?.find((f) => f.id === activeFloorId);
        return floor?.regions?.find((r) => r.id === selection.id) ?? null;
    },

    getFloorImage: () => {
        const floor = get().getActiveFloor();
        return floor?.images?.[0] ?? null;
    },

    // Init
    init: async (universeId, entityId, mapId) => {
        set({ universeId, entityId, loading: !!mapId });
        if (!mapId) return;
        try {
            const res = await api.fetchEntityMap(universeId, entityId, mapId);
            const map = res.data;
            set({
                mapData: map,
                name: map.name,
                description: map.description || '',
                activeFloorId: map.floors?.[0]?.id ?? null,
                loading: false,
            });
        } catch (err: any) {
            toast.error('Failed to load map', { description: err.message });
            set({ loading: false });
        }
    },

    // Meta
    setName: (name) => set({ name, dirtyMeta: true }),
    setDescription: (description) => set({ description, dirtyMeta: true }),

    saveMapMeta: async () => {
        const { universeId, entityId, mapData, name, description } = get();
        set({ saving: true });
        try {
            if (mapData) {
                const res = await api.updateEntityMap(universeId, entityId, mapData.id, { name, description });
                set({ mapData: res.data, name: res.data.name, description: res.data.description || '', dirtyMeta: false });
                toast.success('Map saved');
            } else {
                const res = await api.createEntityMap(universeId, entityId, { name, description });
                const map = res.data;
                set({
                    mapData: map,
                    name: map.name,
                    description: map.description || '',
                    activeFloorId: map.floors?.[0]?.id ?? null,
                    dirtyMeta: false,
                });
                toast.success('Map created');
            }
        } catch (err: any) {
            toast.error('Failed to save map', { description: err.message });
        } finally {
            set({ saving: false });
        }
    },

    // Floor
    setActiveFloor: (id) => set({ activeFloorId: id, selection: null }),

    addFloor: async (name, floorNumber) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        try {
            const res = await api.createMapFloor(universeId, entityId, mapData.id, {
                name,
                floor_number: floorNumber,
            });
            const newFloor: ApiEntityMapFloor = res.data;
            set((s) => ({
                mapData: s.mapData
                    ? { ...s.mapData, floors: [...(s.mapData.floors ?? []), newFloor] }
                    : s.mapData,
                activeFloorId: newFloor.id,
            }));
            toast.success(`Floor "${name}" added`);
        } catch (err: any) {
            toast.error('Failed to add floor', { description: err.message });
        }
    },

    deleteFloor: async (floorId) => {
        const { universeId, entityId, mapData, activeFloorId } = get();
        if (!mapData) return;
        // Optimistic removal
        const prevFloors = mapData.floors ?? [];
        set((s) => ({
            mapData: s.mapData
                ? { ...s.mapData, floors: (s.mapData.floors ?? []).filter((f) => f.id !== floorId) }
                : s.mapData,
            activeFloorId: activeFloorId === floorId ? null : activeFloorId,
            selection: null,
        }));
        try {
            await api.deleteMapFloor(universeId, entityId, mapData.id, floorId);
            toast.success('Floor deleted');
        } catch (err: any) {
            // Revert
            set((s) => ({
                mapData: s.mapData ? { ...s.mapData, floors: prevFloors } : s.mapData,
                activeFloorId: activeFloorId,
            }));
            toast.error('Failed to delete floor', { description: err.message });
        }
    },

    updateFloorImages: () => {
        // Trigger a full refresh after image upload changes
        get().refreshMap();
    },

    patchFloorDimensions: async (floorId, width, height) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        // Update local state immediately so the canvas redraws at the correct aspect ratio
        set((s) => ({
            mapData: s.mapData
                ? {
                      ...s.mapData,
                      floors: (s.mapData.floors ?? []).map((f) =>
                          f.id === floorId ? { ...f, image_width: width, image_height: height } : f,
                      ),
                  }
                : s.mapData,
        }));
        // Persist silently so next load already has the right dimensions
        try {
            await api.updateMapFloor(universeId, entityId, mapData.id, floorId, {
                image_width: width,
                image_height: height,
            });
        } catch {
            // Non-critical — dimensions will be re-detected on the next load
        }
    },

    // Mode & Selection
    setMode: (mode) => set({ mode, drawingPoints: mode === 'draw-region' ? get().drawingPoints : [] }),
    select: (selection) => set({ selection }),
    clearSelection: () => set({ selection: null }),

    // Drawing
    addDrawingPoint: (pt) => set((s) => ({ drawingPoints: [...s.drawingPoints, pt] })),
    undoDrawingPoint: () => set((s) => ({ drawingPoints: s.drawingPoints.slice(0, -1) })),
    cancelDrawing: () => set({ drawingPoints: [], mode: 'select' }),

    // Marker CRUD
    placeMarker: async (xPct, yPct) => {
        const { universeId, entityId, mapData, activeFloorId } = get();
        if (!mapData || !activeFloorId) return;
        try {
            const res = await api.createMapMarker(universeId, entityId, mapData.id, {
                entity_map_floor_id: activeFloorId,
                name: 'New Marker',
                x_percent: xPct,
                y_percent: yPct,
                marker_type: 'poi',
            });
            const marker = res.data;
            // Insert into local state
            set((s) => {
                const floors = (s.mapData?.floors ?? []).map((f) =>
                    f.id === activeFloorId
                        ? { ...f, markers: [...(f.markers ?? []), marker] }
                        : f,
                );
                return {
                    mapData: s.mapData ? { ...s.mapData, floors } : s.mapData,
                    selection: { type: 'marker', id: marker.id },
                    mode: 'select',
                };
            });
            toast.success('Marker placed');
        } catch (err: any) {
            toast.error('Failed to place marker', { description: err.message });
        }
    },

    updateMarker: async (markerId, data) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        try {
            const res = await api.updateMapMarker(universeId, entityId, mapData.id, markerId, data);
            const updated = res.data;
            set((s) => {
                const floors = (s.mapData?.floors ?? []).map((f) => ({
                    ...f,
                    markers: (f.markers ?? []).map((m) => (m.id === markerId ? updated : m)),
                }));
                return { mapData: s.mapData ? { ...s.mapData, floors } : s.mapData };
            });
            toast.success('Marker updated');
        } catch (err: any) {
            toast.error('Failed to update marker', { description: err.message });
        }
    },

    deleteMarker: async (markerId) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        // Optimistic
        const prevFloors = mapData.floors ?? [];
        set((s) => {
            const floors = (s.mapData?.floors ?? []).map((f) => ({
                ...f,
                markers: (f.markers ?? []).filter((m) => m.id !== markerId),
            }));
            return {
                mapData: s.mapData ? { ...s.mapData, floors } : s.mapData,
                selection: null,
            };
        });
        try {
            await api.deleteMapMarker(universeId, entityId, mapData.id, markerId);
            toast.success('Marker deleted');
        } catch (err: any) {
            set((s) => ({ mapData: s.mapData ? { ...s.mapData, floors: prevFloors } : s.mapData }));
            toast.error('Failed to delete marker', { description: err.message });
        }
    },

    // Region CRUD
    finishRegion: async () => {
        const { universeId, entityId, mapData, activeFloorId, drawingPoints } = get();
        if (!mapData || !activeFloorId || drawingPoints.length < 3) return;
        try {
            const res = await api.createMapRegion(universeId, entityId, mapData.id, {
                entity_map_floor_id: activeFloorId,
                name: 'New Region',
                boundary_points: drawingPoints,
                region_type: 'room',
            });
            const region = res.data;
            set((s) => {
                const floors = (s.mapData?.floors ?? []).map((f) =>
                    f.id === activeFloorId
                        ? { ...f, regions: [...(f.regions ?? []), region] }
                        : f,
                );
                return {
                    mapData: s.mapData ? { ...s.mapData, floors } : s.mapData,
                    drawingPoints: [],
                    selection: { type: 'region', id: region.id },
                    mode: 'select',
                };
            });
            toast.success('Region created');
        } catch (err: any) {
            toast.error('Failed to create region', { description: err.message });
        }
    },

    updateRegion: async (regionId, data) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        try {
            const res = await api.updateMapRegion(universeId, entityId, mapData.id, regionId, data);
            const updated = res.data;
            set((s) => {
                const floors = (s.mapData?.floors ?? []).map((f) => ({
                    ...f,
                    regions: (f.regions ?? []).map((r) => (r.id === regionId ? updated : r)),
                }));
                return { mapData: s.mapData ? { ...s.mapData, floors } : s.mapData };
            });
            toast.success('Region updated');
        } catch (err: any) {
            toast.error('Failed to update region', { description: err.message });
        }
    },

    updateRegionVertices: async (regionId, points) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        const prevFloors = mapData.floors ?? [];
        // Optimistically update boundary_points in local state immediately
        set((s) => {
            const floors = (s.mapData?.floors ?? []).map((f) => ({
                ...f,
                regions: (f.regions ?? []).map((r) =>
                    r.id === regionId ? { ...r, boundary_points: points } : r,
                ),
            }));
            return { mapData: s.mapData ? { ...s.mapData, floors } : s.mapData };
        });
        try {
            await api.updateMapRegion(universeId, entityId, mapData.id, regionId, {
                boundary_points: points,
            });
        } catch (err: any) {
            set((s) => ({ mapData: s.mapData ? { ...s.mapData, floors: prevFloors } : s.mapData }));
            toast.error('Failed to update region vertices', { description: err.message });
        }
    },

    deleteRegion: async (regionId) => {
        const { universeId, entityId, mapData } = get();
        if (!mapData) return;
        const prevFloors = mapData.floors ?? [];
        set((s) => {
            const floors = (s.mapData?.floors ?? []).map((f) => ({
                ...f,
                regions: (f.regions ?? []).filter((r) => r.id !== regionId),
            }));
            return {
                mapData: s.mapData ? { ...s.mapData, floors } : s.mapData,
                selection: null,
            };
        });
        try {
            await api.deleteMapRegion(universeId, entityId, mapData.id, regionId);
            toast.success('Region deleted');
        } catch (err: any) {
            set((s) => ({ mapData: s.mapData ? { ...s.mapData, floors: prevFloors } : s.mapData }));
            toast.error('Failed to delete region', { description: err.message });
        }
    },

    // Refresh
    refreshMap: async () => {
        const { universeId, entityId, mapData } = get();
        if (!mapData?.id) return;
        try {
            const res = await api.fetchEntityMap(universeId, entityId, mapData.id);
            set({
                mapData: res.data,
                name: res.data.name,
                description: res.data.description || '',
            });
        } catch {
            // silent - used after image uploads
        }
    },
}));
