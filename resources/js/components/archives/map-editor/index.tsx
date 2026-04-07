import { useEffect } from 'react';
import { Loader2, MapPin, Save } from 'lucide-react';
import { useMapEditorStore } from './use-map-editor-store';
import { EditorToolbar } from './editor-toolbar';
import { EditorCanvas } from './editor-canvas';
import { FloorPanel } from './floor-panel';
import { PropertyPanel } from './property-panel';
import { EditorShortcuts } from './editor-shortcuts';
import { FieldGroup } from './shared';

type Props = {
    universeId: number;
    entityId: number;
    mapId?: number;
};

export function EntityMapEditor({ universeId, entityId, mapId }: Props) {
    const {
        loading, mapData, selection,
        name, saving, setName, setDescription, description, saveMapMeta,
        init,
    } = useMapEditorStore();

    // Initialize store on mount / prop change
    useEffect(() => {
        init(universeId, entityId, mapId);
    }, [universeId, entityId, mapId, init]);

    // Loading state
    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--arc-bg)]">
                <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-xs tracking-widest text-[var(--arc-text-muted)]">
                    LOADING MAP EDITOR...
                </span>
            </div>
        );
    }

    // No map yet → unified creation form embedded in the same layout
    if (!mapData && !mapId) {
        return (
            <div className="flex h-full flex-col bg-[var(--arc-bg)]">
                <div className="flex shrink-0 items-center gap-2 border-b border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2">
                    <MapPin className="size-3.5 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        CREATE NEW MAP
                    </span>
                </div>
                <div className="flex flex-1 items-center justify-center p-6">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="text-center">
                            <div className="mx-auto size-12 rounded-full bg-[var(--arc-accent)]/10 flex items-center justify-center">
                                <MapPin className="size-5 text-[var(--arc-accent)]" />
                            </div>
                            <p className="arc-mono mt-3 text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                                SET UP YOUR MAP
                            </p>
                        </div>
                        <FieldGroup label="MAP NAME">
                            <input
                                type="text"
                                className="arc-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Spencer Mansion"
                                autoFocus
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
                        <button
                            className="arc-mono flex w-full items-center justify-center gap-2 rounded bg-[var(--arc-accent)] px-4 py-2 text-[10px] font-bold tracking-wider text-white hover:bg-[var(--arc-accent)]/80 transition-colors disabled:opacity-40"
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

    return (
        <div className="flex h-full flex-col bg-[var(--arc-bg)]">
            {/* Global keyboard shortcuts */}
            <EditorShortcuts />

            {/* Toolbar */}
            <EditorToolbar />

            {/* Body: 3-column layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Floor panel */}
                <div className="w-56 shrink-0 border-r border-[var(--arc-border)] bg-[var(--arc-surface)]">
                    <FloorPanel />
                </div>

                {/* Center: Map canvas */}
                <div className="relative flex-1 overflow-hidden">
                    <EditorCanvas />
                </div>

                {/* Right: Property panel (conditional) */}
                {selection && (
                    <div className="w-64 shrink-0">
                        <PropertyPanel />
                    </div>
                )}
            </div>
        </div>
    );
}
