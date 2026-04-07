import { useState } from 'react';
import {
    ChevronRight,
    ImageIcon,
    Layers,
    MapPin,
    Pentagon,
    Plus,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { floorLabel, MARKER_COLORS, REGION_COLORS } from '@/lib/map-utils';
import { ConfirmButton } from './shared';
import { NewFloorForm } from './floor-form';
import { useMapEditorStore } from './use-map-editor-store';
import type { ApiEntityMapFloor } from '@/types/api';

export function FloorPanel() {
    const {
        mapData,
        activeFloorId,
        setActiveFloor,
        deleteFloor,
        selection,
        select,
        name,
        description,
        setName,
        setDescription,
        getActiveFloor,
    } = useMapEditorStore();

    const [showNewFloor, setShowNewFloor] = useState(false);
    const [expandedFloorId, setExpandedFloorId] = useState<number | null>(null);

    const floors = mapData?.floors ?? [];
    const activeFloor = getActiveFloor();

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Map meta header */}
            <div className="shrink-0 border-b border-[var(--arc-border)] p-2.5 space-y-2">
                <input
                    type="text"
                    className="arc-input w-full text-xs font-semibold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Map name..."
                />
                <textarea
                    className="arc-input w-full resize-none text-[10px]"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description..."
                />
            </div>

            {/* Floor list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="flex items-center justify-between px-1 pb-1">
                    <span className="arc-mono text-[8px] font-bold tracking-[0.15em] text-[var(--arc-text-muted)]">
                        FLOORS ({floors.length})
                    </span>
                    <button
                        className="flex items-center gap-0.5 rounded p-0.5 text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/10 transition-colors"
                        title="Add floor"
                        onClick={() => setShowNewFloor(true)}
                    >
                        <Plus className="size-3.5" />
                    </button>
                </div>

                {floors.length === 0 && !showNewFloor && (
                    <div className="rounded border border-dashed border-[var(--arc-border)] px-3 py-4 text-center">
                        <Layers className="mx-auto size-5 text-[var(--arc-text-muted)] opacity-30" />
                        <p className="arc-mono mt-1.5 text-[8px] text-[var(--arc-text-muted)]">
                            No floors yet
                        </p>
                        <button
                            className="arc-mono mt-2 rounded bg-[var(--arc-accent)]/10 px-3 py-1 text-[8px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20 transition-colors"
                            onClick={() => setShowNewFloor(true)}
                        >
                            + ADD FIRST FLOOR
                        </button>
                    </div>
                )}

                {floors.map((floor) => (
                    <FloorItem
                        key={floor.id}
                        floor={floor}
                        isActive={floor.id === activeFloorId}
                        isExpanded={floor.id === expandedFloorId}
                        selectedMarkerId={selection?.type === 'marker' ? selection.id : null}
                        selectedRegionId={selection?.type === 'region' ? selection.id : null}
                        onSelect={() => setActiveFloor(floor.id)}
                        onToggleExpand={() =>
                            setExpandedFloorId(expandedFloorId === floor.id ? null : floor.id)
                        }
                        onDelete={() => deleteFloor(floor.id)}
                        onSelectFloorImage={() => {
                            setActiveFloor(floor.id);
                            select({ type: 'floor', id: floor.id });
                        }}
                        onSelectItem={(sel) => {
                            setActiveFloor(floor.id);
                            select(sel);
                        }}
                    />
                ))}

                {/* New floor form - inline at the bottom */}
                {showNewFloor && (
                    <NewFloorForm onClose={() => setShowNewFloor(false)} />
                )}
            </div>
        </div>
    );
}

function FloorItem({
    floor,
    isActive,
    isExpanded,
    selectedMarkerId,
    selectedRegionId,
    onSelect,
    onToggleExpand,
    onDelete,
    onSelectFloorImage,
    onSelectItem,
}: {
    floor: ApiEntityMapFloor;
    isActive: boolean;
    isExpanded: boolean;
    selectedMarkerId: number | null;
    selectedRegionId: number | null;
    onSelect: () => void;
    onToggleExpand: () => void;
    onDelete: () => void;
    onSelectFloorImage: () => void;
    onSelectItem: (sel: { type: 'marker'; id: number } | { type: 'region'; id: number }) => void;
}) {
    const markers = floor.markers ?? [];
    const regions = floor.regions ?? [];
    const itemCount = markers.length + regions.length;
    const hasImage = (floor.images?.length ?? 0) > 0;
    const floorImageThumb = floor.images?.[0]?.thumbnail_url ?? floor.images?.[0]?.url;

    return (
        <div className={cn(
            'rounded border transition-colors',
            isActive
                ? 'border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5'
                : 'border-transparent hover:bg-[var(--arc-surface-hover)]',
        )}>
            {/* Floor row */}
            <div className="flex items-center gap-1.5 px-2 py-1.5">
                {/* Expand chevron */}
                {itemCount > 0 ? (
                    <button
                        className="shrink-0 text-[var(--arc-text-muted)] hover:text-[var(--arc-text)] transition-colors"
                        onClick={onToggleExpand}
                    >
                        <ChevronRight className={cn(
                            'size-3 transition-transform',
                            isExpanded && 'rotate-90',
                        )} />
                    </button>
                ) : (
                    <div className="size-3 shrink-0" />
                )}

                {/* Floor image thumbnail */}
                {floorImageThumb ? (
                    <button
                        className="size-7 shrink-0 rounded border border-[var(--arc-border)] overflow-hidden hover:ring-1 hover:ring-[var(--arc-accent)] transition-all"
                        onClick={onSelectFloorImage}
                        title="Edit floor image"
                    >
                        <img src={floorImageThumb} alt="" className="size-full object-cover" />
                    </button>
                ) : (
                    <button
                        className="size-7 shrink-0 rounded border border-dashed border-[var(--arc-border)] flex items-center justify-center text-[var(--arc-text-muted)] hover:border-[var(--arc-accent)] hover:text-[var(--arc-accent)] transition-colors"
                        onClick={onSelectFloorImage}
                        title="Upload floor image"
                    >
                        <ImageIcon className="size-3" />
                    </button>
                )}

                {/* Floor info */}
                <button
                    className="flex-1 min-w-0 text-left"
                    onClick={onSelect}
                >
                    <span className={cn(
                        'arc-mono block truncate text-[9px] font-semibold tracking-wider',
                        isActive ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text)]',
                    )}>
                        {floor.name.toUpperCase()}
                    </span>
                    <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">
                        {floorLabel(floor.floor_number)}
                        {itemCount > 0 && ` • ${markers.length}M / ${regions.length}R`}
                    </span>
                </button>

                {/* Actions */}
                <ConfirmButton
                    onConfirm={onDelete}
                    label="Delete floor"
                    confirmLabel="DEL?"
                    className="shrink-0 rounded p-0.5 text-[var(--arc-text-muted)] hover:bg-[var(--arc-danger)]/10 hover:text-[var(--arc-danger)] transition-colors"
                    icon={<Trash2 className="size-3" />}
                />
            </div>

            {/* Expanded items tree */}
            {isExpanded && itemCount > 0 && (
                <div className="border-t border-[var(--arc-border)]/50 px-2 py-1 space-y-0.5">
                    {markers.map((marker) => {
                        const color = marker.color || MARKER_COLORS[marker.marker_type] || '#94a3b8';
                        return (
                            <button
                                key={`m-${marker.id}`}
                                className={cn(
                                    'flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left transition-colors',
                                    selectedMarkerId === marker.id
                                        ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                        : 'text-[var(--arc-text)] hover:bg-[var(--arc-surface-hover)]',
                                )}
                                onClick={() => onSelectItem({ type: 'marker', id: marker.id })}
                            >
                                <MapPin className="size-2.5 shrink-0" style={{ color }} />
                                <span className="arc-mono flex-1 truncate text-[7px] font-semibold tracking-wider">
                                    {marker.name.toUpperCase()}
                                </span>
                                <span className="arc-mono text-[6px] text-[var(--arc-text-muted)]">
                                    {marker.marker_type.slice(0, 3).toUpperCase()}
                                </span>
                            </button>
                        );
                    })}
                    {regions.map((region) => {
                        const color = region.color || REGION_COLORS[region.region_type] || '#94a3b8';
                        return (
                            <button
                                key={`r-${region.id}`}
                                className={cn(
                                    'flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left transition-colors',
                                    selectedRegionId === region.id
                                        ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                        : 'text-[var(--arc-text)] hover:bg-[var(--arc-surface-hover)]',
                                )}
                                onClick={() => onSelectItem({ type: 'region', id: region.id })}
                            >
                                <Pentagon className="size-2.5 shrink-0" style={{ color }} />
                                <span className="arc-mono flex-1 truncate text-[7px] font-semibold tracking-wider">
                                    {region.name.toUpperCase()}
                                </span>
                                <span className="arc-mono text-[6px] text-[var(--arc-text-muted)]">
                                    {region.region_type.slice(0, 3).toUpperCase()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
