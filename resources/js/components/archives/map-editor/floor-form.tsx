import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ImageUploader } from '@/components/archives/image-uploader';
import { floorLabel } from '@/lib/map-utils';
import { FieldGroup } from './shared';
import { useMapEditorStore } from './use-map-editor-store';
import type { ApiEntityMapFloor, ApiImage } from '@/types/api';

/** Inline form for creating a new floor */
export function NewFloorForm({ onClose }: { onClose: () => void }) {
    const addFloor = useMapEditorStore((s) => s.addFloor);
    const floors = useMapEditorStore((s) => s.mapData?.floors ?? []);

    const [name, setName] = useState('');
    const [floorNumber, setFloorNumber] = useState(floors.length);

    const handleAdd = () => {
        if (!name.trim()) return;
        addFloor(name, floorNumber);
        onClose();
    };

    return (
        <div className="rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5 p-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="arc-mono text-[8px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                    NEW FLOOR
                </span>
                <button
                    className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)] transition-colors"
                    onClick={onClose}
                >
                    <X className="size-3" />
                </button>
            </div>
            <FieldGroup label="NAME">
                <input
                    type="text"
                    className="arc-input w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ground Floor"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
            </FieldGroup>
            <FieldGroup label="FLOOR NUMBER">
                <input
                    type="number"
                    className="arc-input w-full text-xs"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                />
            </FieldGroup>
            <button
                className="arc-mono flex w-full items-center justify-center gap-1 rounded bg-[var(--arc-accent)] px-2 py-1.5 text-[9px] font-bold tracking-wider text-white hover:bg-[var(--arc-accent)]/80 transition-colors disabled:opacity-40"
                disabled={!name.trim()}
                onClick={handleAdd}
            >
                <Plus className="size-3" /> ADD FLOOR
            </button>
        </div>
    );
}

/** Floor image management section (used inside property panel when a floor is selected) */
export function FloorImageSection({ floor }: { floor: ApiEntityMapFloor }) {
    const refreshMap = useMapEditorStore((s) => s.refreshMap);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                    FLOOR IMAGE
                </span>
                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                    {floor.name.toUpperCase()} — {floorLabel(floor.floor_number)}
                </span>
            </div>
            <p className="text-[9px] text-[var(--arc-text-muted)]">
                The first image becomes the floor plan overlay. Use a top-down map image.
            </p>
            <ImageUploader
                images={floor.images ?? []}
                imageableType="map_floor"
                imageableId={floor.id}
                onImagesChange={() => refreshMap()}
            />
        </div>
    );
}
