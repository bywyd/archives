import { Filter, Locate, Maximize2, Network, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiAdvancedSearchConnection,
    ApiAdvancedSearchConnectionEdge,
    ApiAdvancedSearchConnectionNode,
    ApiAdvancedSearchResult,
} from '@/types/api';

type Props = {
    nodes: ApiAdvancedSearchConnectionNode[];
    edges: ApiAdvancedSearchConnectionEdge[];
    keyConnections: ApiAdvancedSearchConnection[];
    results: ApiAdvancedSearchResult[];
    universeId: number;
};

type LayoutNode = {
    id: number;
    slug: string;
    name: string;
    typeName: string | null;
    typeColor: string | null;
    icon: string | null;
    imageUrl: string | null;
    isPrimary: boolean;
    relationCount: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
};

type LayoutEdge = {
    id: number;
    from: number;
    to: number;
    label: string;
    status: string | null;
    description: string | null;
};

// Force Simulation

function runForceSimulation(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    cx: number,
    cy: number,
    iterations = 200,
): LayoutNode[] {
    const sim = nodes.map((n) => ({ ...n }));

    for (let iter = 0; iter < iterations; iter++) {
        const alpha = Math.pow(1 - iter / iterations, 1.5);

        // Repulsion between all node pairs
        for (let i = 0; i < sim.length; i++) {
            for (let j = i + 1; j < sim.length; j++) {
                const dx = sim[j].x - sim[i].x;
                const dy = sim[j].y - sim[i].y;
                const distSq = dx * dx + dy * dy || 0.01;
                const dist = Math.sqrt(distSq);
                const repulsion = (20000 * alpha) / distSq;
                const fx = (dx / dist) * repulsion;
                const fy = (dy / dist) * repulsion;
                sim[i].vx -= fx;
                sim[i].vy -= fy;
                sim[j].vx += fx;
                sim[j].vy += fy;
            }
        }

        // Spring attraction along edges
        for (const edge of edges) {
            const s = sim.find((n) => n.id === edge.from);
            const t = sim.find((n) => n.id === edge.to);
            if (!s || !t) continue;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spring = (dist - 220) * 0.04 * alpha;
            s.vx += (dx / dist) * spring;
            s.vy += (dy / dist) * spring;
            t.vx -= (dx / dist) * spring;
            t.vy -= (dy / dist) * spring;
        }

        // Weak gravity toward center
        for (const n of sim) {
            n.vx += (cx - n.x) * 0.006 * alpha;
            n.vy += (cy - n.y) * 0.006 * alpha;
        }

        // Apply velocity with damping
        for (const n of sim) {
            n.vx *= 0.72;
            n.vy *= 0.72;
            n.x += n.vx;
            n.y += n.vy;
        }
    }

    return sim;
}

export function SearchConnectionsWindow({
    nodes: propNodes,
    edges: propEdges,
    keyConnections,
    results,
    universeId,
}: Props) {
    const CX = 400;
    const CY = 300;

    const { openWindow } = useWindowStore();
    const svgRef = useRef<SVGSVGElement>(null);
    const hasFitRef = useRef(false);

    // Graph state
    const [nodes, setNodes] = useState<LayoutNode[]>([]);
    const [edges, setEdges] = useState<LayoutEdge[]>([]);
    const [relayoutKey, setRelayoutKey] = useState(0);

    useEffect(() => {
        if (!propNodes.length) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const total = propNodes.length;
        const radius = Math.max(160, total * 28);
        const angleStep = (2 * Math.PI) / Math.max(total, 1);

        const relationCount = new Map<number, number>();
        for (const edge of propEdges) {
            relationCount.set(edge.from, (relationCount.get(edge.from) ?? 0) + 1);
            relationCount.set(edge.to, (relationCount.get(edge.to) ?? 0) + 1);
        }

        const layoutNodes: LayoutNode[] = propNodes.map((n, i) => {
            const r = n.is_primary ? radius * 0.55 : radius;
            const angle = angleStep * i - Math.PI / 2;
            return {
                id: n.id,
                slug: n.slug,
                name: n.name,
                typeName: n.entity_type?.name ?? null,
                typeColor: n.entity_type?.color ?? null,
                icon: n.entity_type?.icon ?? null,
                imageUrl: n.profile_image_url ?? null,
                isPrimary: n.is_primary,
                relationCount: relationCount.get(n.id) ?? 0,
                x: CX + Math.cos(angle) * r,
                y: CY + Math.sin(angle) * r,
                vx: 0,
                vy: 0,
            };
        });

        const layoutEdges: LayoutEdge[] = propEdges.map((e) => ({
            id: e.id,
            from: e.from,
            to: e.to,
            label: e.label,
            status: e.status,
            description: e.description,
        }));

        hasFitRef.current = false;
        setNodes(runForceSimulation(layoutNodes, layoutEdges, CX, CY));
        setEdges(layoutEdges);
    }, [propNodes, propEdges, relayoutKey]);

    // Fit all nodes into view on first load / after relayout
    useEffect(() => {
        if (!nodes.length || hasFitRef.current) return;
        requestAnimationFrame(() => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect || rect.width === 0) return;
            const PAD = 80;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const n of nodes) {
                const r = n.isPrimary ? 36 : 26 + Math.min(n.relationCount * 1.5, 8);
                minX = Math.min(minX, n.x - r);
                minY = Math.min(minY, n.y - r);
                maxX = Math.max(maxX, n.x + r);
                maxY = Math.max(maxY, n.y + r);
            }
            const newZoom = Math.min(rect.width / (maxX - minX + PAD * 2), rect.height / (maxY - minY + PAD * 2), 1.5);
            setZoom(newZoom);
            setPan({
                x: rect.width / 2 - ((minX + maxX) / 2) * newZoom,
                y: rect.height / 2 - ((minY + maxY) / 2) * newZoom,
            });
            hasFitRef.current = true;
        });
    }, [nodes]);

    // Interaction state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState<{ nodeId: number } | null>(null);
    const [panning, setPanning] = useState<{
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
    } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);
    const [selectedNode, setSelectedNode] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [nodeFilter, setNodeFilter] = useState('');
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    // Derived
    const nodeById = useMemo(() => {
        const map = new Map<number, LayoutNode>();
        nodes.forEach((n) => map.set(n.id, n));
        return map;
    }, [nodes]);

    const visibleEdges = useMemo(() => {
        if (filterStatus === 'all') return edges;
        return edges.filter((e) => e.status === filterStatus);
    }, [edges, filterStatus]);

    const connectedIds = useMemo((): Set<number> | null => {
        if (!selectedNode) return null;
        const ids = new Set<number>([selectedNode]);
        for (const e of visibleEdges) {
            if (e.from === selectedNode || e.to === selectedNode) {
                ids.add(e.from);
                ids.add(e.to);
            }
        }
        return ids;
    }, [selectedNode, visibleEdges]);

    const selectedNodeData = useMemo(
        () => (selectedNode ? (nodeById.get(selectedNode) ?? null) : null),
        [selectedNode, nodeById],
    );

    const availableStatuses = useMemo(() => {
        const s = new Set<string>();
        for (const e of edges) {
            if (e.status) s.add(e.status);
        }
        return Array.from(s);
    }, [edges]);

    const filteredNodeIds = useMemo(() => {
        if (!nodeFilter.trim()) return null;
        const q = nodeFilter.toLowerCase();
        const ids = new Set<number>();
        for (const n of nodes) {
            if (n.name.toLowerCase().includes(q) || n.typeName?.toLowerCase().includes(q)) {
                ids.add(n.id);
            }
        }
        return ids;
    }, [nodes, nodeFilter]);

    const tooltipNode = hoveredNode !== null ? (nodeById.get(hoveredNode) ?? null) : null;

    // Controls
    const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 4));
    const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.2));
    const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    const handleRelayout = () => { hasFitRef.current = false; setRelayoutKey((k) => k + 1); };

    const handleCenterNode = (node: LayoutNode) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPan({
            x: rect.width / 2 - node.x * zoom,
            y: rect.height / 2 - node.y * zoom,
        });
    };

    const handleSelectNodeByName = (name: string) => {
        const match = nodes.find((n) => n.name === name);
        if (!match) return;
        setSelectedNode(match.id);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) setPan({ x: rect.width / 2 - match.x * zoom, y: rect.height / 2 - match.y * zoom });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z * (e.deltaY < 0 ? 1.1 : 0.9), 0.2), 4));
    };

    const handleSvgMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as Element).closest('.graph-node')) return;
        setSelectedNode(null);
        setPanning({ startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y });
    };

    const handleSvgMouseMove = (e: React.MouseEvent) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        if (panning) {
            setPan({
                x: panning.startPanX + (e.clientX - panning.startX),
                y: panning.startPanY + (e.clientY - panning.startY),
            });
        }
        if (dragging) {
            if (!rect) return;
            const x = (e.clientX - rect.left - pan.x) / zoom;
            const y = (e.clientY - rect.top - pan.y) / zoom;
            setNodes((prev) => prev.map((n) => (n.id === dragging.nodeId ? { ...n, x, y } : n)));
        }
    };

    const handleSvgMouseUp = () => { setPanning(null); setDragging(null); setMousePos(null); setHoveredNode(null); };

    const handleNodeMouseDown = (nodeId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDragging({ nodeId });
    };

    const handleNodeClick = (nodeId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    };

    const openEntityDossier = (node: LayoutNode) => {
        openWindow({
            type: 'entity-dossier',
            title: `${node.name}  DOSSIER`,
            props: {
                key: `entity-${universeId}-${node.slug}`,
                universeId,
                entitySlug: node.slug,
            },
        });
    };

    // Empty state
    if (nodes.length === 0) {
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
            <div className="flex items-center justify-between border-b border-(--arc-border) bg-(--arc-surface-alt) px-4 py-2">
                <div className="flex items-center gap-2">
                    <Network className="size-4 text-(--arc-accent)" />
                    <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-(--arc-accent)">
                        CONNECTION ANALYSIS
                    </span>
                    <div className="relative ml-2">
                        <Search className="absolute left-1.5 top-1/2 size-2.5 -translate-y-1/2 text-(--arc-text-muted)" />
                        <input
                            type="text"
                            value={nodeFilter}
                            onChange={(e) => setNodeFilter(e.target.value)}
                            placeholder="Filter nodes…"
                            className="h-6 rounded border border-(--arc-border) bg-(--arc-surface) pl-5 pr-2 font-mono text-[9px] text-(--arc-text) placeholder:text-(--arc-text-muted) focus:border-(--arc-accent) focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRelayout}
                        className="mr-1 flex size-7 items-center justify-center rounded border border-(--arc-border) text-(--arc-text-muted) hover:bg-(--arc-surface-hover) hover:text-(--arc-text)"
                        title="Re-run layout"
                    >
                        <RotateCcw className="size-3.5" />
                    </button>
                    {availableStatuses.length > 1 && (
                        <div className="mr-2 flex items-center gap-1">
                            <Filter className="size-3 text-(--arc-text-muted)" />
                            {['all', ...availableStatuses].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={cn(
                                        'font-mono rounded px-1.5 py-0.5 text-[8px] tracking-wider transition-colors',
                                        filterStatus === s
                                            ? 'bg-(--arc-accent) text-white'
                                            : 'text-(--arc-text-muted) hover:text-(--arc-text)',
                                    )}
                                >
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                    <span className="font-mono mr-2 text-[9px] text-(--arc-text-muted)">
                        {nodes.length} NODES · {visibleEdges.length} LINKS
                    </span>
                    <button
                        onClick={handleZoomOut}
                        className="flex size-7 items-center justify-center rounded border border-(--arc-border) text-(--arc-text-muted) hover:bg-(--arc-surface-hover) hover:text-(--arc-text)"
                        title="Zoom out"
                    >
                        <ZoomOut className="size-3.5" />
                    </button>
                    <span className="font-mono w-10 text-center text-[9px] text-(--arc-text-muted)">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="flex size-7 items-center justify-center rounded border border-(--arc-border) text-(--arc-text-muted) hover:bg-(--arc-surface-hover) hover:text-(--arc-text)"
                        title="Zoom in"
                    >
                        <ZoomIn className="size-3.5" />
                    </button>
                    <button
                        onClick={handleResetView}
                        className="ml-1 flex size-7 items-center justify-center rounded border border-(--arc-border) text-(--arc-text-muted) hover:bg-(--arc-surface-hover) hover:text-(--arc-text)"
                        title="Reset view"
                    >
                        <Maximize2 className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Canvas + side panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Graph canvas */}
                <div className="relative flex-1 overflow-hidden bg-(--arc-bg)">
                    <svg
                        ref={svgRef}
                        className="size-full cursor-grab active:cursor-grabbing"
                        onMouseDown={handleSvgMouseDown}
                        onMouseMove={handleSvgMouseMove}
                        onMouseUp={handleSvgMouseUp}
                        onMouseLeave={handleSvgMouseUp}
                        onWheel={handleWheel}
                    >
                        <defs>
                            <pattern id="scw-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path
                                    d="M 40 0 L 0 0 0 40"
                                    fill="none"
                                    stroke="var(--arc-border)"
                                    strokeWidth="0.5"
                                    strokeOpacity="0.3"
                                />
                            </pattern>
                            <marker id="scw-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-accent)" opacity="0.7" />
                            </marker>
                            <marker id="scw-arrow-hi" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-accent)" />
                            </marker>
                            <filter id="scw-glow" x="-60%" y="-60%" width="220%" height="220%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <rect width="100%" height="100%" fill="url(#scw-grid)" />

                        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                            {/* Edges */}
                            {visibleEdges.map((edge) => {
                                const source = nodeById.get(edge.from);
                                const target = nodeById.get(edge.to);
                                if (!source || !target) return null;

                                const isHighlighted =
                                    hoveredNode === edge.from || hoveredNode === edge.to ||
                                    selectedNode === edge.from || selectedNode === edge.to;
                                const isDimmed =
                                    connectedIds !== null &&
                                    !connectedIds.has(edge.from) &&
                                    !connectedIds.has(edge.to);

                                const sourceR = source.isPrimary ? 26 : 18 + Math.min(source.relationCount * 1.5, 8);
                                const targetR = target.isPrimary ? 26 : 18 + Math.min(target.relationCount * 1.5, 8);
                                const rawDx = target.x - source.x;
                                const rawDy = target.y - source.y;
                                const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1;
                                const x1 = source.x + (rawDx / rawDist) * sourceR;
                                const y1 = source.y + (rawDy / rawDist) * sourceR;
                                const x2 = target.x - (rawDx / rawDist) * (targetR + 6);
                                const y2 = target.y - (rawDy / rawDist) * (targetR + 6);

                                const midX = (x1 + x2) / 2;
                                const midY = (y1 + y2) / 2;
                                const edgeDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
                                const curve = Math.min(edgeDist * 0.12, 45);
                                const perpX = -(y2 - y1) / edgeDist;
                                const perpY = (x2 - x1) / edgeDist;
                                const ctrlX = midX + perpX * curve;
                                const ctrlY = midY + perpY * curve;

                                const rectW = edge.label.length * 5.4 + 6;

                                return (
                                    <g
                                        key={edge.id}
                                        opacity={isDimmed ? 0.1 : 1}
                                        style={{ transition: 'opacity 200ms' }}
                                    >
                                        <path
                                            d={`M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`}
                                            fill="none"
                                            stroke="var(--arc-accent)"
                                            strokeWidth={isHighlighted ? 2 : 1}
                                            strokeOpacity={isHighlighted ? 0.9 : 0.35}
                                            markerEnd={isHighlighted ? 'url(#scw-arrow-hi)' : 'url(#scw-arrow)'}
                                        />
                                        {isHighlighted && (
                                            <g>
                                                <rect
                                                    x={ctrlX - rectW / 2}
                                                    y={ctrlY - 11}
                                                    width={rectW}
                                                    height={12}
                                                    rx="2"
                                                    fill="var(--arc-surface)"
                                                    stroke="var(--arc-accent)"
                                                    strokeWidth="0.5"
                                                    opacity="0.95"
                                                />
                                                <text
                                                    x={ctrlX}
                                                    y={ctrlY}
                                                    textAnchor="middle"
                                                    fontSize="8"
                                                    fontFamily="monospace"
                                                    fill="var(--arc-accent)"
                                                    fontWeight="600"
                                                >
                                                    {edge.label.length > 20 ? edge.label.slice(0, 18) + '…' : edge.label}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Nodes */}
                            {nodes.map((node) => {
                                const isHovered = hoveredNode === node.id;
                                const isSelected = selectedNode === node.id;
                                const isDimmed =
                                    !isSelected && (
                                        (connectedIds !== null && !connectedIds.has(node.id)) ||
                                        (filteredNodeIds !== null && !filteredNodeIds.has(node.id))
                                    );
                                const r = node.isPrimary ? 26 : 18 + Math.min(node.relationCount * 1.5, 8);
                                const borderColor = node.typeColor ?? 'var(--arc-border)';
                                const fillColor = node.isPrimary
                                    ? (node.typeColor ?? 'var(--arc-accent)')
                                    : 'var(--arc-surface)';

                                return (
                                    <g
                                        key={node.id}
                                        className="graph-node cursor-pointer"
                                        transform={`translate(${node.x}, ${node.y})`}
                                        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                                        onMouseEnter={() => setHoveredNode(node.id)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        onClick={(e) => handleNodeClick(node.id, e)}
                                        onDoubleClick={() => openEntityDossier(node)}
                                        opacity={isDimmed ? 0.18 : 1}
                                        style={{ transition: 'opacity 200ms' }}
                                    >
                                        {/* Ambient glow for primary / selected */}
                                        {(node.isPrimary || isSelected) && (
                                            <circle
                                                r={r + 10}
                                                fill={borderColor}
                                                opacity={node.isPrimary ? 0.12 : 0.1}
                                                filter="url(#scw-glow)"
                                            />
                                        )}
                                        {/* Outer ring for primary nodes */}
                                        {node.isPrimary && (
                                            <circle
                                                r={r + 9}
                                                fill="none"
                                                stroke="var(--arc-accent)"
                                                strokeWidth="1"
                                                opacity="0.2"
                                            />
                                        )}
                                        {/* Dashed selection ring */}
                                        {isSelected && (
                                            <circle
                                                r={r + 5}
                                                fill="none"
                                                stroke={borderColor}
                                                strokeWidth="1.5"
                                                strokeDasharray="4 2"
                                                opacity="0.85"
                                            />
                                        )}
                                        {/* Drop shadow */}
                                        <circle r={r + 2} fill="black" opacity={0.08} transform="translate(2,2)" />
                                        {/* Main circle */}
                                        <circle
                                            r={r}
                                            fill={fillColor}
                                            stroke={isHovered || isSelected ? 'var(--arc-accent)' : borderColor}
                                            strokeWidth={node.isPrimary || isHovered || isSelected ? 2.5 : 1.5}
                                            filter={node.isPrimary ? 'url(#scw-glow)' : undefined}
                                        />
                                        {/* Profile image or initials */}
                                        {node.imageUrl ? (
                                            <>
                                                <defs>
                                                    <clipPath id={`scw-img-clip-${node.id}`}>
                                                        <circle r={r - 2} />
                                                    </clipPath>
                                                </defs>
                                                <image
                                                    x={-(r - 2)}
                                                    y={-(r - 2)}
                                                    width={(r - 2) * 2}
                                                    height={(r - 2) * 2}
                                                    href={node.imageUrl}
                                                    clipPath={`url(#scw-img-clip-${node.id})`}
                                                    preserveAspectRatio="xMidYMid slice"
                                                />
                                            </>
                                        ) : (
                                            <text
                                                textAnchor="middle"
                                                dy="4"
                                                fontSize={node.isPrimary ? 11 : 9}
                                                fontWeight="700"
                                                fontFamily="monospace"
                                                className="pointer-events-none uppercase"
                                                fill={node.isPrimary ? 'white' : 'var(--arc-text)'}
                                            >
                                                {node.icon?.slice(0, 2) ?? node.name.slice(0, 2)}
                                            </text>
                                        )}
                                        {/* Name label */}
                                        <text
                                            textAnchor="middle"
                                            y={r + 14}
                                            fontSize="9"
                                            fontWeight={isHovered || isSelected ? '600' : '400'}
                                            className="pointer-events-none"
                                            fill={isHovered || isSelected ? 'var(--arc-accent)' : 'var(--arc-text)'}
                                        >
                                            {node.name.length > 14 ? node.name.slice(0, 14) + '…' : node.name}
                                        </text>
                                        {/* Type sub-label */}
                                        {node.typeName && (
                                            <text
                                                textAnchor="middle"
                                                y={r + 24}
                                                fontSize="7"
                                                fontFamily="monospace"
                                                className="pointer-events-none uppercase"
                                                fill="var(--arc-text-muted)"
                                                opacity="0.65"
                                            >
                                                {node.typeName}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    </svg>

                    {/* Hover tooltip */}
                    {tooltipNode && mousePos && (
                        <div
                            className="pointer-events-none absolute z-20 min-w-32.5 max-w-50 rounded border border-(--arc-border) bg-(--arc-surface) p-2 shadow-lg"
                            style={{
                                left: mousePos.x + 14,
                                top: Math.max(8, mousePos.y - 14),
                            }}
                        >
                            <p className="text-[11px] font-semibold leading-tight text-(--arc-text)">{tooltipNode.name}</p>
                            {tooltipNode.typeName && (
                                <p className="font-mono mt-0.5 text-[8px] uppercase text-(--arc-text-muted)">{tooltipNode.typeName}</p>
                            )}
                            <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="font-mono text-[8px] text-(--arc-accent)">
                                    {visibleEdges.filter((e) => e.from === tooltipNode.id || e.to === tooltipNode.id).length} LINK(S)
                                </span>
                                {tooltipNode.isPrimary && (
                                    <span className="rounded-sm bg-(--arc-accent)/10 px-1 py-px font-mono text-[7px] font-bold uppercase text-(--arc-accent)">
                                        PRIMARY
                                    </span>
                                )}
                            </div>
                            <p className="font-mono mt-1 text-[7px] text-(--arc-text-muted) opacity-60">DOUBLE-CLICK TO OPEN</p>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="absolute bottom-3 left-3 rounded border border-(--arc-border) bg-(--arc-surface)/90 p-2 shadow backdrop-blur-sm">
                        <div className="font-mono mb-1.5 text-[8px] font-bold tracking-wider text-(--arc-text-muted)">
                            LEGEND
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <svg width="12" height="12" aria-hidden="true">
                                    <circle cx="6" cy="6" r="5" fill="none" stroke="var(--arc-accent)" strokeWidth="2" />
                                </svg>
                                <span className="text-[9px] text-(--arc-text-muted)">Primary Subject</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <svg width="12" height="12" aria-hidden="true">
                                    <circle cx="6" cy="6" r="4" fill="none" stroke="var(--arc-text-muted)" strokeWidth="1.5" />
                                </svg>
                                <span className="text-[9px] text-(--arc-text-muted)">Related</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-2 w-5 items-center gap-px">
                                    <div className="h-px flex-1 bg-(--arc-accent)" />
                                    <div
                                        className="size-0 border-y-[3px] border-l-[5px] border-y-transparent"
                                        style={{ borderLeftColor: 'var(--arc-accent)' }}
                                    />
                                </div>
                                <span className="text-[9px] text-(--arc-text-muted)">Connection</span>
                            </div>
                        </div>
                    </div>

                    {/* Hints */}
                    <div className="absolute bottom-3 right-3 rounded border border-(--arc-border) bg-(--arc-surface)/90 px-2 pb-1 backdrop-blur-sm">
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">
                            CLICK TO SELECT - DRAG NODE - SCROLL TO ZOOM - DOUBLE-CLICK TO OPEN
                        </span>
                    </div>
                </div>

                {/* Selection detail panel */}
                {selectedNodeData && (
                    <div className="w-56 shrink-0 overflow-y-auto border-l border-(--arc-border) bg-(--arc-surface-alt) p-3">
                        <div className="font-mono mb-2 text-[8px] font-bold tracking-wider text-(--arc-text-muted)">
                            SELECTED NODE
                        </div>
                        <div
                            className="mb-2 h-0.5 w-full rounded-full"
                            style={{ background: selectedNodeData.typeColor ?? 'var(--arc-border)' }}
                        />
                        <p className="mb-0.5 text-sm font-semibold text-(--arc-text)">
                            {selectedNodeData.name}
                        </p>
                        {selectedNodeData.typeName && (
                            <p className="font-mono mb-3 text-[9px] text-(--arc-text-muted)">
                                {selectedNodeData.typeName.toUpperCase()}
                            </p>
                        )}

                        <div className="font-mono mb-1 text-[8px] font-bold tracking-wider text-(--arc-text-muted)">
                            CONNECTIONS
                        </div>
                        <div className="space-y-1.5">
                            {visibleEdges
                                .filter((e) => e.from === selectedNodeData.id || e.to === selectedNodeData.id)
                                .map((e) => {
                                    const otherId = e.from === selectedNodeData.id ? e.to : e.from;
                                    const other = nodeById.get(otherId);
                                    return (
                                        <div key={e.id} className="flex items-start gap-1.5 text-[9px]">
                                            <span className="mt-0.5 shrink-0 font-bold text-(--arc-accent)">→</span>
                                            <div className="min-w-0">
                                                <span className="block truncate text-(--arc-text)">
                                                    {other?.name ?? `#${otherId}`}
                                                </span>
                                                <span className="font-mono block text-[8px] uppercase text-(--arc-accent)">
                                                    {e.label}
                                                    {e.status && e.status !== 'active' && (
                                                        <span className="ml-1 opacity-60">[{e.status}]</span>
                                                    )}
                                                </span>
                                                {e.description && (
                                                    <span className="mt-0.5 block text-[8px] text-(--arc-text-muted) opacity-70">
                                                        {e.description.length > 60
                                                            ? e.description.slice(0, 60) + '…'
                                                            : e.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Key connections involving this node */}
                        {keyConnections.filter(
                            (kc) => kc.from === selectedNodeData.name || kc.to === selectedNodeData.name,
                        ).length > 0 && (
                            <>
                                <div className="font-mono mb-1 mt-3 text-[8px] font-bold tracking-wider text-(--arc-accent)">
                                    KEY CONNECTIONS
                                </div>
                                <div className="space-y-1">
                                    {keyConnections
                                        .filter(
                                            (kc) =>
                                                kc.from === selectedNodeData.name ||
                                                kc.to === selectedNodeData.name,
                                        )
                                        .map((kc, i) => (
                                            <div
                                                key={i}
                                                className="relative overflow-hidden rounded border border-(--arc-border) p-1.5"
                                            >
                                                <div className="absolute left-0 top-0 h-full w-0.5 bg-(--arc-accent) opacity-40" />
                                                <div className="pl-2">
                                                    <span className="font-mono text-[7px] font-bold uppercase text-(--arc-accent)">{kc.type}</span>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px]">
                                                        <button type="button" onClick={() => handleSelectNodeByName(kc.from)} className="font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline">{kc.from}</button>
                                                        <span className="text-(--arc-text-muted)">→</span>
                                                        <button type="button" onClick={() => handleSelectNodeByName(kc.to)} className="font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline">{kc.to}</button>
                                                    </div>
                                                    {(kc.description ?? kc.context) && (
                                                        <p className="mt-0.5 text-[8px] text-(--arc-text-muted)">{kc.description ?? kc.context}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => handleCenterNode(selectedNodeData)}
                            className="font-mono mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-(--arc-border) px-2 py-1.5 text-[8px] tracking-wider text-(--arc-text-muted) transition-colors hover:bg-(--arc-surface-hover) hover:text-(--arc-text)"
                        >
                            <Locate className="size-3" />
                            CENTER IN GRAPH
                        </button>
                        <button
                            onClick={() => openEntityDossier(selectedNodeData)}
                            className="font-mono mt-2 w-full rounded border border-(--arc-accent) px-2 py-1.5 text-[8px] tracking-wider text-(--arc-accent) transition-colors hover:bg-(--arc-accent) hover:text-white"
                        >
                            OPEN DOSSIER
                        </button>
                    </div>
                )}
            </div>

            {/* Key connections section */}
            {keyConnections.length > 0 && (
                <div className="max-h-44 overflow-y-auto border-t border-(--arc-border) bg-(--arc-surface-alt)">
                    <div className="sticky top-0 flex items-center gap-2 border-b border-(--arc-border) bg-(--arc-surface-alt) px-3 py-1.5">
                        <span className="font-mono text-[9px] font-bold tracking-[0.15em] text-(--arc-accent)">
                            KEY CONNECTIONS
                        </span>
                        <div className="h-px flex-1 bg-(--arc-border)" />
                        <span className="font-mono text-[8px] text-(--arc-text-muted)">
                            {keyConnections.length}
                        </span>
                    </div>
                    <div className="space-y-1.5 p-3">
                        {keyConnections.map((conn, i) => (
                            <div
                                key={i}
                                className="group relative overflow-hidden rounded border border-(--arc-border) bg-(--arc-surface) p-2 transition-colors hover:border-(--arc-accent)/40"
                            >
                                <div className="absolute left-0 top-0 h-full w-0.5 bg-(--arc-accent) opacity-40 transition-opacity group-hover:opacity-90" />
                                <div className="flex flex-wrap items-center gap-1.5 pl-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectNodeByName(conn.from)}
                                        className="text-[11px] font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline"
                                    >
                                        {conn.from}
                                    </button>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <div className="h-px w-3 bg-(--arc-accent) opacity-50" />
                                        <span className="rounded-sm bg-(--arc-accent)/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-(--arc-accent)">
                                            {conn.type.toUpperCase()}
                                        </span>
                                        <div className="h-px w-3 bg-(--arc-accent) opacity-50" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectNodeByName(conn.to)}
                                        className="text-[11px] font-semibold text-(--arc-text) hover:text-(--arc-accent) hover:underline"
                                    >
                                        {conn.to}
                                    </button>
                                </div>
                                {(conn.description || conn.context) && (
                                    <p className="mt-1.5 pl-2 text-[10px] leading-relaxed text-(--arc-text-muted)">
                                        {conn.description ?? conn.context}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
