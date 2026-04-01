import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityRelation } from '@/types/api';

type Props = {
    outgoing: ApiEntityRelation[];
    incoming: ApiEntityRelation[];
    currentEntityId: number;
    universeId: number;
};

type RelEntry = {
    key: string;
    entity: ApiEntityRelation['to_entity'];
    direction: 'outgoing' | 'incoming';
    description: string | null;
    fictionalStart: string | null | undefined;
    fictionalEnd: string | null | undefined;
    relStatus: string | null | undefined;
    onClick: () => void;
};

const REL_STATUS_COLORS: Record<string, string> = {
    active: 'bg-[var(--arc-success)] text-[var(--arc-success)]',
    former: 'bg-[var(--arc-text-muted)] text-[var(--arc-text-muted)]',
    unknown: 'bg-[var(--arc-warning)] text-[var(--arc-warning)]',
};

export function EntityRelations({ outgoing, incoming, currentEntityId, universeId }: Props) {
    const { openWindow } = useWindowStore();

    const openEntity = (entityId: number, entitySlug: string, entityName: string, icon?: string | null) => {
        openWindow({
            type: 'entity-dossier',
            title: `${entityName}  DOSSIER`,
            icon: icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${entitySlug}`,
                universeId,
                entitySlug,
            },
        });
    };

    // Group all relations by their display label
    const groups = new Map<string, RelEntry[]>();

    outgoing.forEach((rel) => {
        const label = rel.relation_type?.name ?? 'RELATED TO';
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push({
            key: `out-${rel.id}`,
            entity: rel.to_entity,
            direction: 'outgoing',
            description: rel.description,
            fictionalStart: rel.fictional_start,
            fictionalEnd: rel.fictional_end,
            relStatus: rel.status,
            onClick: () => openEntity(rel.to_entity.id, rel.to_entity.slug, rel.to_entity.name, rel.to_entity.entity_type?.icon),
        });
    });

    incoming.forEach((rel) => {
        const label = rel.relation_type?.inverse_name ?? rel.relation_type?.name ?? 'RELATED TO';
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push({
            key: `in-${rel.id}`,
            entity: rel.from_entity,
            direction: 'incoming',
            description: rel.description,
            fictionalStart: rel.fictional_start,
            fictionalEnd: rel.fictional_end,
            relStatus: rel.status,
            onClick: () => openEntity(rel.from_entity.id, rel.from_entity.slug, rel.from_entity.name, rel.from_entity.entity_type?.icon),
        });
    });

    const totalLinks = outgoing.length + incoming.length;

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    KNOWN RELATIONS
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {totalLinks} LINKS
                </span>
            </div>

            {/* Grouped relation blocks */}
            <div className="space-y-2">
                {Array.from(groups.entries()).map(([label, rels]) => (
                    <RelationGroup
                        key={label}
                        label={label}
                        entries={rels}
                    />
                ))}
            </div>
        </div>
    );
}

function RelationGroup({ label, entries }: { label: string; entries: RelEntry[] }) {
    const outCount = entries.filter((e) => e.direction === 'outgoing').length;
    const inCount = entries.filter((e) => e.direction === 'incoming').length;

    return (
        <div className="overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
            {/* Group header */}
            <div className="flex items-center gap-2 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-1.5">
                <span className="arc-mono text-[9px] font-bold uppercase tracking-wider text-[var(--arc-accent)]">
                    {label}
                </span>
                <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                    × {entries.length}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                    {outCount > 0 && (
                        <span className="arc-mono flex items-center gap-0.5 text-[8px] text-[var(--arc-accent)]">
                            <ArrowRight className="size-2.5" />
                            {outCount}
                        </span>
                    )}
                    {inCount > 0 && (
                        <span className="arc-mono flex items-center gap-0.5 text-[8px] text-[var(--arc-text-muted)]">
                            <ArrowRight className="size-2.5 rotate-180" />
                            {inCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Entity rows */}
            <div className="divide-y divide-[var(--arc-border)]">
                {entries.map((entry) => (
                    <RelationEntry key={entry.key} entry={entry} />
                ))}
            </div>
        </div>
    );
}

function RelationEntry({ entry }: { entry: RelEntry }) {
    const { entity, direction, relStatus, fictionalStart, fictionalEnd, description } = entry;
    const profileImg = entity.images?.find((img) => img.type === 'profile');
    const thumbUrl = profileImg?.thumbnail_url ?? profileImg?.url ?? null;
    const period = fictionalStart || fictionalEnd
        ? `${fictionalStart ?? '?'}  ${fictionalEnd ?? 'Present'}`
        : null;

    return (
        <button
            onClick={entry.onClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--arc-surface-hover)]"
        >
            {/* Direction indicator */}
            <ArrowRight
                className={cn(
                    'size-3 shrink-0',
                    direction === 'incoming' && 'rotate-180',
                    direction === 'outgoing' ? 'text-[var(--arc-accent)]' : 'text-[var(--arc-text-muted)]',
                )}
            />

            {/* Avatar: profile photo or type icon */}
            <div className="size-6 shrink-0 overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-bg)]">
                {thumbUrl ? (
                    <img src={thumbUrl} alt={entity.name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <TypeIcon entityType={entity.entity_type} size="sm" />
                    </div>
                )}
            </div>

            {/* Name + type */}
            <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-[var(--arc-text)]">
                    {entity.name}
                </span>
                {(description || period) && (
                    <span className="block truncate text-[9px] text-[var(--arc-text-muted)]">
                        {/* {period ?? description} */}
                        {period && `${period} || `}  {description}
                    </span>
                )}
            </div>

            {/* Status dot */}
            {relStatus && (
                <span
                    className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        (REL_STATUS_COLORS[relStatus] ?? REL_STATUS_COLORS.unknown).split(' ')[0],
                    )}
                    title={relStatus}
                />
            )}

            {/* Entity status badge */}
            <StatusBadge status={entity.entity_status} />
        </button>
    );
}