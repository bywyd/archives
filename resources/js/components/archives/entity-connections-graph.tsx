import { AlertCircle, Compass, Filter, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/window-store';
import type {
    ApiEntityGraph,
    ApiGraphIncomingRelation,
    ApiGraphOutgoingRelation,
} from '@/types/api';

type Props = {
    universeId: number;
    entitySlug: string;
};

type GraphNode = {
    id: number;
    slug: string;
    name: string;
    typeName: string | null;
    typeColor: string | null;
    typeIcon: string | null;
    imageUrl: string | null;
    isCenter: boolean;
    relationCount: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
};

type GraphEdge = {
    id: string;
    source: number;
    target: number;
    label: string;
    direction: 'outgoing' | 'incoming';
    status: 'active' | 'former' | 'unknown' | null;
    description: string | null;
};

function runForceSimulation(nodes: GraphNode[], edges: GraphEdge[], iterations = 200): GraphNode[] {
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
                if (!sim[i].isCenter) { sim[i].vx -= fx; sim[i].vy -= fy; }
                if (!sim[j].isCenter) { sim[j].vx += fx; sim[j].vy += fy; }
            }
        }

        // Spring attraction along edges toward ideal distance
        for (const edge of edges) {
            const s = sim.find((n) => n.id === edge.source);
            const t = sim.find((n) => n.id === edge.target);
            if (!s || !t) continue;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = 220;
            const spring = (dist - idealDist) * 0.04 * alpha;
            if (!s.isCenter) { s.vx += (dx / dist) * spring; s.vy += (dy / dist) * spring; }
            if (!t.isCenter) { t.vx -= (dx / dist) * spring; t.vy -= (dy / dist) * spring; }
        }

        // Weak gravity toward center to keep nodes from drifting off-screen
        const cx = 400, cy = 300;
        for (const n of sim) {
            if (n.isCenter) continue;
            n.vx += (cx - n.x) * 0.006 * alpha;
            n.vy += (cy - n.y) * 0.006 * alpha;
        }

        // Apply velocity with damping
        for (const n of sim) {
            if (n.isCenter) continue;
            n.vx *= 0.72;
            n.vy *= 0.72;
            n.x += n.vx;
            n.y += n.vy;
        }
    }

    return sim;
}

export function EntityConnectionsGraph({ universeId, entitySlug }: Props) {
    const [graphData, setGraphData] = useState<ApiEntityGraph | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState<{ nodeId: number } | null>(null);
    const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);
    const [selectedNode, setSelectedNode] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const svgRef = useRef<SVGSVGElement>(null);
    const { openWindow } = useWindowStore();

    //  Fetch optimized graph payload 
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSelectedNode(null);
        setGraphData(null);

        api.fetchEntityGraph(universeId, entitySlug)
            .then((res) => {
                if (cancelled) return;
                setGraphData(res.data);
                buildGraph(res.data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Failed to load graph');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [universeId, entitySlug]);

    const buildGraph = useCallback((data: ApiEntityGraph) => {
        const nodeMap = new Map<number, GraphNode>();
        const edgeList: GraphEdge[] = [];
        const CX = 400;
        const CY = 300;

        nodeMap.set(data.id, {
            id: data.id,
            slug: data.slug,
            name: data.name,
            typeName: data.entity_type?.name ?? null,
            typeColor: data.entity_type?.color ?? null,
            typeIcon: data.entity_type?.icon ?? null,
            imageUrl: data.profile_image_url ?? null,
            isCenter: true,
            relationCount:
                (data.outgoing_relations?.length ?? 0) + (data.incoming_relations?.length ?? 0),
            x: CX,
            y: CY,
            vx: 0,
            vy: 0,
        });

        type AnyRel =
            | { rel: ApiGraphOutgoingRelation; dir: 'outgoing' }
            | { rel: ApiGraphIncomingRelation; dir: 'incoming' };

        const allRels: AnyRel[] = [
            ...(data.outgoing_relations ?? []).map((r) => ({ rel: r, dir: 'outgoing' as const })),
            ...(data.incoming_relations ?? []).map((r) => ({ rel: r, dir: 'incoming' as const })),
        ];

        const uniqueIds = new Set(
            allRels.map(({ rel, dir }) =>
                dir === 'outgoing'
                    ? (rel as ApiGraphOutgoingRelation).to_entity.id
                    : (rel as ApiGraphIncomingRelation).from_entity.id,
            ),
        );
        const radius = Math.max(200, uniqueIds.size * 30);
        const angleStep = (2 * Math.PI) / Math.max(allRels.length, 1);

        allRels.forEach(({ rel, dir }, idx) => {
            const related =
                dir === 'outgoing'
                    ? (rel as ApiGraphOutgoingRelation).to_entity
                    : (rel as ApiGraphIncomingRelation).from_entity;
            const angle = angleStep * idx - Math.PI / 2;

            if (!nodeMap.has(related.id)) {
                nodeMap.set(related.id, {
                    id: related.id,
                    slug: related.slug,
                    name: related.name,
                    typeName: related.entity_type?.name ?? null,
                    typeColor: related.entity_type?.color ?? null,
                    typeIcon: related.entity_type?.icon ?? null,
                    imageUrl: related.profile_image_url ?? null,
                    isCenter: false,
                    relationCount: 1,
                    x: CX + Math.cos(angle) * radius,
                    y: CY + Math.sin(angle) * radius,
                    vx: 0,
                    vy: 0,
                });
            } else {
                const existing = nodeMap.get(related.id)!;
                if (!existing.isCenter) {
                    nodeMap.set(related.id, { ...existing, relationCount: existing.relationCount + 1 });
                }
            }

            const rt = rel.relation_type;
            const label =
                dir === 'outgoing'
                    ? (rt?.name ?? 'Related')
                    : (rt?.inverse_name ?? rt?.name ?? 'Related');

            edgeList.push({
                id: `${dir}-${rel.id}`,
                source: dir === 'outgoing' ? data.id : related.id,
                target: dir === 'outgoing' ? related.id : data.id,
                label,
                direction: dir,
                status: rel.status,
                description: rel.description,
            });
        });

        const finalNodes = runForceSimulation(Array.from(nodeMap.values()), edgeList);
        setNodes(finalNodes);
        setEdges(edgeList);
    }, []);

    //  Filtered edges by relation status 
    const visibleEdges = useMemo(() => {
        if (filterStatus === 'all') return edges;
        return edges.filter((e) => e.status === filterStatus);
    }, [edges, filterStatus]);

    //  IDs reachable from the selected node 
    const connectedIds = useMemo((): Set<number> | null => {
        if (!selectedNode) return null;
        const ids = new Set<number>([selectedNode]);
        for (const e of visibleEdges) {
            if (e.source === selectedNode || e.target === selectedNode) {
                ids.add(e.source);
                ids.add(e.target);
            }
        }
        return ids;
    }, [selectedNode, visibleEdges]);

    const selectedNodeData = useMemo(
        () => (selectedNode ? nodes.find((n) => n.id === selectedNode) : null),
        [selectedNode, nodes],
    );

    const availableStatuses = useMemo(() => {
        const s = new Set<string>();
        for (const e of edges) {
            if (e.status) s.add(e.status);
        }
        return Array.from(s);
    }, [edges]);

    //  Controls 
    const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 4));
    const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.2));
    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom((z) => Math.min(Math.max(z * factor, 0.2), 4));
    };

    const handleSvgMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as Element).closest('.graph-node')) return;
        setSelectedNode(null);
        setPanning({
            startX: e.clientX,
            startY: e.clientY,
            startPanX: pan.x,
            startPanY: pan.y,
        });
    };

    const handleSvgMouseMove = (e: React.MouseEvent) => {
        if (panning) {
            setPan({
                x: panning.startPanX + (e.clientX - panning.startX),
                y: panning.startPanY + (e.clientY - panning.startY),
            });
        }
        if (dragging) {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = (e.clientX - rect.left - pan.x) / zoom;
            const y = (e.clientY - rect.top - pan.y) / zoom;
            setNodes((prev) => prev.map((n) => (n.id === dragging.nodeId ? { ...n, x, y } : n)));
        }
    };

    const handleSvgMouseUp = () => {
        setPanning(null);
        setDragging(null);
    };

    const handleNodeMouseDown = (nodeId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDragging({ nodeId });
    };

    const handleNodeClick = (nodeId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    };

    const openEntityDossier = (node: GraphNode) => {
        openWindow({
            type: 'entity-dossier',
            title: `${node.name}  DOSSIER`,
            icon: node.typeIcon ?? 'EN',
            props: {
                key: `entity-${universeId}-${node.slug}`,
                universeId,
                entitySlug: node.slug,
            },
        });
    };

    if (loading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <Loader2 className="size-6 animate-spin text-[var(--arc-accent)]" />
                <span className="arc-mono text-[10px] tracking-widest text-[var(--arc-text-muted)]">
                    BUILDING CONNECTION GRAPH...
                </span>
            </div>
        );
    }

    if (error || !graphData) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="size-8 text-[var(--arc-danger)]" />
                <span className="text-sm text-[var(--arc-danger)]">{error || 'Entity not found'}</span>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/*  Header  */}
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Compass className="size-4 text-[var(--arc-accent)]" />
                    <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                        CONNECTIONS GRAPH
                    </span>
                    <span className="arc-mono text-[9px] text-[var(--arc-text-muted)]">
                         {graphData.name}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Status filter chips  only when multiple statuses present */}
                    {availableStatuses.length > 1 && (
                        <div className="mr-2 flex items-center gap-1">
                            <Filter className="size-3 text-[var(--arc-text-muted)]" />
                            {['all', ...availableStatuses].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={cn(
                                        'arc-mono rounded px-1.5 py-0.5 text-[8px] tracking-wider transition-colors',
                                        filterStatus === s
                                            ? 'bg-[var(--arc-accent)] text-white'
                                            : 'text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]',
                                    )}
                                >
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                    <span className="arc-mono mr-2 text-[9px] text-[var(--arc-text-muted)]">
                        {nodes.length} NODES · {visibleEdges.length} LINKS
                    </span>
                    <button
                        onClick={handleZoomOut}
                        className="flex size-7 items-center justify-center rounded border border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                        title="Zoom out"
                    >
                        <ZoomOut className="size-3.5" />
                    </button>
                    <span className="arc-mono w-10 text-center text-[9px] text-[var(--arc-text-muted)]">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="flex size-7 items-center justify-center rounded border border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                        title="Zoom in"
                    >
                        <ZoomIn className="size-3.5" />
                    </button>
                    <button
                        onClick={handleResetView}
                        className="ml-1 flex size-7 items-center justify-center rounded border border-[var(--arc-border)] text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)] hover:text-[var(--arc-text)]"
                        title="Reset view"
                    >
                        <Maximize2 className="size-3.5" />
                    </button>
                </div>
            </div>

            {/*  Canvas + selection panel  */}
            <div className="flex flex-1 overflow-hidden">
                {/* Graph canvas */}
                <div className="relative flex-1 overflow-hidden bg-[var(--arc-bg)]">
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
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path
                                    d="M 40 0 L 0 0 0 40"
                                    fill="none"
                                    stroke="var(--arc-border)"
                                    strokeWidth="0.5"
                                    strokeOpacity="0.3"
                                />
                            </pattern>
                            {/* Outgoing = accent, incoming = warning */}
                            <marker id="arrow-out" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-accent)" opacity="0.7" />
                            </marker>
                            <marker id="arrow-in" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-warning)" opacity="0.7" />
                            </marker>
                            <marker id="arrow-out-hi" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-accent)" />
                            </marker>
                            <marker id="arrow-in-hi" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--arc-warning)" />
                            </marker>
                            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <rect width="100%" height="100%" fill="url(#grid)" />

                        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                            {/*  Edges  */}
                            {visibleEdges.map((edge) => {
                                const source = nodes.find((n) => n.id === edge.source);
                                const target = nodes.find((n) => n.id === edge.target);
                                if (!source || !target) return null;

                                const isHighlighted =
                                    hoveredNode === source.id || hoveredNode === target.id ||
                                    selectedNode === source.id || selectedNode === target.id;
                                const isDimmed =
                                    connectedIds !== null &&
                                    !connectedIds.has(edge.source) &&
                                    !connectedIds.has(edge.target);

                                const sourceR = source.isCenter ? 26 : 18 + Math.min(source.relationCount * 1.5, 8);
                                const targetR = target.isCenter ? 26 : 18 + Math.min(target.relationCount * 1.5, 8);
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

                                const edgeColor =
                                    edge.direction === 'outgoing' ? 'var(--arc-accent)' : 'var(--arc-warning)';
                                const markerId =
                                    edge.direction === 'outgoing'
                                        ? isHighlighted ? 'url(#arrow-out-hi)' : 'url(#arrow-out)'
                                        : isHighlighted ? 'url(#arrow-in-hi)' : 'url(#arrow-in)';
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
                                            stroke={edgeColor}
                                            strokeWidth={isHighlighted ? 2 : 1}
                                            strokeOpacity={isHighlighted ? 0.9 : 0.35}
                                            markerEnd={markerId}
                                        />
                                        {/* Label pill  only on highlight */}
                                        {isHighlighted && (
                                            <g>
                                                <rect
                                                    x={ctrlX - rectW / 2}
                                                    y={ctrlY - 11}
                                                    width={rectW}
                                                    height={12}
                                                    rx="2"
                                                    fill="var(--arc-surface)"
                                                    stroke={edgeColor}
                                                    strokeWidth="0.5"
                                                    opacity="0.95"
                                                />
                                                <text
                                                    x={ctrlX}
                                                    y={ctrlY - 2}
                                                    textAnchor="middle"
                                                    fontSize="7"
                                                    fontFamily="monospace"
                                                    className="pointer-events-none uppercase"
                                                    fill={edgeColor}
                                                >
                                                    {edge.label}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}

                            {/*  Nodes  */}
                            {nodes.map((node) => {
                                const isHovered = hoveredNode === node.id;
                                const isSelected = selectedNode === node.id;
                                const isDimmed = connectedIds !== null && !connectedIds.has(node.id);
                                const r = node.isCenter ? 26 : 18 + Math.min(node.relationCount * 1.5, 8);
                                const borderColor = node.typeColor ?? 'var(--arc-border)';
                                const fillColor = node.isCenter
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
                                        {/* Ambient glow for centre/selected */}
                                        {(node.isCenter || isSelected) && (
                                            <circle
                                                r={r + 10}
                                                fill={borderColor}
                                                opacity={node.isCenter ? 0.12 : 0.1}
                                                filter="url(#glow)"
                                            />
                                        )}
                                        {/* Outer ring on centre node */}
                                        {node.isCenter && (
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
                                            strokeWidth={node.isCenter || isHovered || isSelected ? 2.5 : 1.5}
                                            filter={node.isCenter ? 'url(#glow)' : undefined}
                                        />
                                        {/* Profile image or type icon initials */}
                                        {node.imageUrl ? (
                                            <>
                                                <defs>
                                                    <clipPath id={`img-clip-${node.id}`}>
                                                        <circle r={r - 2} />
                                                    </clipPath>
                                                </defs>
                                                <image
                                                    x={-(r - 2)}
                                                    y={-(r - 2)}
                                                    width={(r - 2) * 2}
                                                    height={(r - 2) * 2}
                                                    href={node.imageUrl}
                                                    clipPath={`url(#img-clip-${node.id})`}
                                                    preserveAspectRatio="xMidYMid slice"
                                                />
                                            </>
                                        ) : (
                                            <text
                                                textAnchor="middle"
                                                dy="4"
                                                fontSize={node.isCenter ? 11 : 9}
                                                fontWeight="700"
                                                fontFamily="monospace"
                                                className="pointer-events-none uppercase"
                                                fill={node.isCenter ? 'white' : 'var(--arc-text)'}
                                            >
                                                {node.typeIcon?.slice(0, 2) ?? node.name.slice(0, 2)}
                                            </text>
                                        )}
                                        {/* Name */}
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

                    {/*  Legend  */}
                    <div className="absolute bottom-3 left-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]/90 p-2 shadow backdrop-blur-sm">
                        <div className="arc-mono mb-1.5 text-[8px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                            LEGEND
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="size-2.5 rounded-full"
                                    style={{ background: graphData.entity_type?.color ?? 'var(--arc-accent)' }}
                                />
                                <span className="text-[9px] text-[var(--arc-text-muted)]">Center Entity</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-2 w-5 items-center gap-px">
                                    <div className="h-px flex-1 bg-[var(--arc-accent)]" />
                                    <div
                                        className="size-0 border-y-[3px] border-l-[5px] border-y-transparent"
                                        style={{ borderLeftColor: 'var(--arc-accent)' }}
                                    />
                                </div>
                                <span className="text-[9px] text-[var(--arc-text-muted)]">Outgoing</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-2 w-5 items-center gap-px">
                                    <div className="h-px flex-1 bg-[var(--arc-warning)]" />
                                    <div
                                        className="size-0 border-y-[3px] border-l-[5px] border-y-transparent"
                                        style={{ borderLeftColor: 'var(--arc-warning)' }}
                                    />
                                </div>
                                <span className="text-[9px] text-[var(--arc-text-muted)]">Incoming</span>
                            </div>
                        </div>
                    </div>

                    {/*  Hints  */}
                    <div className="absolute bottom-3 right-3 rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]/90 px-2 py-1 backdrop-blur-sm">
                        <span className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                            CLICK TO SELECT · DRAG NODE · SCROLL TO ZOOM · DOUBLE-CLICK TO OPEN
                        </span>
                    </div>
                </div>

                {/*  Selection detail panel  */}
                {selectedNodeData && (
                    <div className="w-56 shrink-0 overflow-y-auto border-l border-[var(--arc-border)] bg-[var(--arc-surface-alt)] p-3">
                        <div className="arc-mono mb-2 text-[8px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                            SELECTED NODE
                        </div>
                        <div
                            className="mb-2 h-0.5 w-full rounded-full"
                            style={{ background: selectedNodeData.typeColor ?? 'var(--arc-border)' }}
                        />
                        <p className="mb-0.5 text-sm font-semibold text-[var(--arc-text)]">
                            {selectedNodeData.name}
                        </p>
                        {selectedNodeData.typeName && (
                            <p className="arc-mono mb-3 text-[9px] text-[var(--arc-text-muted)]">
                                {selectedNodeData.typeName.toUpperCase()}
                            </p>
                        )}

                        <div className="arc-mono mb-1 text-[8px] font-bold tracking-wider text-[var(--arc-text-muted)]">
                            CONNECTIONS
                        </div>
                        <div className="space-y-1.5">
                            {visibleEdges
                                .filter(
                                    (e) =>
                                        e.source === selectedNodeData.id ||
                                        e.target === selectedNodeData.id,
                                )
                                .map((e) => {
                                    const otherId = e.source === selectedNodeData.id ? e.target : e.source;
                                    const other = nodes.find((n) => n.id === otherId);
                                    const isOut = e.source === selectedNodeData.id;
                                    const edgeColor = isOut ? 'var(--arc-accent)' : 'var(--arc-warning)';
                                    return (
                                        <div key={e.id} className="flex items-start gap-1.5 text-[9px]">
                                            <span
                                                className="mt-0.5 shrink-0 font-bold"
                                                style={{ color: edgeColor }}
                                            >
                                                {isOut ? '→' : '←'}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="block truncate text-[var(--arc-text)]">
                                                    {other?.name ?? `#${otherId}`}
                                                </span>
                                                <span
                                                    className="arc-mono block text-[8px] uppercase"
                                                    style={{ color: edgeColor }}
                                                >
                                                    {e.label}
                                                    {e.status && e.status !== 'active' && (
                                                        <span className="ml-1 opacity-60">[{e.status}]</span>
                                                    )}
                                                </span>
                                                {e.description && (
                                                    <span className="mt-0.5 block text-[8px] text-[var(--arc-text-muted)] opacity-70">
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

                        <button
                            onClick={() => openEntityDossier(selectedNodeData)}
                            className="arc-mono mt-4 w-full rounded border border-[var(--arc-accent)] px-2 py-1.5 text-[8px] tracking-wider text-[var(--arc-accent)] transition-colors hover:bg-[var(--arc-accent)] hover:text-white"
                        >
                            OPEN DOSSIER
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
