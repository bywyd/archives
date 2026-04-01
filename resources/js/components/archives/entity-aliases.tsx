import type { ApiEntityAlias } from '@/types/api';

type Props = {
    aliases: ApiEntityAlias[];
};

export function EntityAliases({ aliases }: Props) {
    return (
        <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="arc-mono text-[9px] tracking-widest text-[var(--arc-text-muted)]">
                AKA:
            </span>
            {aliases.map((alias) => (
                <span
                    key={alias.id}
                    className="arc-mono border border-[var(--arc-border)] bg-[var(--arc-bg)] px-1.5 py-0.5 text-[10px] text-[var(--arc-text-muted)]"
                    title={alias.context ?? undefined}
                >
                    {alias.alias}
                </span>
            ))}
        </div>
    );
}
