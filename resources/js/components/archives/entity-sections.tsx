import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SectionHtmlContent } from '@/components/shared/section-html-content';
import { cn } from '@/lib/utils';
import type { ApiEntitySection } from '@/types/api';

type Props = {
    sections: ApiEntitySection[];
    universeId: number;
};

export function EntitySections({ sections, universeId }: Props) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                    DOSSIER SECTIONS
                </span>
                <div className="h-px flex-1 bg-[var(--arc-border)]" />
                <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                    {sections.length} SECTION{sections.length !== 1 ? 'S' : ''}
                </span>
            </div>
            {sections.map((section) => (
                <SectionBlock key={section.id} section={section} depth={0} universeId={universeId} />
            ))}
        </div>
    );
}

function SectionBlock({ section, depth, universeId }: { section: ApiEntitySection; depth: number; universeId: number }) {
    const [expanded, setExpanded] = useState(!section.is_collapsible);

    return (
        <div
            className={cn(
                'overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] transition-colors',
                depth > 0 && 'ml-4',
            )}
        >
            {/* Section Header */}
            <button
                type="button"
                className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors',
                    section.is_collapsible
                        ? 'hover:bg-[var(--arc-surface-hover)]'
                        : 'cursor-default',
                    expanded && section.is_collapsible && 'bg-[var(--arc-surface-alt)]',
                )}
                onClick={() => section.is_collapsible && setExpanded((e) => !e)}
            >
                {section.is_collapsible && (
                    <ChevronRight className="arc-chevron size-3.5 text-[var(--arc-text-muted)]" data-open={expanded} />
                )}
                {!section.is_collapsible && (
                    <span className="size-1.5 rounded-full bg-[var(--arc-accent)]/40" />
                )}
                <span className="text-sm font-medium text-[var(--arc-text)]">
                    {section.title}
                </span>
            </button>

            {/* Section Content */}
            <div className="arc-collapse" data-open={expanded}>
                <div className="arc-collapse-inner">
                    <div className="border-t border-[var(--arc-border)] px-3 py-3">
                        {section.content && (
                            <SectionHtmlContent
                                html={section.content}
                                mode="arc"
                                universeId={universeId}
                            />
                        )}

                        {/* Nested Children */}
                        {section.children && section.children.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {section.children.map((child) => (
                                    <SectionBlock
                                        key={child.id}
                                        section={child}
                                        depth={depth + 1}
                                        universeId={universeId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
