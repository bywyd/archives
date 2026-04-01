import { Building2 } from 'lucide-react';
import { TypeIcon } from '@/components/archives/type-icon';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntityAffiliationHistory } from '@/types/api';

type Props = {
    history: ApiEntityAffiliationHistory[];
    universeId: number;
};

const STATUS_STYLES: Record<string, string> = {
    active: 'text-[var(--arc-success)] border-[var(--arc-success)]',
    former: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    defected: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    expelled: 'text-[var(--arc-danger)] border-[var(--arc-danger)]',
    deceased: 'text-[var(--arc-text-muted)] border-[var(--arc-text-muted)]',
    undercover: 'text-[var(--arc-warning)] border-[var(--arc-warning)]',
    honorary: 'text-[var(--arc-accent)] border-[var(--arc-accent)]',
};

export function EntityAffiliationHistory({ history, universeId }: Props) {
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
                <Building2 className="size-3.5 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    AFFILIATION RECORD
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {history.length} ENTR{history.length !== 1 ? 'IES' : 'Y'}
                </span>
            </div>

            <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)]">
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--arc-text-muted)]">Organization</th>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--arc-text-muted)]">Role</th>
                            <th className="hidden px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--arc-text-muted)] md:table-cell">Rank</th>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--arc-text-muted)]">Period</th>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--arc-text-muted)]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((aff) => {
                            const period = aff.fictional_start || aff.fictional_end
                                ? `${aff.fictional_start ?? '?'}  ${aff.fictional_end ?? 'Present'}`
                                : '';

                            return (
                                <tr
                                    key={aff.id}
                                    className={cn(
                                        'border-b border-[var(--arc-border)] transition-colors last:border-b-0',
                                        aff.organization && 'cursor-pointer hover:bg-[var(--arc-surface-hover)]',
                                    )}
                                    onClick={() => aff.organization && openEntity(aff.organization.slug, aff.organization.name, aff.organization.entity_type?.icon)}
                                >
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-2">
                                            {aff.organization && (
                                                <TypeIcon entityType={aff.organization.entity_type} size="sm" />
                                            )}
                                            <span className="text-xs font-medium text-[var(--arc-text)]">
                                                {aff.organization?.name ?? aff.organization_name ?? 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-[var(--arc-text)]">
                                        {aff.role ?? ''}
                                    </td>
                                    <td className="hidden px-3 py-1.5 text-[11px] text-[var(--arc-text)] md:table-cell">
                                        {aff.rank ?? ''}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{period}</span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_STYLES[aff.status] ?? STATUS_STYLES.former)}>
                                            {aff.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
