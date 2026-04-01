import { Film } from 'lucide-react';
import type { ApiMediaSourcePivot } from '@/types/api';

type Props = {
    mediaSources: ApiMediaSourcePivot[];
};

export function EntityMedia({ mediaSources }: Props) {
    return (
        <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
            <div className="flex items-center gap-2 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <Film className="size-3 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    MEDIA APPEARANCES
                </span>
            </div>

            <div className="divide-y divide-[var(--arc-border)]">
                {mediaSources.map((ms) => (
                    <div key={ms.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="arc-mono shrink-0 rounded border border-[var(--arc-border)] px-1 py-0.5 text-[8px] uppercase tracking-wider text-[var(--arc-text-muted)]">
                            {ms.media_type}
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-[var(--arc-text)]">
                                {ms.name}
                            </span>
                            {ms.pivot.role && (
                                <span className="arc-mono block text-[9px] text-[var(--arc-text-muted)]">
                                    as {ms.pivot.role}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
