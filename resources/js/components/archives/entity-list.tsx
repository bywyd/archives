import { Loader2, AlertCircle, Edit3, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EntityCard } from '@/components/archives/entity-card';
import { StatusBadge } from '@/components/archives/status-badge';
import { TypeIcon } from '@/components/archives/type-icon';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type { ApiEntity, PaginatedResponse } from '@/types/api';
import { InternalWindowPagination } from '../workbench/internal-window-pagination';

type Props = {
    universeId: number;
    typeSlug?: string;
};

type SortField = 'name' | 'type' | 'status';
type SortDir = 'asc' | 'desc';

export function EntityList({ universeId, typeSlug }: Props) {
    const [data, setData] = useState<PaginatedResponse<ApiEntity> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const { openWindow } = useWindowStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.fetchEntities(universeId, {
            type: typeSlug,
            search: search || undefined,
            page,
            per_page: 20,
        })
            .then((res) => {
                if (!cancelled) {
                    setData(res);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message || 'Failed to load entities');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [universeId, typeSlug, page, search]);

    const sorted = useMemo(() => {
        if (!data?.data) return [];
        return [...data.data].sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            switch (sortField) {
                case 'name':
                    return a.name.localeCompare(b.name) * dir;
                case 'type':
                    return (a.entity_type?.name ?? '').localeCompare(b.entity_type?.name ?? '') * dir;
                case 'status':
                    return (a.entity_status?.name ?? '').localeCompare(b.entity_status?.name ?? '') * dir;
                default:
                    return 0;
            }
        });
    }, [data?.data, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="size-2.5 opacity-30" />;
        return sortDir === 'asc' ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />;
    };

    const openEntityDossier = (entity: ApiEntity) => {
        openWindow({
            type: 'entity-dossier',
            title: `${entity.name}  DOSSIER`,
            icon: entity.entity_type?.icon ?? 'EN',
            props: {
                key: `entity-${universeId}-${entity.slug}`,
                universeId,
                entitySlug: entity.slug,
            },
        });
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-3 py-2">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Filter entities..."
                    className="arc-mono h-7 flex-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-2 text-xs text-[var(--arc-text)] outline-none placeholder:text-[var(--arc-text-muted)]/50 focus:border-[var(--arc-accent)]/50 focus:ring-1 focus:ring-[var(--arc-accent)]/20"
                />
                {data && (
                    <span className="arc-mono text-[9px] font-semibold text-[var(--arc-text-muted)]">+
                        {data?.meta?.from !== null && data?.meta?.to !== null && (
                            <span className="">
                                {data?.meta?.from}-{data?.meta?.to} of&nbsp;
                            </span>
                        )}
                        {data?.meta?.total} RECORDS
                    </span>
                )}
                <div className="flex items-center gap-0.5 rounded border border-[var(--arc-border)] p-0.5">
                    <button
                        className={cn(
                            'flex size-6 items-center justify-center rounded-sm transition-colors',
                            viewMode === 'table'
                                ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                        )}
                        onClick={() => setViewMode('table')}
                        title="Table View"
                    >
                        <List className="size-3.5" />
                    </button>
                    <button
                        className={cn(
                            'flex size-6 items-center justify-center rounded-sm transition-colors',
                            viewMode === 'grid'
                                ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                                : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                        )}
                        onClick={() => setViewMode('grid')}
                        title="Card View"
                    >
                        <LayoutGrid className="size-3.5" />
                    </button>
                </div>
                <button
                    onClick={() => {
                        openWindow({
                            type: 'entity-editor',
                            title: 'NEW ENTITY',
                            icon: 'ED',
                            props: {
                                key: `editor-${universeId}-new`,
                                universeId,
                            },
                            size: { width: 700, height: 600 },
                        });
                    }}
                    className="flex h-7 items-center gap-1 rounded border border-[var(--arc-accent)]/30 bg-[var(--arc-accent)]/10 px-2 text-[10px] font-medium text-[var(--arc-accent)] transition-colors hover:bg-[var(--arc-accent)]/20"
                    title="Create new entity"
                >
                    <Plus className="size-3" /> New
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                        <Loader2 className="size-5 animate-spin text-[var(--arc-accent)]" />
                        <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">RETRIEVING RECORDS...</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded border border-[var(--arc-danger)]/20 bg-[var(--arc-danger)]/5 px-3 py-2.5 text-sm text-[var(--arc-danger)]">
                        <AlertCircle className="size-4 shrink-0" />
                        {error}
                    </div>
                )}

                {!loading && !error && data && (
                    <>
                        {viewMode === 'table' ? (
                            <table className="arc-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>
                                            <button className="flex items-center gap-1" onClick={() => toggleSort('name')}>
                                                Name <SortIcon field="name" />
                                            </button>
                                        </th>
                                        <th>
                                            <button className="flex items-center gap-1" onClick={() => toggleSort('type')}>
                                                Type <SortIcon field="type" />
                                            </button>
                                        </th>
                                        <th>
                                            <button className="flex items-center gap-1" onClick={() => toggleSort('status')}>
                                                Status <SortIcon field="status" />
                                            </button>
                                        </th>
                                        <th className="hidden lg:table-cell">Description</th>
                                        <th style={{ width: '3rem' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((entity, idx) => (
                                        <tr
                                            key={entity.id}
                                            className="arc-animate-in cursor-pointer"
                                            style={{ animationDelay: `${Math.min(idx * 25, 300)}ms` }}
                                            onClick={() => openEntityDossier(entity)}
                                        >
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <TypeIcon entityType={entity.entity_type} size="sm" />
                                                    <span className="text-xs font-medium text-[var(--arc-text)]">
                                                        {entity.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="arc-mono text-[10px] text-[var(--arc-text-muted)]">
                                                    {entity.entity_type?.name ?? ''}
                                                </span>
                                            </td>
                                            <td>
                                                <StatusBadge status={entity.entity_status} />
                                            </td>
                                            <td className="hidden lg:table-cell">
                                                <span className="line-clamp-1 text-[11px] text-[var(--arc-text-muted)]">
                                                    {entity.short_description ?? ''}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openWindow({
                                                            type: 'entity-editor',
                                                            title: `EDIT  ${entity.name}`,
                                                            icon: 'ED',
                                                            props: {
                                                                key: `editor-${universeId}-${entity.slug}`,
                                                                universeId,
                                                                entityId: entity.id,
                                                                entitySlug: entity.slug,
                                                            },
                                                            size: { width: 700, height: 600 },
                                                        });
                                                    }}
                                                    className="flex size-6 items-center justify-center rounded text-[var(--arc-text-muted)] transition-colors hover:bg-[var(--arc-accent)]/10 hover:text-[var(--arc-accent)]"
                                                    title="Edit entity"
                                                >
                                                    <Edit3 className="size-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {sorted.map((entity, idx) => (
                                    <div key={entity.id} className="arc-animate-in" style={{ animationDelay: `${Math.min(idx * 30, 400)}ms` }}>
                                        <EntityCard
                                            entity={entity}
                                            onClick={() => openEntityDossier(entity)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {data.data.length === 0 && (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[var(--arc-text-muted)]">No entities found</p>
                                <p className="arc-mono mt-1 text-[10px] text-[var(--arc-text-muted)]/50">TRY ADJUSTING YOUR FILTERS</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination */}
            <InternalWindowPagination meta={data?.meta} page={page} setPage={setPage} />
        </div>
    );
}
