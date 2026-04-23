// ============================================================
// Archives - Window Manager Store (Zustand)
// MDI (Multiple Document Interface) state management
// ============================================================

import { create } from 'zustand';

export type WindowType =
    | 'search'
    | 'advanced-search'
    | 'entity-dossier'
    | 'entity-editor'
    | 'universe-dashboard'
    | 'timeline'
    | 'timeline-editor'
    | 'entity-list'
    | 'media-sources'
    | 'media-source-detail'
    | 'media-source-editor'
    | 'settings'
    | 'discovery'
    | 'recently-viewed'
    | 'entity-comparison'
    | 'connections-graph'
    | 'search-briefing'
    | 'search-subjects'
    | 'search-connections'
    | 'license-disclaimer'
    | 'image-viewer'
    | 'map-viewer'
    | 'map-editor'
    | 'entity-revisions'
    | 'event-reconstruction'
    | 'temporal-slider'
    | 'entity-briefing'
    | 'login';

export type WindowState = {
    id: string;
    type: WindowType;
    title: string;
    icon?: string;
    /** Arbitrary props passed to the window content component */
    props: Record<string, unknown>;
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
    minimized: boolean;
    maximized: boolean;
};

type WindowStore = {
    windows: WindowState[];
    activeWindowId: string | null;
    nextZIndex: number;

    openWindow: (params: {
        type: WindowType;
        title: string;
        icon?: string;
        props?: Record<string, unknown>;
        size?: { width: number; height: number };
        maximized?: boolean;
    }) => string;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    restoreWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    resizeWindow: (id: string, width: number, height: number) => void;
    updateWindowTitle: (id: string, title: string) => void;
    updateWindowProps: (id: string, props: Record<string, unknown>) => void;
    closeAllWindows: () => void;
    tileWindows: () => void;
};

const DEFAULT_SIZE = { width: 800, height: 560 };
const CASCADE_OFFSET = 30;

let windowCounter = 0;

function cascadePosition(index: number): { x: number; y: number } {
    const offset = (index % 10) * CASCADE_OFFSET;

    return { x: 60 + offset, y: 60 + offset };
}

export const useWindowStore = create<WindowStore>((set, get) => ({
    windows: [],
    activeWindowId: null,
    nextZIndex: 100,

    openWindow({ type, title, icon, props = {}, size, maximized = false }) {
        const state = get();

        // Check if a window with same type+key already exists (e.g., same entity dossier)
        const existingKey = props.key as string | undefined;

        if (existingKey) {
            const existing = state.windows.find(
                (w) => w.type === type && w.props.key === existingKey,
            );

            if (existing) {
                // Focus existing window instead of opening duplicate
                get().focusWindow(existing.id);
                get().restoreWindow(existing.id);

                return existing.id;
            }
        }

        const id = `win-${++windowCounter}-${Date.now()}`;
        const pos = cascadePosition(state.windows.length);
        const zIndex = state.nextZIndex;

        const win: WindowState = {
            id,
            type,
            title,
            icon,
            props,
            position: pos,
            size: size ?? DEFAULT_SIZE,
            zIndex,
            minimized: false,
            maximized,
        };

        set({
            windows: [...state.windows, win],
            activeWindowId: id,
            nextZIndex: zIndex + 1,
        });

        return id;
    },

    closeWindow(id) {
        set((s) => {
            const filtered = s.windows.filter((w) => w.id !== id);
            const newActive =
                s.activeWindowId === id
                    ? filtered.length > 0
                        ? filtered.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
                        : null
                    : s.activeWindowId;

            return { windows: filtered, activeWindowId: newActive };
        });
    },

    focusWindow(id) {
        set((s) => {
            const zIndex = s.nextZIndex;

            return {
                windows: s.windows.map((w) =>
                    w.id === id ? { ...w, zIndex } : w,
                ),
                activeWindowId: id,
                nextZIndex: zIndex + 1,
            };
        });
    },

    minimizeWindow(id) {
        set((s) => {
            const updated = s.windows.map((w) =>
                w.id === id ? { ...w, minimized: true } : w,
            );
            const visible = updated.filter((w) => !w.minimized);
            const newActive =
                s.activeWindowId === id
                    ? visible.length > 0
                        ? visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
                        : null
                    : s.activeWindowId;

            return { windows: updated, activeWindowId: newActive };
        });
    },

    maximizeWindow(id) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, maximized: true, minimized: false } : w,
            ),
        }));
        get().focusWindow(id);
    },

    restoreWindow(id) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, minimized: false, maximized: false } : w,
            ),
        }));
        get().focusWindow(id);
    },

    moveWindow(id, x, y) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, position: { x, y } } : w,
            ),
        }));
    },

    resizeWindow(id, width, height) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, size: { width, height } } : w,
            ),
        }));
    },

    updateWindowTitle(id, title) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, title } : w,
            ),
        }));
    },

    updateWindowProps(id, props) {
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, props: { ...w.props, ...props } } : w,
            ),
        }));
    },

    closeAllWindows() {
        set({ windows: [], activeWindowId: null });
    },

    tileWindows() {
        set((s) => {
            const visible = s.windows.filter((w) => !w.minimized);

            if (visible.length === 0) {
                return s;
            }

            const cols = Math.ceil(Math.sqrt(visible.length));
            const rows = Math.ceil(visible.length / cols);

            // Assume workbench area is roughly the viewport minus sidebar/taskbar
            const areaW = window.innerWidth - 260; // sidebar ~260px
            const areaH = window.innerHeight - 48; // taskbar ~48px
            const tileW = Math.floor(areaW / cols);
            const tileH = Math.floor(areaH / rows);

            let idx = 0;
            const tiled = s.windows.map((w) => {
                if (w.minimized) {
                    return w;
                }

                const col = idx % cols;
                const row = Math.floor(idx / cols);
                idx++;

                return {
                    ...w,
                    position: { x: col * tileW, y: row * tileH },
                    size: { width: tileW, height: tileH },
                    maximized: false,
                };
            });

            return { windows: tiled };
        });
    },
}));
