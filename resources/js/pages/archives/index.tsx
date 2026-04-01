import { Head, usePage } from '@inertiajs/react';
import WorkbenchLayout from '@/layouts/workbench-layout';
import { ArchiveContext } from '@/contexts/archive-context';
import { UniverseSelectorScreen } from '@/components/archives/universe-selector-screen';
import type { ApiUniverse } from '@/types/api';

interface ArchivePageProps {
    universes: ApiUniverse[];
    currentUniverse: ApiUniverse | null;
    [key: string]: unknown;
}

export default function Archives() {
    const { universes, currentUniverse } = usePage<ArchivePageProps>().props;
    const page = usePage();
    const appName = page?.props?.name || 'Archives';
    const appLogo = page?.props?.branding?.logo_url;

    return (
        <ArchiveContext.Provider value={{ universes: universes ?? [], currentUniverse: currentUniverse ?? null }}>
            {currentUniverse ? (
                <WorkbenchLayout appName={appName} appLogo={appLogo}>
                    <Head title={`${currentUniverse.name}`} />
                </WorkbenchLayout>
            ) : (
                <>
                    <Head title="Operations Map" />
                    <UniverseSelectorScreen />
                </>
            )}
        </ArchiveContext.Provider>
    );
}
