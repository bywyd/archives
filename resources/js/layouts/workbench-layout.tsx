import { useEffect, useRef } from 'react';
import { UniverseSidebar } from '@/components/archives/universe-sidebar';
import { WindowManager } from '@/components/workbench/window-manager';
import { WindowTaskbar } from '@/components/workbench/window-taskbar';
import { useWindowStore } from '@/stores/window-store';
import { useArchive } from '@/contexts/archive-context';
import { useUniverseTheme } from '@/hooks/use-universe-theme';

type Props = {
    children?: React.ReactNode;
    appName: string;
    appLogo?: string;
};

export default function WorkbenchLayout({ children, appName, appLogo }: Props) {
    const deepLinkHandled = useRef(false);
    const { currentUniverse } = useArchive();
    const { cssVars, themeColor } = useUniverseTheme(currentUniverse);

    useEffect(() => {
        if (deepLinkHandled.current) return;
        const params = new URLSearchParams(window.location.search);
        const openType = params.get('open');
        if (!openType) return;

        deepLinkHandled.current = true;

        if (openType === 'entity-dossier') {
            const entitySlug = params.get('entity');
            if (entitySlug && currentUniverse) {
                useWindowStore.getState().openWindow({
                    type: 'entity-dossier',
                    title: `${entitySlug}  DOSSIER`,
                    icon: 'EN',
                    props: {
                        key: `entity-${currentUniverse.id}-${entitySlug}`,
                        universeId: currentUniverse.id,
                        entitySlug,
                    },
                });
            }
        }

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                useWindowStore.getState().openWindow({
                    type: 'search',
                    title: 'Search Terminal',
                    icon: 'SR',
                    props: {},
                });
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div
            className="archives-workbench flex h-screen w-screen overflow-hidden"
            style={cssVars}
            data-theme={themeColor ? 'universe' : undefined}
        >
            {/* Sidebar */}
            <div className="w-60 shrink-0">
                
                <UniverseSidebar appName={appName} appLogo={appLogo} />
            </div>

            {/* Main Workbench Area */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Window Area */}
                <WindowManager />

                {/* Taskbar */}
                <WindowTaskbar />
            </div>
        </div>
    );
}
