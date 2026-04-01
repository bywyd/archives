import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiEntitySummary } from '@/types/api';

type Props = {
    universeId: number;
    value: number | null;
    onChange: (entityId: number | null, entity: ApiEntitySummary | null) => void;
    placeholder?: string;
    className?: string;
    excludeIds?: number[];
};

/**
 * Searchable entity picker  dropdown autocomplete for selecting an entity FK reference.
 */
export function EntityPicker({ universeId, value, onChange, placeholder = 'Search entity...', className, excludeIds = [] }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ApiEntitySummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ApiEntitySummary | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Load initial entity if value is set
    useEffect(() => {
        if (value && !selected) {
            api.fetchEntity(universeId, value)
                .then((res) => setSelected(res.data as unknown as ApiEntitySummary))
                .catch(() => {});
        }
        if (!value) {
            setSelected(null);
        }
    }, [value, universeId]);

    const search = useCallback((q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        api.fetchEntities(universeId, { search: q, per_page: 10 })
            .then((res) => {
                const filtered = (res.data as unknown as ApiEntitySummary[]).filter((e) => !excludeIds.includes(e.id));
                setResults(filtered);
            })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, [universeId, excludeIds]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setOpen(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 250);
    };

    const handleSelect = (entity: ApiEntitySummary) => {
        setSelected(entity);
        setQuery('');
        setOpen(false);
        onChange(entity.id, entity);
    };

    const handleClear = () => {
        setSelected(null);
        setQuery('');
        onChange(null, null);
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (selected) {
        return (
            <div className={cn('flex items-center gap-2 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 py-1.5', className)}>
                {selected.images?.[0] && (
                    <img src={selected.images[0].thumbnail_url ?? selected.images[0].url} alt="" className="size-5 rounded object-cover" />
                )}
                <span className="flex-1 truncate text-xs text-[var(--arc-text)]">{selected.name}</span>
                {selected.entity_type && (
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{selected.entity_type.name}</span>
                )}
                <button onClick={handleClear} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                    <X className="size-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--arc-text-muted)]" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query && setOpen(true)}
                    placeholder={placeholder}
                    className="arc-input pl-7 text-xs"
                />
            </div>
            {open && (results.length > 0 || loading) && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] shadow-lg">
                    {loading && (
                        <div className="px-3 py-2 text-center text-xs text-[var(--arc-text-muted)]">Searching...</div>
                    )}
                    {results.map((entity) => (
                        <button
                            key={entity.id}
                            onClick={() => handleSelect(entity)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-[var(--arc-surface-hover)]"
                        >
                            {entity.images?.[0] && (
                                <img src={entity.images[0].thumbnail_url ?? entity.images[0].url} alt="" className="size-5 rounded object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-medium text-[var(--arc-text)]">{entity.name}</div>
                                {entity.entity_type && (
                                    <div className="arc-mono text-[9px] text-[var(--arc-text-muted)]">{entity.entity_type.name}</div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
