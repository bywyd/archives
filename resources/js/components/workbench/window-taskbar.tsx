import {
    Brain,
    GripHorizontal,
    LayoutGrid,
    Minimize2,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WindowState } from '@/stores/window-store';
import { useWindowStore } from '@/stores/window-store';

export function WindowTaskbar() {
    const windows = useWindowStore((s) => s.windows);
    const activeWindowId = useWindowStore((s) => s.activeWindowId);
    const { focusWindow, restoreWindow, minimizeWindow, closeAllWindows, tileWindows, openWindow } =
        useWindowStore();

    const handleTaskbarClick = (win: WindowState) => {
        if (win.minimized) {
            restoreWindow(win.id);
        } else if (win.id === activeWindowId) {
            minimizeWindow(win.id);
        } else {
            focusWindow(win.id);
        }
    };

    return (
        <div
            className={cn(
                'flex h-9 shrink-0 items-center gap-1 border-t px-2',
                'border-[var(--arc-taskbar-border)] bg-[var(--arc-taskbar-bg)]',
            )}
        >
            {/* Quick Launch */}
            <button
                className="flex size-7 items-center justify-center text-[var(--arc-text-muted)] transition-colors hover:bg-white/8 hover:text-[var(--arc-sidebar-accent)]"
                onClick={() =>
                    openWindow({
                        type: 'search',
                        title: 'SEARCH TERMINAL',
                        icon: 'SR',
                    })
                }
                title="Open Search Terminal"
            >
                <Search className="size-3.5" />
            </button>

            <button
                className="flex size-7 items-center justify-center text-[var(--arc-text-muted)] transition-colors hover:bg-white/8 hover:text-[var(--arc-sidebar-accent)]"
                onClick={() =>
                    openWindow({
                        type: 'advanced-search',
                        title: 'INTELLIGENCE ANALYSIS',
                        icon: 'IA',
                        size: { width: 960, height: 700 },
                    })
                }
                title="Open Intelligence Analysis Engine"
            >
                <Brain className="size-3.5" />
            </button>

            {/* Separator */}
            <div className="mx-1 h-5 w-px bg-[var(--arc-sidebar-border)]" />

            {/* Open Windows */}
            <div className="flex flex-1 items-center gap-0.5 overflow-x-auto">
                {windows.map((win) => (
                    <button
                        key={win.id}
                        className={cn(
                            'relative flex h-7 max-w-[200px] items-center gap-1.5 px-2.5 text-[11px] font-medium transition-all',
                            win.id === activeWindowId && !win.minimized
                                ? 'bg-[var(--arc-sidebar-accent)]/15 text-[var(--arc-sidebar-accent)]'
                                : 'text-[var(--arc-sidebar-text-muted)] hover:bg-white/6 hover:text-[var(--arc-sidebar-text)]',
                            win.minimized && 'opacity-40',
                        )}
                        onClick={() => handleTaskbarClick(win)}
                        title={win.title}
                    >
                        {win.icon && (
                            <span className="arc-mono shrink-0 text-[8px] font-bold uppercase tracking-widest opacity-60">
                                {win.icon.slice(0, 2)}
                            </span>
                        )}
                        <span className="truncate">{win.title}</span>
                        {win.id === activeWindowId && !win.minimized && (
                            <span className="absolute bottom-0 left-2 right-2 h-px bg-[var(--arc-sidebar-accent)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Right-side controls */}
            {windows.length > 0 && (
                <>
                    <div className="mx-1 h-5 w-px bg-[var(--arc-sidebar-border)]" />
                    <div className="flex items-center gap-0.5">
                        <button
                            className="flex size-7 items-center justify-center text-[var(--arc-sidebar-text-muted)] transition-colors hover:bg-white/8 hover:text-[var(--arc-sidebar-text)]"
                            onClick={tileWindows}
                            title="Tile Windows"
                        >
                            <LayoutGrid className="size-3.5" />
                        </button>
                        <button
                            className="flex size-7 items-center justify-center text-[var(--arc-sidebar-text-muted)] transition-colors hover:bg-white/8 hover:text-[var(--arc-sidebar-text)]"
                            onClick={() => windows.forEach((w) => minimizeWindow(w.id))}
                            title="Minimize All"
                        >
                            <Minimize2 className="size-3.5" />
                        </button>
                        <button
                            className="flex size-7 items-center justify-center text-[var(--arc-sidebar-text-muted)] transition-colors hover:bg-[var(--arc-danger)] hover:text-white"
                            onClick={closeAllWindows}
                            title="Close All"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                </>
            )}

            {/* Window count + branding */}
            <div className="ml-1 flex items-center gap-1.5 text-[var(--arc-sidebar-text-muted)]">
                {windows.length > 0 && (
                    <span className="arc-mono text-[8px] tabular-nums tracking-wider">
                        {windows.length}W
                    </span>
                )}
                <GripHorizontal className="size-3" />
                <span className="arc-mono text-[9px] tracking-[0.15em]">
                    UA v1.0
                </span>
            </div>
        </div>
    );
}
