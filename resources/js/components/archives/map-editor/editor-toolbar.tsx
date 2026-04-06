import {
    CornerDownLeft,
    Crosshair,
    Layers,
    Loader2,
    MousePointer2,
    Pentagon,
    Save,
    Undo2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { floorLabel } from '@/lib/map-utils';
import { useMapEditorStore } from './use-map-editor-store';
import type { EditorMode } from './use-map-editor-store';

const MODE_CONFIG: { mode: EditorMode; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { mode: 'select', icon: <MousePointer2 className="size-3.5" />, label: 'Select', shortcut: '1' },
    { mode: 'place-marker', icon: <Crosshair className="size-3.5" />, label: 'Place Marker', shortcut: '2' },
    { mode: 'draw-region', icon: <Pentagon className="size-3.5" />, label: 'Draw Region', shortcut: '3' },
];

export function EditorToolbar() {
    const {
        mode, setMode,
        mapData, name, setName, dirtyMeta, saving, saveMapMeta,
        activeFloorId, setActiveFloor,
        drawingPoints, undoDrawingPoint, cancelDrawing, finishRegion,
        getActiveFloor,
    } = useMapEditorStore();

    const floors = mapData?.floors ?? [];
    const activeFloor = getActiveFloor();

    return (
        <div className="flex shrink-0 items-center gap-1 border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1">
            {/* Mode toggles */}
            <div className="flex items-center rounded border border-[var(--arc-border)] bg-[var(--arc-bg)] p-0.5">
                {MODE_CONFIG.map(({ mode: m, icon, label, shortcut }) => (
                    <button
                        key={m}
                        title={`${label} (${shortcut})`}
                        disabled={m !== 'select' && !activeFloor}
                        className={cn(
                            'flex items-center gap-1 rounded px-2 py-1 transition-colors',
                            mode === m
                                ? 'bg-[var(--arc-accent)] text-white shadow-sm'
                                : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]',
                            m !== 'select' && !activeFloor && 'cursor-not-allowed opacity-30',
                        )}
                        onClick={() => {
                            setMode(m);
                        }}
                    >
                        {icon}
                        <span className="arc-mono hidden text-[8px] font-semibold tracking-wider sm:inline">
                            {label.toUpperCase()}
                        </span>
                    </button>
                ))}
            </div>

            {/* Drawing controls */}
            {mode === 'draw-region' && (
                <div className="flex items-center gap-1 ml-1">
                    {drawingPoints.length > 0 && (
                        <button
                            className="arc-mono flex items-center gap-1 rounded border border-[var(--arc-border)] px-2 py-1 text-[8px] tracking-wider text-[var(--arc-text-muted)] hover:text-[var(--arc-text)] transition-colors"
                            title="Undo last point (Ctrl+Z)"
                            onClick={undoDrawingPoint}
                        >
                            <Undo2 className="size-3" /> UNDO
                        </button>
                    )}
                    {drawingPoints.length >= 3 && (
                        <button
                            className="arc-mono flex items-center gap-1 rounded bg-[var(--arc-success)] px-2 py-1 text-[8px] font-bold tracking-wider text-white hover:bg-[var(--arc-success)]/80 transition-colors"
                            onClick={finishRegion}
                        >
                            <CornerDownLeft className="size-3" /> FINISH ({drawingPoints.length} pts)
                        </button>
                    )}
                    {drawingPoints.length > 0 && (
                        <button
                            className="rounded p-1 text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)] transition-colors"
                            title="Cancel drawing (Esc)"
                            onClick={cancelDrawing}
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                    {drawingPoints.length === 0 && (
                        <span className="arc-mono text-[8px] text-[var(--arc-text-muted)] animate-pulse">
                            Click on the map to start drawing...
                        </span>
                    )}
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Floor tabs */}
            {floors.length > 0 && (
                <div className="flex items-center gap-0.5 rounded border border-[var(--arc-border)] bg-[var(--arc-bg)] p-0.5 overflow-x-auto max-w-[50%]">
                    {floors.map((floor) => {
                        const markers = floor.markers?.length ?? 0;
                        const regions = floor.regions?.length ?? 0;
                        const hasImage = (floor.images?.length ?? 0) > 0;
                        return (
                            <button
                                key={floor.id}
                                className={cn(
                                    'flex items-center gap-1 rounded px-2 py-1 transition-colors whitespace-nowrap',
                                    floor.id === activeFloorId
                                        ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                        : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]',
                                )}
                                onClick={() => setActiveFloor(floor.id)}
                            >
                                <Layers className="size-3 shrink-0 opacity-60" />
                                <span className="arc-mono text-[8px] font-semibold tracking-wider">
                                    {floorLabel(floor.floor_number)}
                                </span>
                                {(markers + regions) > 0 && (
                                    <span className={cn(
                                        'arc-mono rounded-full px-1 text-[7px]',
                                        floor.id === activeFloorId ? 'bg-[var(--arc-accent)]/20' : 'bg-[var(--arc-border)]/50',
                                    )}>
                                        {markers + regions}
                                    </span>
                                )}
                                {!hasImage && (
                                    <span className="size-1.5 rounded-full bg-[var(--arc-warning)]" title="No floor image" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Save indicator */}
            <div className="flex items-center gap-1 ml-2">
                {dirtyMeta && (
                    <span className="size-2 rounded-full bg-[var(--arc-warning)] animate-pulse" title="Unsaved changes" />
                )}
                <button
                    className={cn(
                        'arc-mono flex items-center gap-1 rounded px-2 py-1 text-[8px] font-semibold tracking-wider transition-colors',
                        dirtyMeta
                            ? 'bg-[var(--arc-accent)] text-white hover:bg-[var(--arc-accent)]/80'
                            : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                    )}
                    disabled={saving || !name.trim()}
                    onClick={saveMapMeta}
                    title="Save map metadata (Ctrl+S)"
                >
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    SAVE
                </button>
            </div>
        </div>
    );
}
