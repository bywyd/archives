import { MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiEntityQuote } from '@/types/api';

type Props = {
    quotes: ApiEntityQuote[];
};

export function EntityQuotes({ quotes }: Props) {
    const featured = quotes.filter((q) => q.is_featured);
    const rest = quotes.filter((q) => !q.is_featured);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <MessageSquareQuote className="size-3.5 text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    RECORDED DIALOGUE
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">
                    {quotes.length} QUOTE{quotes.length !== 1 ? 'S' : ''}
                </span>
            </div>

            <div className="arc-stagger space-y-3">
                {[...featured, ...rest].map((q) => (
                    <div
                        key={q.id}
                        className={cn(
                            'rounded border bg-[var(--arc-surface)] p-4 transition-colors',
                            q.is_featured
                                ? 'border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5'
                                : 'border-[var(--arc-border)]',
                        )}
                    >
                        <blockquote className="border-l-2 border-[var(--arc-accent)] pl-3 text-sm leading-relaxed italic text-[var(--arc-text)]">
                            &ldquo;{q.quote}&rdquo;
                        </blockquote>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[9px]">
                            {q.context && (
                                <span className="text-[var(--arc-text-muted)]">{q.context}</span>
                            )}
                            {q.fictional_date && (
                                <span className="arc-mono rounded border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[var(--arc-text-muted)]">
                                    {q.fictional_date}
                                </span>
                            )}
                            {q.source_media && (
                                <span className="arc-mono rounded bg-[var(--arc-accent)]/8 px-1.5 py-0.5 font-semibold text-[var(--arc-accent)]">
                                    {q.source_media.name}
                                </span>
                            )}
                            {q.is_featured && (
                                <span className="arc-mono rounded bg-[var(--arc-warning)]/10 px-1.5 py-0.5 font-bold text-[var(--arc-warning)]">
                                    ★ FEATURED
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
