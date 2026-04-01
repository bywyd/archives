import { Head, router } from '@inertiajs/react';
import { ChevronRight, Layers, Map } from 'lucide-react';
import { EntityMapViewer } from '@/components/archives/entity-map-viewer';
import WikiLayout from '@/layouts/wiki-layout';
import type { ApiSidebarTree } from '@/types/api';

type Props = {
    universe: { id: number; name: string; slug: string; is_locked?: boolean };
    entity: { id: number; name: string; slug: string };
    map: { id: number; name: string; slug: string; description: string | null; floors_count: number };
    sidebarTree: ApiSidebarTree;
};

export default function EntityMapPage({ universe, entity, map, sidebarTree }: Props) {
    return (
        <WikiLayout
            breadcrumbs={[
                { title: 'Wiki', href: '/w' },
                { title: universe.name, href: `/w/${universe.slug}` },
                { title: entity.name, href: `/w/${universe.slug}/${entity.slug}` },
                { title: map.name },
            ]}
            sidebarTree={sidebarTree}
            universe={universe}
            toc={[]}
        >
            <Head title={`${map.name} - ${entity.name}`}>
                <meta name="description" content={map.description ?? `Interactive map for ${entity.name} in the ${universe.name} universe.`} />
                <meta property="og:title" content={`${map.name} - ${entity.name}`} />
                <meta property="og:type" content="article" />
                <link rel="canonical" href={`/w/${universe.slug}/${entity.slug}/maps/${map.slug}`} />
            </Head>

            {/* Page header */}
            <div className="mb-5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <a href={`/w/${universe.slug}/${entity.slug}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        {entity.name}
                    </a>
                    <ChevronRight className="size-3 text-slate-300" />
                    <span className="font-medium text-slate-700">Maps</span>
                    <ChevronRight className="size-3 text-slate-300" />
                    <span className="text-slate-500">{map.name}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <Map className="size-5 text-blue-600" />
                            {map.name}
                        </h1>
                        {map.description && (
                            <p className="mt-1 text-sm text-slate-500">{map.description}</p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {map.floors_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                                <Layers className="size-3" />
                                {map.floors_count} Floor{map.floors_count !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Map viewer container */}
            <div
                className="wiki-arc-theme overflow-hidden rounded-xl border border-slate-200 shadow-sm"
                style={{ height: 'calc(100vh - 18rem)', minHeight: '480px' }}
            >
                <EntityMapViewer
                    universeId={universe.id}
                    entityId={entity.id}
                    mapId={map.id}
                    onEntityNavigate={(slug) => router.visit(`/w/${universe.slug}/${slug}`)}
                    editLinkHref={`/archives/${universe.slug}`}
                />
            </div>
        </WikiLayout>
    );
}
