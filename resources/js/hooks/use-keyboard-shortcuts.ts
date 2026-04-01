// ============================================================
// Archives - Keyboard Shortcuts Hook
// Global keyboard shortcuts for the archives workbench
// ============================================================

import { useCallback, useEffect } from 'react';
import { useWindowStore } from '@/stores/window-store';

type ShortcutConfig = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
};

export function useKeyboardShortcuts() {
    const { openWindow, closeWindow, activeWindowId, windows, focusWindow, tileWindows, closeAllWindows } =
        useWindowStore();

    const shortcuts: ShortcutConfig[] = [
        // Window Management
        {
            key: 'w',
            ctrl: true,
            description: 'Close active window',
            action: () => {
                if (activeWindowId) {
                    closeWindow(activeWindowId);
                }
            },
        },
        {
            key: 'q',
            ctrl: true,
            shift: true,
            description: 'Close all windows',
            action: closeAllWindows,
        },
        {
            key: 't',
            ctrl: true,
            description: 'Tile windows',
            action: tileWindows,
        },
        {
            key: 'Tab',
            ctrl: true,
            description: 'Cycle to next window',
            action: () => {
                const visibleWindows = windows.filter((w) => !w.minimized);
                if (visibleWindows.length > 1) {
                    const currentIdx = visibleWindows.findIndex((w) => w.id === activeWindowId);
                    const nextIdx = (currentIdx + 1) % visibleWindows.length;
                    focusWindow(visibleWindows[nextIdx].id);
                }
            },
        },
        {
            key: 'Tab',
            ctrl: true,
            shift: true,
            description: 'Cycle to previous window',
            action: () => {
                const visibleWindows = windows.filter((w) => !w.minimized);
                if (visibleWindows.length > 1) {
                    const currentIdx = visibleWindows.findIndex((w) => w.id === activeWindowId);
                    const prevIdx = (currentIdx - 1 + visibleWindows.length) % visibleWindows.length;
                    focusWindow(visibleWindows[prevIdx].id);
                }
            },
        },

        // Quick Access
        {
            key: 'k',
            ctrl: true,
            description: 'Open search terminal',
            action: () => {
                openWindow({
                    type: 'search',
                    title: 'SEARCH TERMINAL',
                    icon: 'SR',
                });
            },
        },
        {
            key: 'd',
            ctrl: true,
            shift: true,
            description: 'Open discovery mode',
            action: () => {
                openWindow({
                    type: 'discovery',
                    title: 'DISCOVERY MODE',
                    icon: 'DS',
                    props: { key: 'discovery' },
                });
            },
        },
        {
            key: 'h',
            ctrl: true,
            description: 'Open recently viewed',
            action: () => {
                openWindow({
                    type: 'recently-viewed',
                    title: 'RECENTLY VIEWED',
                    icon: 'RV',
                    props: { key: 'recently-viewed' },
                });
            },
        },

        // Number keys 1-9 to focus windows
        ...Array.from({ length: 9 }, (_, i) => ({
            key: String(i + 1),
            alt: true,
            description: `Focus window ${i + 1}`,
            action: () => {
                const visibleWindows = windows.filter((w) => !w.minimized);
                if (visibleWindows[i]) {
                    focusWindow(visibleWindows[i].id);
                }
            },
        })),
    ];

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow some shortcuts even in inputs
                if (!(event.ctrlKey && event.key === 'k')) {
                    return;
                }
            }

            for (const shortcut of shortcuts) {
                const ctrlMatch = !!shortcut.ctrl === event.ctrlKey;
                const shiftMatch = !!shortcut.shift === event.shiftKey;
                const altMatch = !!shortcut.alt === event.altKey;
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    event.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return shortcuts.filter((s) => !s.key.match(/^[1-9]$/)); // Return shortcuts for help display (excluding number keys)
}

// Component to display keyboard shortcuts help
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: ShortcutConfig[] }) {
    const formatShortcut = (s: ShortcutConfig) => {
        const parts: string[] = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.shift) parts.push('Shift');
        if (s.alt) parts.push('Alt');
        parts.push(s.key === ' ' ? 'Space' : s.key.toUpperCase());
        return parts.join(' + ');
    };

    const groups = [
        {
            title: 'Window Management',
            items: shortcuts.filter((s) => 
                ['w', 'q', 't', 'Tab'].includes(s.key.toLowerCase())
            ),
        },
        {
            title: 'Quick Access',
            items: shortcuts.filter((s) =>
                ['k', 'd', 'h'].includes(s.key.toLowerCase())
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <div key={group.title}>
                    <h4 className="arc-mono mb-2 text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                        {group.title.toUpperCase()}
                    </h4>
                    <div className="space-y-1">
                        {group.items.map((shortcut, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1.5"
                            >
                                <span className="text-xs text-[var(--arc-text-muted)]">
                                    {shortcut.description}
                                </span>
                                <kbd className="arc-mono rounded border border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--arc-text)]">
                                    {formatShortcut(shortcut)}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <div className="text-center">
                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                    Alt + 1-9 to focus specific windows
                </span>
            </div>
        </div>
    );
}
