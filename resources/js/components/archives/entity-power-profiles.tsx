import { Zap } from 'lucide-react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityPowerProfile } from '@/types/api';

type Props = {
    profiles: ApiEntityPowerProfile[];
    universeId: number;
};

const STATUS_STYLES: Record<string, string> = {
    active: 'text-[var(--arc-success)]',
    lost: 'text-[var(--arc-text-muted)]',
    dormant: 'text-[var(--arc-warning)]',
    evolving: 'text-purple-400',
    artificial: 'text-blue-400',
    temporary: 'text-orange-400',
};

const CATEGORY_ICONS: Record<string, string> = {
    physical: 'PHY',
    mental: 'MNT',
    viral: 'VRL',
    technological: 'TEC',
    combat: 'CMB',
    supernatural: 'SPR',
    medical: 'MED',
    other: 'OTH',
};

export function EntityPowerProfiles({ profiles, universeId }: Props) {
    const { openWindow } = useWindowStore();

    const openEntity = (slug: string, name: string, icon?: string | null) => {
        openWindow({
            type: 'entity-dossier',
            title: `${name}  DOSSIER`,
            icon: icon ?? 'EN',
            props: { key: `entity-${universeId}-${slug}`, universeId, entitySlug: slug },
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-[var(--arc-warning)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    ABILITY ASSESSMENT
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {profiles.length} ABILIT{profiles.length !== 1 ? 'IES' : 'Y'}
                </span>
            </div>

            <div className="arc-stagger grid gap-2 sm:grid-cols-2">
                {profiles.map((p) => (
                    <div
                        key={p.id}
                        className="arc-card-hover overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <span className="arc-mono flex size-6 items-center justify-center rounded bg-[var(--arc-surface-alt)] text-[8px] font-bold text-[var(--arc-accent)]">
                                {CATEGORY_ICONS[p.category] ?? 'OTH'}
                            </span>
                            <span className="text-xs font-semibold text-[var(--arc-text)]">
                                {p.name}
                            </span>
                            <span className={cn('arc-mono ml-auto text-[9px] font-bold uppercase', STATUS_STYLES[p.status] ?? STATUS_STYLES.active)}>
                                {p.status}
                            </span>
                        </div>

                        {p.description && (
                            <p className="mt-1.5 text-[11px] text-[var(--arc-text-muted)]">
                                {p.description}
                            </p>
                        )}

                        {p.power_level != null && (
                            <div className="mt-2 flex items-center gap-1.5">
                                <span className="arc-mono text-[8px] font-semibold text-[var(--arc-text-muted)]">PWR</span>
                                <div className="flex-1">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--arc-border)]">
                                        <div
                                            className={cn(
                                                'arc-bar-fill h-full rounded-full',
                                                p.power_level >= 8 ? 'bg-[var(--arc-danger)]' : p.power_level >= 5 ? 'bg-[var(--arc-warning)]' : 'bg-[var(--arc-success)]',
                                            )}
                                            style={{ width: `${p.power_level * 10}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="arc-mono text-[8px] font-bold text-[var(--arc-text-muted)]">{p.power_level}/10</span>
                            </div>
                        )}

                        {p.source && (
                            <div className="mt-1.5 text-[9px]">
                                <span className="arc-mono font-semibold text-[var(--arc-text-muted)]">SOURCE: </span>
                                <span className="text-[var(--arc-text)]">{p.source}</span>
                            </div>
                        )}

                        {p.source_entity && (
                            <div className="mt-1.5 flex items-center gap-1.5 border-t border-[var(--arc-border)] pt-1.5">
                                <TypeIcon entityType={p.source_entity.entity_type} size="sm" />
                                <button
                                    type="button"
                                    className="text-[10px] font-medium text-[var(--arc-accent)] hover:underline"
                                    onClick={() => openEntity(p.source_entity!.slug, p.source_entity!.name, p.source_entity!.entity_type?.icon)}
                                >
                                    {p.source_entity.name}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
