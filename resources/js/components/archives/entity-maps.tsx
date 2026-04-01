import { Layers, MapPin } from 'lucide-react';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityMap } from '@/types/api';

type Props = {
    maps: ApiEntityMap[];
    universeId: number;
    entityId: number;
};

export function EntityMaps({ maps, universeId, entityId }: Props) {
    const { openWindow } = useWindowStore();

    if (!maps.length) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-[var(--arc-text-muted)]">
                <MapPin className="size-6 opacity-20" />
                <span className="arc-mono text-[10px] tracking-widest">NO MAPS ON FILE</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
                <div className="h-3 w-0.5 rounded-full bg-[var(--arc-accent)]" />
                <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    LOCATION MAPS
                </span>
                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                    {maps.length} {maps.length === 1 ? 'MAP' : 'MAPS'}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {maps.map((map) => {
                    const floorCount = map.floors?.length ?? map.floors_count ?? 0;
                    // Try to get a preview from the first floor's first image
                    const preview = map.floors?.[0]?.images?.[0];

                    const markerCount = map.floors?.reduce((sum, f) => sum + (f.markers?.length ?? 0), 0) ?? 0;
                    const regionCount = map.floors?.reduce((sum, f) => sum + (f.regions?.length ?? 0), 0) ?? 0;

                    return (
                        <button
                            key={map.id}
                            className="group flex items-start gap-3 rounded-lg border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3 text-left transition-colors hover:border-[var(--arc-accent)]/30 hover:bg-[var(--arc-surface-alt)]"
                            onClick={() =>
                                openWindow({
                                    type: 'map-viewer',
                                    title: `MAP  ${map.name.toUpperCase()}`,
                                    icon: 'MAP',
                                    props: {
                                        key: `map-${universeId}-${entityId}-${map.id}`,
                                        universeId,
                                        entityId,
                                        mapId: map.id,
                                    },
                                    size: { width: 800, height: 600 },
                                })
                            }
                        >
                            {/* Preview thumbnail */}
                            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-bg)]">
                                {preview ? (
                                    <img
                                        src={preview.thumbnail_url || preview.url}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <MapPin className="size-5 text-[var(--arc-text-muted)] opacity-30" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <span className="arc-mono block text-[10px] font-bold tracking-wider text-[var(--arc-text)] group-hover:text-[var(--arc-accent)]">
                                    {map.name.toUpperCase()}
                                </span>
                                {map.description && (
                                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--arc-text-secondary)]">
                                        {map.description}
                                    </p>
                                )}
                                <div className="mt-1.5 flex items-center gap-2">
                                    <span className="arc-mono flex items-center gap-1 text-[8px] text-[var(--arc-text-muted)]">
                                        <Layers className="size-2.5" />
                                        {floorCount} FLOOR{floorCount !== 1 ? 'S' : ''}
                                    </span>
                                    {markerCount > 0 && (
                                        <span className="arc-mono flex items-center gap-1 text-[8px] text-[var(--arc-text-muted)]">
                                            <MapPin className="size-2.5" />
                                            {markerCount}
                                        </span>
                                    )}
                                    {map.is_featured && (
                                        <span className="arc-mono rounded bg-[var(--arc-accent)]/10 px-1 py-0.5 text-[7px] font-bold tracking-wider text-[var(--arc-accent)]">
                                            FEATURED
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
