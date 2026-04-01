import { Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';
import type { WindowState } from '@/stores/window-store';
import { useWindowStore } from '@/stores/window-store';

type Props = {
    window: WindowState;
    isActive: boolean;
    children: React.ReactNode;
};

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export function InternalWindow({ window: win, isActive, children }: Props) {
    const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } =
        useWindowStore();
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; origPosX: number; origPosY: number; edge: string } | null>(null);
    const windowRef = useRef<HTMLDivElement>(null);

    // --- Dragging ---
    const onTitlePointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if ((e.target as HTMLElement).closest('button')) {
                return;
            }

            e.preventDefault();
            focusWindow(win.id);
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: win.position.x,
                origY: win.position.y,
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        },
        [focusWindow, win.id, win.position.x, win.position.y],
    );

    const onTitlePointerMove = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragRef.current) {
                return;
            }

            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            moveWindow(win.id, dragRef.current.origX + dx, Math.max(0, dragRef.current.origY + dy));
        },
        [moveWindow, win.id],
    );

    const onTitlePointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    // --- Resizing (8-edge) ---
    const onResizePointerDown = useCallback(
        (edge: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            focusWindow(win.id);
            resizeRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origW: win.size.width,
                origH: win.size.height,
                origPosX: win.position.x,
                origPosY: win.position.y,
                edge,
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        },
        [focusWindow, win.id, win.size.width, win.size.height, win.position.x, win.position.y],
    );

    const onResizePointerMove = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (!resizeRef.current) {
                return;
            }

            const { startX, startY, origW, origH, origPosX, origPosY, edge } = resizeRef.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newW = origW;
            let newH = origH;
            let newX = origPosX;
            let newY = origPosY;

            if (edge.includes('e')) {
                newW = Math.max(MIN_WIDTH, origW + dx);
            }

            if (edge.includes('w')) {
                newW = Math.max(MIN_WIDTH, origW - dx);
                newX = origPosX + (origW - newW);
            }

            if (edge.includes('s')) {
                newH = Math.max(MIN_HEIGHT, origH + dy);
            }

            if (edge.includes('n')) {
                newH = Math.max(MIN_HEIGHT, origH - dy);
                newY = Math.max(0, origPosY + (origH - newH));
            }

            resizeWindow(win.id, newW, newH);
            moveWindow(win.id, newX, newY);
        },
        [resizeWindow, moveWindow, win.id],
    );

    const onResizePointerUp = useCallback(() => {
        resizeRef.current = null;
    }, []);

    const onDoubleClickTitle = useCallback(() => {
        if (win.maximized) {
            restoreWindow(win.id);
        } else {
            maximizeWindow(win.id);
        }
    }, [win.maximized, win.id, restoreWindow, maximizeWindow]);

    if (win.minimized) {
        return null;
    }

    const style: React.CSSProperties = win.maximized
        ? { position: 'absolute', inset: 0, zIndex: win.zIndex }
        : {
              position: 'absolute',
              left: win.position.x,
              top: win.position.y,
              width: win.size.width,
              height: win.size.height,
              zIndex: win.zIndex,
          };

    const resizeEdges = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    const edgeCursors: Record<string, string> = {
        n: 'cursor-n-resize',
        ne: 'cursor-ne-resize',
        e: 'cursor-e-resize',
        se: 'cursor-se-resize',
        s: 'cursor-s-resize',
        sw: 'cursor-sw-resize',
        w: 'cursor-w-resize',
        nw: 'cursor-nw-resize',
    };
    const edgeStyles: Record<string, string> = {
        n: 'top-0 left-1 right-1 h-1',
        ne: 'top-0 right-0 w-3 h-3',
        e: 'top-1 right-0 bottom-1 w-1',
        se: 'bottom-0 right-0 w-3 h-3',
        s: 'bottom-0 left-1 right-1 h-1',
        sw: 'bottom-0 left-0 w-3 h-3',
        w: 'top-1 left-0 bottom-1 w-1',
        nw: 'top-0 left-0 w-3 h-3',
    };

    return (
        <div
            ref={windowRef}
            style={style}
            className={cn(
                'arc-animate-window-open flex flex-col overflow-hidden border transition-[shadow,opacity] duration-200',
                'bg-[var(--arc-surface)]',
                isActive
                    ? 'border-[var(--arc-accent)]/30 shadow-[var(--arc-win-shadow-active)]'
                    : 'arc-win-unfocused border-[var(--arc-win-border)] shadow-[var(--arc-win-shadow)]',
            )}
            onPointerDown={() => focusWindow(win.id)}
        >
            {/* Title Bar */}
            <div
                className={cn(
                    'flex h-9 shrink-0 select-none items-center gap-2 px-3',
                    'border-b transition-colors duration-150',
                    isActive
                        ? 'border-[var(--arc-accent)]/15 bg-[var(--arc-win-title-active-bg)] text-[var(--arc-win-title-active-text)]'
                        : 'border-[var(--arc-win-border)] bg-[var(--arc-win-title-bg)] text-[var(--arc-win-title-text)]',
                )}
                onPointerDown={onTitlePointerDown}
                onPointerMove={onTitlePointerMove}
                onPointerUp={onTitlePointerUp}
                onDoubleClick={onDoubleClickTitle}
            >
                {/* Icon */}
                <div className="flex size-4 items-center justify-center text-xs opacity-70">
                    {win.icon ? (
                        <span className="arc-mono text-[10px] uppercase tracking-widest">
                            {win.icon.slice(0, 2)}
                        </span>
                    ) : (
                        <span className="size-1.5 bg-[var(--arc-accent)]" />
                    )}
                </div>

                {/* Title */}
                <span className="flex-1 truncate text-xs font-medium tracking-wide">
                    {win.title}
                </span>

                {/* Window Controls */}
                <div className="flex items-center gap-0.5">
                    <button
                        className="flex size-6 items-center justify-center text-[var(--arc-win-title-text)]/60 transition-colors hover:bg-white/10 hover:text-white"
                        onClick={() => minimizeWindow(win.id)}
                        aria-label="Minimize"
                    >
                        <Minus className="size-3.5" />
                    </button>
                    <button
                        className="flex size-6 items-center justify-center text-[var(--arc-win-title-text)]/60 transition-colors hover:bg-white/10 hover:text-white"
                        onClick={() => (win.maximized ? restoreWindow(win.id) : maximizeWindow(win.id))}
                        aria-label={win.maximized ? 'Restore' : 'Maximize'}
                    >
                        {win.maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                    </button>
                    <button
                        className="flex size-6 items-center justify-center text-[var(--arc-win-title-text)]/60 transition-colors hover:bg-[var(--arc-danger)] hover:text-white"
                        onClick={() => closeWindow(win.id)}
                        aria-label="Close"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-auto">
                {children}
            </div>

            {/* Resize Handles */}
            {!win.maximized &&
                resizeEdges.map((edge) => (
                    <div
                        key={edge}
                        className={cn('absolute z-50', edgeCursors[edge], edgeStyles[edge])}
                        onPointerDown={onResizePointerDown(edge)}
                        onPointerMove={onResizePointerMove}
                        onPointerUp={onResizePointerUp}
                    />
                ))}
        </div>
    );
}
