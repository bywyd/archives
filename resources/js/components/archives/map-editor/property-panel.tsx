import { MapPin, Pentagon, ImageIcon, X } from 'lucide-react';
import { useMapEditorStore } from './use-map-editor-store';
import { MarkerForm } from './marker-form';
import { RegionForm } from './region-form';
import { FloorImageSection } from './floor-form';

export function PropertyPanel() {
    const { selection, clearSelection, getSelectedMarker, getSelectedRegion, getActiveFloor } = useMapEditorStore();

    if (!selection) return null;

    const marker = selection.type === 'marker' ? getSelectedMarker() : null;
    const region = selection.type === 'region' ? getSelectedRegion() : null;
    const floor = selection.type === 'floor' ? getActiveFloor() : null;

    // If the selected item no longer exists (e.g. deleted), clear selection
    if (selection.type === 'marker' && !marker) return null;
    if (selection.type === 'region' && !region) return null;
    if (selection.type === 'floor' && !floor) return null;

    const panelTitle =
        selection.type === 'marker' ? 'MARKER' :
        selection.type === 'region' ? 'REGION' :
        'FLOOR';

    const panelIcon =
        selection.type === 'marker' ? <MapPin className="size-3" /> :
        selection.type === 'region' ? <Pentagon className="size-3" /> :
        <ImageIcon className="size-3" />;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden border-l border-[var(--arc-border)] bg-[var(--arc-surface)]">
            {/* Panel Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--arc-border)] px-3 py-2">
                <div className="flex items-center gap-1.5 text-[var(--arc-accent)]">
                    {panelIcon}
                    <span className="arc-mono text-[9px] font-bold tracking-[0.15em]">
                        EDIT {panelTitle}
                    </span>
                </div>
                <button
                    className="rounded p-0.5 text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)] transition-colors"
                    onClick={clearSelection}
                    title="Close (Esc)"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {marker && <MarkerForm marker={marker} />}
                {region && <RegionForm region={region} />}
                {floor && <FloorImageSection floor={floor} />}
            </div>
        </div>
    );
}
