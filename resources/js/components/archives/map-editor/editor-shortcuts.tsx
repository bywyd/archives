import { useEffect } from 'react';
import { useMapEditorStore } from './use-map-editor-store';

/**
 * Keyboard shortcuts handler for the map editor.
 * Mount once inside the editor layout. Uses window-level listeners.
 */
export function EditorShortcuts() {
    const {
        mode, setMode,
        selection, clearSelection,
        drawingPoints, undoDrawingPoint, cancelDrawing, finishRegion,
        deleteMarker, deleteRegion,
        saveMapMeta, dirtyMeta,
        getActiveFloor,
    } = useMapEditorStore();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't capture when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            // Ctrl+S - save map meta
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (dirtyMeta) saveMapMeta();
                return;
            }

            // Ctrl+Z - undo drawing point
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (mode === 'draw-region' && drawingPoints.length > 0) {
                    e.preventDefault();
                    undoDrawingPoint();
                }
                return;
            }

            // Escape - cancel drawing or deselect
            if (e.key === 'Escape') {
                if (mode === 'draw-region' && drawingPoints.length > 0) {
                    cancelDrawing();
                } else if (mode !== 'select') {
                    setMode('select');
                } else if (selection) {
                    clearSelection();
                }
                return;
            }

            // Enter - finish region drawing
            if (e.key === 'Enter' && mode === 'draw-region' && drawingPoints.length >= 3) {
                e.preventDefault();
                finishRegion();
                return;
            }

            // Delete / Backspace - delete selected item
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selection?.type === 'marker') {
                    deleteMarker(selection.id);
                } else if (selection?.type === 'region') {
                    deleteRegion(selection.id);
                }
                return;
            }

            // 1 / 2 / 3 - mode switch
            const activeFloor = getActiveFloor();
            if (e.key === '1') {
                setMode('select');
            } else if (e.key === '2' && activeFloor) {
                setMode('place-marker');
            } else if (e.key === '3' && activeFloor) {
                setMode('draw-region');
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        mode, setMode, selection, clearSelection,
        drawingPoints, undoDrawingPoint, cancelDrawing, finishRegion,
        deleteMarker, deleteRegion, saveMapMeta, dirtyMeta, getActiveFloor,
    ]);

    return null;
}
