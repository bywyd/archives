import { InternalWindow } from '@/components/workbench/internal-window';
import { OperationsMap } from '@/components/workbench/operations-map';
import { WindowContent } from '@/components/workbench/window-content';
import { useWindowStore } from '@/stores/window-store';

export function WindowManager() {
    const windows = useWindowStore((s) => s.windows);
    const activeWindowId = useWindowStore((s) => s.activeWindowId);
    const hasVisibleWindows = windows.some((w) => !w.minimized);

    return (
        <div className="relative flex-1 overflow-hidden">
            {/* Persistent tactical operations map background */}
            <OperationsMap />

            {/* Windows layer */}
            {windows.map((win) => (
                <InternalWindow
                    key={win.id}
                    window={win}
                    isActive={win.id === activeWindowId}
                >
                    <WindowContent window={win} />
                </InternalWindow>
            ))}

            {/* Empty state overlay  shown when no windows open */}
            {/* {windows.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative text-center">
                        <div className="arc-animate-stamp absolute -top-10 left-1/2 -translate-x-1/2 -rotate-12 border-4 border-[var(--arc-accent)]/15 px-8 py-1.5">
                            <span className="arc-mono text-xl font-black tracking-[0.3em] text-[var(--arc-accent)]/15">
                                CLASSIFIED
                            </span>
                        </div>

                        <div className="arc-animate-slide-up mb-1 text-5xl font-black tracking-[0.25em] text-[var(--arc-text)]/5">
                            UNIVRSE
                        </div>
                        <div className="arc-animate-slide-up arc-mono mb-2 text-lg font-bold tracking-[0.5em] text-[var(--arc-text)]/60">
                            ARCHIVES
                        </div>
                        <div className="mx-auto mb-3 h-px w-36 bg-gradient-to-r from-transparent via-[var(--arc-accent)]/40 to-transparent" />
                        <p className="text-xs text-[var(--arc-text-muted)]/50">
                            Select a universe or use the search terminal to begin
                        </p>
                        <div className="mx-auto mt-6 h-px w-48 bg-[var(--arc-border)]/30" />
                        <div className="mt-2.5 flex items-center justify-center gap-3">
                            <span className="arc-mono text-[8px] tracking-[0.15em] text-[var(--arc-text-muted)]/30">
                                CLEARANCE: AUTHORIZED
                            </span>
                            <span className="size-1 rounded-full bg-[var(--arc-accent)]/20" />
                            <span className="arc-mono text-[8px] tracking-[0.15em] text-[var(--arc-text-muted)]/30">
                                STATUS: READY
                            </span>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
}
