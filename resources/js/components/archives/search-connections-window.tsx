import { Link2, Network } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiAdvancedSearchConnection,
    ApiAdvancedSearchConnectionEdge,
    ApiAdvancedSearchConnectionNode,
    ApiAdvancedSearchResult,
} from '@/types/api';

//  Types 

type Props = {
    nodes: ApiAdvancedSearchConnectionNode[];
    edges: ApiAdvancedSearchConnectionEdge[];
    keyConnections: ApiAdvancedSearchConnection[];
    results: ApiAdvancedSearchResult[];
    universeId: number;
};

//  Mini force-directed graph layout 

type LayoutNode = {
    id: number;
    name: string;
    color: string;
    isPrimary: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
};

type LayoutEdge = {
    from: number;
    to: number;
    label: string;
};

function layoutMiniGraph(
    nodes: ApiAdvancedSearchConnectionNode[],
    edges: ApiAdvancedSearchConnectionEdge[],
    width: number,
    height: number,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);

    const layoutNodes: LayoutNode[] = nodes.map((n, i) => {
        const r = n.is_primary ? radius * 0.5 : radius;
        const angle = angleStep * i - Math.PI / 2;
        return {
            id: n.id,
            name: n.name,
            color: n.entity_type?.color ?? '#64748b',
            isPrimary: n.is_primary,
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            vx: 0,
            vy: 0,
        };
    });

    // Build a fast index so we don't .find() inside the hot loop
    const idxById = new Map<string, number>();
    layoutNodes.forEach((n, i) => idxById.set(String(n.id), i));

    const ITERS = 120;
    const NODE_PADDING = 50;
    const IDEAL_EDGE_LENGTH = 150;

    for (let iter = 0; iter < ITERS; iter++) {
        const alpha = Math.pow(1 - iter / ITERS, 1.5);

        // Repulsion between all pairs
        for (let i = 0; i < layoutNodes.length; i++) {
            for (let j = i + 1; j < layoutNodes.length; j++) {
                const dx = layoutNodes[j].x - layoutNodes[i].x;
                const dy = layoutNodes[j].y - layoutNodes[i].y;
                const distSq = dx * dx + dy * dy || 0.01;
                const dist = Math.sqrt(distSq);
                const repulsion = Math.min((18000 * alpha) / distSq, 60);
                const fx = (dx / dist) * repulsion;
                const fy = (dy / dist) * repulsion;
                layoutNodes[i].vx -= fx;
                layoutNodes[i].vy -= fy;
                layoutNodes[j].vx += fx;
                layoutNodes[j].vy += fy;
            }
        }

        // Short-range hard push
        for (let i = 0; i < layoutNodes.length; i++) {
            for (let j = i + 1; j < layoutNodes.length; j++) {
                const dx = layoutNodes[j].x - layoutNodes[i].x;
                const dy = layoutNodes[j].y - layoutNodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
                if (dist < NODE_PADDING) {
                    const push = ((NODE_PADDING - dist) / dist) * 0.5;
                    layoutNodes[i].vx -= dx * push;
                    layoutNodes[i].vy -= dy * push;
                    layoutNodes[j].vx += dx * push;
                    layoutNodes[j].vy += dy * push;
                }
            }
        }

        // Spring attraction along edges
        for (const edge of edges) {
            const si = idxById.get(String(edge.from));
            const ti = idxById.get(String(edge.to));
            if (si === undefined || ti === undefined) continue;
            const s = layoutNodes[si];
            const t = layoutNodes[ti];
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spring = (dist - IDEAL_EDGE_LENGTH) * 0.025 * alpha;
            s.vx += (dx / dist) * spring;
            s.vy += (dy / dist) * spring;
            t.vx -= (dx / dist) * spring;
            t.vy -= (dy / dist) * spring;
        }

        // Gravity toward centre
        for (const n of layoutNodes) {
            n.vx += (cx - n.x) * 0.005 * alpha;
            n.vy += (cy - n.y) * 0.005 * alpha;
            n.vx *= 0.65;
            n.vy *= 0.65;
            n.x += n.vx;
            n.y += n.vy;
            n.x = Math.max(50, Math.min(width - 50, n.x));
            n.y = Math.max(40, Math.min(height - 40, n.y));
        }
    }

    const layoutEdges: LayoutEdge[] = edges.map((e) => ({
        from: e.from,
        to: e.to,
        label: e.label,
    }));

    return { nodes: layoutNodes, edges: layoutEdges };
}

//  Component 

const MONO_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export function SearchConnectionsWindow({
    nodes,
    edges,
    keyConnections,
    results,
    universeId,
}: Props) {
    const GW = 760;
    const GH = 480;

    const { openWindow } = useWindowStore();

    // const graphLayout = useMemo(() => {
    //     if (!nodes.length) return null;
    //     return layoutMiniGraph(nodes, edges, GW, GH);
    // }, [nodes, edges]);

    // Build node lookup map once  used by both SVG graph and edge list
    const nodeById = useMemo(() => {
        const map = new Map<string, ApiAdvancedSearchConnectionNode>(); // <-- Change to string
        nodes.forEach((n) => map.set(String(n.id), n)); // <-- Cast to String
        return map;
    }, [nodes]);

    const graph = useMemo(() => {
        if (!nodes.length) return null;
        const layout = layoutMiniGraph(nodes, edges, GW, GH);
        const nodeById = new Map<string, LayoutNode>(); // <-- Change to string
        layout.nodes.forEach((n) => nodeById.set(String(n.id), n)); // <-- Cast to String
        return { ...layout, nodeById };
    }, [nodes, edges]);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const openDossier = (entityId: number) => {
        const result = results.find((r) => r.id === entityId);
        const node = nodeById.get(String(entityId));
        const name = result?.name ?? node?.name ?? 'Entity';
        const slug = result?.slug ?? node?.slug;
        if (!slug) return;

        openWindow({
            type: 'entity-dossier',
            title: `${name}  DOSSIER`,
            props: {
                key: `entity-${universeId}-${slug}`,
                universeId,
                entitySlug: slug,
            },
        });
    };

    if (!isMounted || !graph || graph.nodes.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Network className="size-8 text-(--arc-text-muted)" />
                <p className="font-mono text-[10px] tracking-[0.15em] text-(--arc-text-muted)">
                    NO CONNECTIONS DETECTED BETWEEN RESULTS
                </p>
                <p className="text-[11px] text-(--arc-text-muted)">
                    Results may not have direct relationships in the database.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-(--arc-border) p-3">
                <div className="flex items-center gap-2">
                    <Network className="size-4 text-(--arc-accent)" />
                    <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-(--arc-accent)">
                        CONNECTION ANALYSIS
                    </span>
                    <div className="h-px flex-1 bg-(--arc-border)" />
                    <span className="font-mono text-[8px] text-(--arc-text-muted)">
                        {graph.nodes.length} NODES / {graph.edges.length} LINKS
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Graph SVG */}
                <div className="border-b border-(--arc-border) bg-(--arc-surface-alt)">
                    <svg
                        viewBox={`0 0 ${GW} ${GH}`}
                        className="w-full"
                        style={{ maxHeight: GH, display: 'block' }}
                    >
                        {/* Edges */}
                        {graph.edges.map((edge, i) => {
                            const from = graph.nodeById.get(String(edge.from));
                            const to = graph.nodeById.get(String(edge.to));
                            if (!from || !to) return null;

                            const mx = (from.x + to.x) / 2;
                            const my = (from.y + to.y) / 2;
                            const bothPrimary = from.isPrimary && to.isPrimary;

                            const shortLabel =
                                edge.label.length > 18
                                    ? edge.label.slice(0, 16) + '\u2026'
                                    : edge.label;
                            const labelW = shortLabel.length * 4.5 + 8;

                            return (
                                <g key={`edge-${i}`}>
                                    <line
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke={bothPrimary ? 'var(--arc-accent, #2563eb)' : 'var(--arc-border, #e2e8f0)'}
                                        strokeWidth={bothPrimary ? 1.5 : 1}
                                        strokeDasharray={bothPrimary ? undefined : '5 3'}
                                        strokeOpacity={bothPrimary ? 0.7 : 0.5}
                                    />
                                    <rect
                                        x={mx - labelW / 2}
                                        y={my - 9}
                                        width={labelW}
                                        height={11}
                                        rx={2}
                                        style={{
                                            fill: 'var(--arc-surface-alt, #f8fafc)',
                                            fillOpacity: 0.85,
                                        }}
                                    />
                                    <text
                                        x={mx}
                                        y={my}
                                        textAnchor="middle"
                                        style={{
                                            fontSize: '7.5px',
                                            fontFamily: MONO_FONT,
                                            fill: bothPrimary
                                                ? 'var(--arc-accent, #2563eb)'
                                                : 'var(--arc-text-muted, #64748b)',
                                            fontWeight: bothPrimary ? 600 : 400,
                                        }}
                                    >
                                        {shortLabel}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {graph.nodes.map((node) => {
                            const r = node.isPrimary ? 14 : 9;
                            const labelY = node.y + r + 13;
                            const displayName =
                                node.name.length > 14
                                    ? node.name.slice(0, 13) + '\u2026'
                                    : node.name;
                            const charW = node.isPrimary ? 4.2 : 3.6;
                            const bgW = displayName.length * charW + 6;

                            return (
                                <g
                                    key={node.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => openDossier(node.id)}
                                >
                                    {node.isPrimary && (
                                        <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r={r + 5}
                                            fill="none"
                                            stroke={node.color}
                                            strokeWidth={1}
                                            strokeOpacity={0.25}
                                        />
                                    )}
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={r}
                                        fill={node.color + '28'}
                                        stroke={node.color}
                                        strokeWidth={node.isPrimary ? 2.5 : 1.5}
                                    />
                                    <rect
                                        x={node.x - bgW / 2}
                                        y={labelY - 9}
                                        width={bgW}
                                        height={12}
                                        rx={2}
                                        style={{
                                            fill: 'var(--arc-surface-alt, #f8fafc)',
                                            fillOpacity: 0.8,
                                        }}
                                    />
                                    <text
                                        x={node.x}
                                        y={labelY}
                                        textAnchor="middle"
                                        style={{
                                            fontSize: node.isPrimary ? '9px' : '7.5px',
                                            fontWeight: node.isPrimary ? 700 : 400,
                                            fontFamily: MONO_FONT,
                                            fill: 'var(--arc-text, #0f172a)',
                                        }}
                                    >
                                        {displayName}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 border-b border-(--arc-border) px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                        <svg width="20" height="10" aria-hidden="true">
                            <line
                                x1="0" y1="5" x2="20" y2="5"
                                style={{ stroke: 'var(--arc-accent, #2563eb)', strokeWidth: 1.5 }}
                            />
                        </svg>
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">DIRECT LINK</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg width="20" height="10" aria-hidden="true">
                            <line
                                x1="0" y1="5" x2="20" y2="5"
                                style={{
                                    stroke: 'var(--arc-border, #e2e8f0)',
                                    strokeWidth: 1,
                                    strokeDasharray: '5 3',
                                }}
                            />
                        </svg>
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">INDIRECT LINK</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" aria-hidden="true">
                            <circle
                                cx="6" cy="6" r="5" fill="none"
                                style={{ stroke: 'var(--arc-accent, #2563eb)', strokeWidth: 2 }}
                            />
                        </svg>
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">PRIMARY SUBJECT</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" aria-hidden="true">
                            <circle
                                cx="6" cy="6" r="4" fill="none"
                                style={{ stroke: 'var(--arc-text-muted, #64748b)', strokeWidth: 1.5 }}
                            />
                        </svg>
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">RELATED</span>
                    </div>
                </div>

                {/* Edge List */}
                <div className="space-y-3 p-3">
                    {/* Key connections from briefing */}
                    {keyConnections.length > 0 && (
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <span className="font-mono text-[9px] font-bold tracking-[0.15em] text-(--arc-accent)">
                                    KEY CONNECTIONS
                                </span>
                                <div className="h-px flex-1 bg-(--arc-border)" />
                                <span className="font-mono text-[8px] text-(--arc-text-muted)">
                                    {keyConnections.length}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {keyConnections.map((conn, i) => (
                                    <div
                                        key={i}
                                        className="border border-(--arc-border) bg-(--arc-surface) p-2"
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="font-semibold text-(--arc-text)">{conn.from}</span>
                                            <span className="shrink-0 rounded-sm bg-(--arc-accent)/10 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-(--arc-accent)">
                                                {conn.type.toUpperCase()}
                                            </span>
                                            <span className="font-semibold text-(--arc-text)">{conn.to}</span>
                                        </div>
                                        {(conn.description || conn.context) && (
                                            <p className="mt-1 text-[10px] leading-relaxed text-(--arc-text-muted)">
                                                {conn.description ?? conn.context}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All detected edges */}
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold tracking-[0.15em] text-(--arc-text-muted)">
                                ALL DETECTED LINKS
                            </span>
                            <div className="h-px flex-1 bg-(--arc-border)" />
                            <span className="font-mono text-[8px] text-(--arc-text-muted)">
                                {edges.length}
                            </span>
                        </div>
                        <div className="space-y-1">
                            {edges.map((edge) => {
                                const fromNode = nodeById.get(String(edge.from));
                                const toNode = nodeById.get(String(edge.to));
                                const fromName = fromNode?.name ?? `#${edge.from}`;
                                const toName = toNode?.name ?? `#${edge.to}`;
                                return (
                                    <div
                                        key={edge.id}
                                        className="flex flex-wrap items-start gap-x-2 gap-y-0.5 border border-transparent px-1.5 py-1 text-[10px] hover:border-(--arc-border) hover:bg-(--arc-surface)"
                                    >
                                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                            <Link2 className="size-3 shrink-0 text-(--arc-text-muted)" />
                                            <button
                                                className="font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline"
                                                onClick={() => fromNode && openDossier(fromNode.id)}
                                                type="button"
                                            >
                                                {fromName}
                                            </button>
                                            <span className="shrink-0 rounded-sm bg-(--arc-accent)/10 px-1 py-px font-mono text-[8px] font-medium text-(--arc-accent)">
                                                {edge.label}
                                            </span>
                                            <button
                                                className="font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline"
                                                onClick={() => toNode && openDossier(toNode.id)}
                                                type="button"
                                            >
                                                {toName}
                                            </button>
                                        </div>
                                        {edge.status && (
                                            <span className="font-mono text-[8px] text-(--arc-text-muted)">
                                                [{edge.status}]
                                            </span>
                                        )}
                                        {edge.description && (
                                            <p className="w-full pl-5 text-[10px] leading-relaxed text-(--arc-text-muted)">
                                                {edge.description}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
