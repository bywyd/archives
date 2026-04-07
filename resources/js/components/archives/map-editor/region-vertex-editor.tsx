/**
 * RegionVertexEditor
 *
 * Renders inside <MapContainer> when a region is selected in "select" mode.
 * Provides:
 *   - Draggable vertex handles at each boundary_points[i]
 *   - Edge-midpoint handles to insert a new vertex between two existing ones
 *   - Centroid drag handle to move the entire region
 *   - Delete handles (shown on hover) to remove a vertex (only when ≥ 4 points)
 */

import { useCallback, useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { pctToLatLng, latLngToPct } from '@/lib/map-utils';
import { useMapEditorStore } from './use-map-editor-store';
import type { ApiEntityMapRegion } from '@/types/api';

interface Props {
    region: ApiEntityMapRegion;
    bounds: L.LatLngBoundsExpression;
}

// ── Icon factories ──────────────────────────────────────────────────────────

function vertexIcon(active = false) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:12px;height:12px;border-radius:50%;
            background:${active ? '#f472b6' : '#22d3ee'};
            border:2px solid #fff;
            box-shadow:0 0 4px rgba(0,0,0,.5);
            cursor:grab;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    });
}

function midpointIcon() {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:8px;height:8px;border-radius:50%;
            background:#a5f3fc;opacity:.65;
            border:1.5px solid #fff;
            box-shadow:0 0 3px rgba(0,0,0,.35);
            cursor:copy;
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
    });
}

function centroidIcon() {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:16px;height:16px;
            background:#fbbf24;border-radius:3px;
            border:2px solid #fff;
            box-shadow:0 0 4px rgba(0,0,0,.5);
            cursor:move;
            display:flex;align-items:center;justify-content:center;
        ">
            <svg style="width:10px;height:10px;fill:#fff" viewBox="0 0 20 20">
                <path d="M10 0l2 4H8l2-4zm0 20l-2-4h4l-2 4zM0 10l4-2v4L0 10zm20 0l-4 2v-4l4 2z"/>
            </svg>
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

function deleteVertexIcon() {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:#ef4444;
            border:2px solid #fff;
            box-shadow:0 0 4px rgba(0,0,0,.5);
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            font-size:10px;color:#fff;font-weight:700;line-height:1;
        ">×</div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeCentroid(points: { x: number; y: number }[]) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
}

// ── Component ────────────────────────────────────────────────────────────────

export function RegionVertexEditor({ region, bounds }: Props) {
    const updateRegionVertices = useMapEditorStore((s) => s.updateRegionVertices);
    const points: { x: number; y: number }[] = region.boundary_points ?? [];

    // Vertex drag-end: replace that point's position
    const onVertexDragEnd = useCallback(
        (index: number, e: L.DragEndEvent) => {
            const marker = e.target as L.Marker;
            const latlng = marker.getLatLng();
            const pct = latLngToPct(latlng, bounds);
            const next = points.map((p, i) => (i === index ? pct : p));
            updateRegionVertices(region.id, next);
        },
        [points, bounds, region.id, updateRegionVertices],
    );

    // Midpoint click: insert a new vertex between [index] and [index+1]
    const onMidpointClick = useCallback(
        (index: number, latlng: L.LatLng) => {
            const pct = latLngToPct(latlng, bounds);
            const next = [...points.slice(0, index + 1), pct, ...points.slice(index + 1)];
            updateRegionVertices(region.id, next);
        },
        [points, bounds, region.id, updateRegionVertices],
    );

    // Delete vertex: remove point at index (only when ≥ 4 points)
    const onDeleteVertex = useCallback(
        (index: number) => {
            if (points.length < 4) return;
            const next = points.filter((_, i) => i !== index);
            updateRegionVertices(region.id, next);
        },
        [points, region.id, updateRegionVertices],
    );

    // Centroid drag: translate all points by delta on drag-end
    const centroid = useMemo(() => computeCentroid(points), [points]);

    const onCentroidDragStart = useCallback(
        (e: L.LeafletEvent) => {
            const marker = e.target as L.Marker;
            (marker as any)._dragStartPct = latLngToPct(marker.getLatLng(), bounds);
        },
        [bounds],
    );

    const onCentroidDragEnd = useCallback(
        (e: L.DragEndEvent) => {
            const marker = e.target as L.Marker;
            const endPct = latLngToPct(marker.getLatLng(), bounds);
            const startPct: { x: number; y: number } = (marker as any)._dragStartPct ?? centroid;
            const dx = endPct.x - startPct.x;
            const dy = endPct.y - startPct.y;
            const next = points.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
            }));
            updateRegionVertices(region.id, next);
        },
        [points, bounds, centroid, region.id, updateRegionVertices],
    );

    if (points.length < 3) return null;

    const centroidLatLng = pctToLatLng(centroid.x, centroid.y, bounds);

    return (
        <>
            {/* Centroid move handle */}
            <Marker
                position={centroidLatLng}
                icon={centroidIcon()}
                draggable
                zIndexOffset={500}
                eventHandlers={{
                    dragstart: onCentroidDragStart,
                    dragend: onCentroidDragEnd,
                }}
            />

            {points.map((point, index) => {
                const latlng = pctToLatLng(point.x, point.y, bounds);
                const next = points[(index + 1) % points.length];
                const midPct = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
                const midLatLng = pctToLatLng(midPct.x, midPct.y, bounds);

                return (
                    <span key={`v-${region.id}-${index}`}>
                        {/* Vertex handle */}
                        <Marker
                            position={latlng}
                            icon={vertexIcon()}
                            draggable
                            zIndexOffset={400}
                            eventHandlers={{
                                dragend: (e) => onVertexDragEnd(index, e as L.DragEndEvent),
                            }}
                        />

                        {/* Delete handle - offset slightly so it doesn't overlap the vertex */}
                        {points.length >= 4 && (
                            <Marker
                                position={latlng}
                                icon={deleteVertexIcon()}
                                zIndexOffset={600}
                                // Nudge icon so it sits top-right of the vertex circle
                                // We override iconAnchor via a shifted icon
                                eventHandlers={{
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e.originalEvent);
                                        onDeleteVertex(index);
                                    },
                                }}
                                opacity={0}
                                // We have to use pane to ensure the delete icon is on top
                                // Use a custom icon with offset anchor
                                icon={L.divIcon({
                                    className: '',
                                    html: `<div style="
                                        width:14px;height:14px;border-radius:50%;
                                        background:#ef4444;
                                        border:2px solid #fff;
                                        box-shadow:0 0 4px rgba(0,0,0,.5);
                                        cursor:pointer;
                                        display:flex;align-items:center;justify-content:center;
                                        font-size:10px;color:#fff;font-weight:700;line-height:1;
                                    ">×</div>`,
                                    iconSize: [14, 14],
                                    iconAnchor: [-2, 16], // top-right offset from vertex centre
                                })}
                            >
                            </Marker>
                        )}

                        {/* Edge midpoint insertion handle */}
                        <Marker
                            position={midLatLng}
                            icon={midpointIcon()}
                            zIndexOffset={300}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e.originalEvent);
                                    onMidpointClick(index, midLatLng);
                                },
                            }}
                        />
                    </span>
                );
            })}
        </>
    );
}
