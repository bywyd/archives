import { Clock } from 'lucide-react';
import { useWindowStore } from '@/stores/window-store';
import type { ApiTimelinePivot } from '@/types/api';

type Props = {
    timelines: ApiTimelinePivot[];
    universeId: number;
};

export function EntityTimelineStrip({ timelines, universeId }: Props) {
    const { openWindow } = useWindowStore();

    return (
        <div className="rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
            <div className="flex items-center gap-2 border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <Clock className="size-3 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    TIMELINES
                </span>
            </div>

            <div className="divide-y divide-[var(--arc-border)]">
                {timelines.map((tl) => (
                    <button
                        key={tl.id}
                        type="button"
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[var(--arc-surface-hover)]"
                        onClick={() =>
                            openWindow({
                                type: 'timeline',
                                title: `${tl.name}  TIMELINE`,
                                icon: 'TL',
                                props: {
                                    key: `timeline-${universeId}-${tl.id}`,
                                    universeId,
                                    timelineId: tl.id,
                                },
                            })
                        }
                    >
                        <span className="text-xs font-medium text-[var(--arc-text)]">
                            {tl.name}
                        </span>
                        <div className="flex items-center gap-2">
                            {tl.pivot.role && (
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                    Role: {tl.pivot.role}
                                </span>
                            )}
                            {tl.pivot.fictional_start && (
                                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                                    {tl.pivot.fictional_start}
                                    {tl.pivot.fictional_end && `  ${tl.pivot.fictional_end}`}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
