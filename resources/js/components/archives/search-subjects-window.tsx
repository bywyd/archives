import { FileSearch, Network, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiAdvancedSearchResult,
    ApiAdvancedSearchSubjectProfile,
} from '@/types/api';

type Props = {
    results: ApiAdvancedSearchResult[];
    subjectProfiles: ApiAdvancedSearchSubjectProfile[];
    universeId: number;
};

export function SearchSubjectsWindow({ results, subjectProfiles, universeId }: Props) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const { openWindow } = useWindowStore();

    const openDossier = (result: ApiAdvancedSearchResult) => {
        openWindow({
            type: 'entity-dossier',
            title: `${result.name}  DOSSIER`,
            icon: result.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${result.slug}`,
                universeId,
                entitySlug: result.slug,
            },
        });
    };

    const openGraph = (result: ApiAdvancedSearchResult) => {
        openWindow({
            type: 'connections-graph',
            title: `${result.name}  CONNECTIONS`,
            icon: result.entity_type?.icon ?? 'EN',
            props: {
                key: `graph-${universeId}-${result.slug}`,
                universeId,
                entitySlug: result.slug,
            },
            size: { width: 900, height: 600 },
        });
    };

    const selectedResult = results.find((r) => r.id === selectedId);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-[var(--arc-border)] p-3">
                <div className="flex items-center gap-2">
                    <Users className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        IDENTIFIED SUBJECTS ({results.length})
                    </span>
                    <div className="h-px flex-1 bg-[var(--arc-border)]" />
                    <button
                        onClick={() => results.slice(0, 3).forEach(openDossier)}
                        className="flex items-center gap-1 border border-[var(--arc-accent)]/20 px-2 py-1 text-[9px] font-bold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/10"
                    >
                        <Sparkles className="size-3" />
                        OPEN TOP 3 DOSSIERS
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Subject List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {results.map((result, i) => {
                        const profile = subjectProfiles.find((p) => p.rank === i + 1);
                        const profileImage = result.images.find((img) => img.type === 'profile');

                        return (
                            <div
                                key={result.id}
                                className={`border transition-all cursor-pointer ${
                                    selectedId === result.id
                                        ? 'border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/5'
                                        : 'border-[var(--arc-border)] bg-[var(--arc-surface)] hover:border-[var(--arc-accent)]/20'
                                }`}
                                onClick={() => setSelectedId(selectedId === result.id ? null : result.id)}
                            >
                                <div className="flex items-start gap-3 p-3">
                                    {/* Rank */}
                                    <div className="flex size-7 shrink-0 items-center justify-center border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 arc-mono text-[10px] font-bold text-[var(--arc-accent)]">
                                        {i + 1}
                                    </div>

                                    {/* Image */}
                                    {profileImage ? (
                                        <div className="size-10 shrink-0 overflow-hidden border border-[var(--arc-border)]">
                                            <img
                                                src={profileImage.thumbnail_url ?? profileImage.url}
                                                alt={profileImage.alt_text ?? result.name}
                                                className="size-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex size-10 shrink-0 items-center justify-center border border-[var(--arc-border)] bg-[var(--arc-surface-alt)]">
                                            <TypeIcon entityType={result.entity_type as any} size="sm" />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openDossier(result); }}
                                                className="truncate text-xs font-semibold text-[var(--arc-text)] hover:text-[var(--arc-accent)] hover:underline"
                                            >
                                                {result.name}
                                            </button>
                                            <StatusBadge status={result.entity_status as any} size="sm" />
                                            {result.is_featured && <Sparkles className="size-3 text-amber-500" />}
                                        </div>
                                        {result.short_description && (
                                            <p className="mt-0.5 truncate text-[10px] text-[var(--arc-text-muted)]">
                                                {result.short_description}
                                            </p>
                                        )}
                                        {result.aliases.length > 0 && (
                                            <p className="arc-mono mt-0.5 text-[9px] text-[var(--arc-text-muted)]">
                                                AKA: {result.aliases.slice(0, 3).join(' / ')}
                                            </p>
                                        )}
                                        {result.excerpts[0] && (
                                            <div className="mt-1.5 border-l-2 border-[var(--arc-accent)]/20 pl-2">
                                                <span className="arc-mono text-[8px] font-bold uppercase tracking-wider text-[var(--arc-text-muted)]">
                                                    {result.excerpts[0].source}:
                                                </span>{' '}
                                                <span className="text-[10px] text-[var(--arc-text-muted)]">
                                                    {result.excerpts[0].text.slice(0, 100)}
                                                    {result.excerpts[0].text.length > 100 ? '...' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Score + actions */}
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <div
                                            className="arc-mono text-[11px] font-bold"
                                            style={{
                                                color: result.score > 100
                                                    ? 'var(--arc-accent)'
                                                    : result.score > 50
                                                      ? 'var(--arc-text)'
                                                      : 'var(--arc-text-muted)',
                                            }}
                                        >
                                            {result.score}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openGraph(result); }}
                                                className="rounded p-1 text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                                                title="View connections"
                                            >
                                                <Network className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Evidence Detail Panel */}
                {selectedResult && (
                    <div className="w-72 shrink-0 overflow-y-auto border-l border-[var(--arc-border)] bg-[var(--arc-surface-alt)] p-3">
                        <div className="mb-3 flex items-center gap-2">
                            <FileSearch className="size-3.5 text-[var(--arc-accent)]" />
                            <span className="arc-mono text-[9px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                                EVIDENCE
                            </span>
                        </div>
                        <p className="mb-3 text-xs font-semibold text-[var(--arc-text)]">
                            {selectedResult.name}
                        </p>
                        <div className="space-y-2">
                            {selectedResult.excerpts.map((excerpt, i) => (
                                <div
                                    key={i}
                                    className="border-l-2 border-[var(--arc-accent)]/30 pl-2"
                                >
                                    <span className="arc-mono text-[8px] font-bold uppercase tracking-wider text-[var(--arc-text-muted)]">
                                        {excerpt.source}
                                    </span>
                                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--arc-text)]">
                                        {excerpt.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Subject profile evidence if available */}
                        {(() => {
                            const idx = results.indexOf(selectedResult);
                            const profile = subjectProfiles.find((p) => p.rank === idx + 1);
                            if (!profile) return null;
                            return (
                                <div className="mt-4 border-t border-[var(--arc-border)] pt-3">
                                    <span className="arc-mono text-[8px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                                        PROFILE SUMMARY
                                    </span>
                                    <div className="mt-1.5 space-y-1">
                                        <p className="text-[10px] text-[var(--arc-text-muted)]">
                                            Type: <span className="text-[var(--arc-text)]">{profile.type}</span>
                                        </p>
                                        <p className="text-[10px] text-[var(--arc-text-muted)]">
                                            Status: <span className="text-[var(--arc-text)]">{profile.status}</span>
                                        </p>
                                        <p className="text-[10px] text-[var(--arc-text-muted)]">
                                            Confidence: <span className="text-[var(--arc-accent)]">{profile.score}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
