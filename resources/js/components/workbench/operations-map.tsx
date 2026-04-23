import { useEffect, useRef, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import * as api from '@/lib/api';
import { useWindowStore } from '@/stores/window-store';
import { useArchive } from '@/contexts/archive-context';
import { useHistoryStore } from '@/stores/history-store';
import { useUniverseTheme } from '@/hooks/use-universe-theme';
import type { Auth } from '@/types/auth';
import type { ApiEntityLocation, ApiUniverse, ApiEntitySummary, ApiMapRecentEvent } from '@/types/api';
import type { PinnedItem, HistoryEntry } from '@/stores/history-store';
import AppLogoIcon from '../app-logo-icon';
import { Brain, Clock, Github, LogIn, Pin, RefreshCw, ScrollIcon, Search, UserPlus, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Classified intelligence terminal world map  workbench background.
 * Renders universe theater markers, entity location pins, and
 * interactive dossier access on click.
 */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const TOOLTIP_WIDTH  = 260;
const HIDE_DELAY_UNI = 150;
const HIDE_DELAY_PIN = 180;
const HIDE_DELAY_TIP = 100;

//  Event type → indicator color
const EVENT_TYPE_COLORS: Record<string, string> = {
    incident:    '#dc2626',
    discovery:   '#7c3aed',
    founding:    '#059669',
    death:       '#991b1b',
    battle:      '#ea580c',
    outbreak:    '#d97706',
    political:   '#2563eb',
    research:    '#0891b2',
    deployment:  '#16a34a',
    other:       '#64748b',
};

//  Severity → color
const SEVERITY_COLORS: Record<string, string> = {
    low:                '#64748b',
    medium:             '#d97706',
    high:               '#dc2626',
    critical:           '#991b1b',
    'extinction-level': '#7f1d1d',
};

//  Entity status → indicator color 
const STATUS_COLORS: Record<string, string> = {
    alive:      '#059669',
    deceased:   '#dc2626',
    infected:   '#f97316',
    active:     '#2563eb',
    inactive:   '#94a3b8',
    destroyed:  '#b91c1c',
    contained:  '#0891b2',
    classified: '#1e40af',
    unknown:    '#64748b',
};

const DARK_PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(15,23,42,0.92)',
    border: '1px solid rgba(37,99,235,0.25)',
    borderLeftWidth: '3px',
    borderLeftColor: 'rgba(37,99,235,0.5)',
    // boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 40px rgba(37,99,235,0.08)',
};

function statusColor(slug?: string | null): string {
    return STATUS_COLORS[slug ?? ''] ?? '#64748b';
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'NOW';
    if (mins < 60) return `${mins}M`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}H`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}D`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

// Real-world coordinate anchors [lng, lat] for universe marker placement
const GEO_ANCHORS: [number, number][] = [
    [-74.0,  40.7],   // New York
    [-87.6,  41.8],   // Chicago
    [  2.35, 48.85],  // Paris
    [ 13.4,  52.5],   // Berlin
    [ 37.6,  55.75],  // Moscow
    [139.7,  35.7],   // Tokyo
    [121.5,  31.2],   // Shanghai
    [103.8,   1.35],  // Singapore
    [  3.4,   6.45],  // Lagos
    [ 28.0, -26.2],   // Johannesburg
    [-46.6, -23.5],   // São Paulo
    [-99.1,  19.4],   // Mexico City
    [151.2, -33.9],   // Sydney
    [ 55.3,  25.2],   // Dubai
    [ 10.75, 59.9],   // Oslo
    [  2.15, 41.4],   // Barcelona
];

type UniverseMarker = {
    id: string;
    label: string;
    slug: string;
    coordinates: [number, number];
    type: 'primary' | 'secondary';
    universeId: number;
    count?: number;
};

type UniverseHoverState = {
    marker: UniverseMarker;
    universe: ApiUniverse;
    x: number;
    y: number;
};

type EntityPin = {
    id: number;
    universeId: number;
    name: string;
    slug: string;
    shortDescription: string | null;
    entityType: string | null;
    entityTypeSlug: string | null;
    entityStatus: string | null;
    entityStatusSlug: string | null;
    coordinates: [number, number]; // [lng, lat]
};

type EntityHoverState = {
    pin: EntityPin;
    x: number;
    y: number;
};



//  Utilities 

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

function buildUniverseMarkers(universes: ApiUniverse[]): { markers: UniverseMarker[]; connections: [string, string][] } {
    if (universes.length === 0) return { markers: [], connections: [] };

    const anchors = [...GEO_ANCHORS];
    const markers: UniverseMarker[] = universes.slice(0, anchors.length).map((u, i) => ({
        id: String(u.id),
        label: u.name.substring(0, 12).toUpperCase(),
        slug: u.slug,
        coordinates: anchors[i],
        type: i === 0 ? 'primary' : 'secondary',
        universeId: u.id,
        count: u.entities_count ?? undefined,
    }));

    const rng = seededRandom(universes.length * 7 + 42);
    const connections: [string, string][] = [];
    for (let i = 1; i < markers.length; i++) {
        if (rng() > 0.45) connections.push([markers[0].id, markers[i].id]);
    }
    for (let i = 1; i < markers.length - 1; i++) {
        if (rng() > 0.6) connections.push([markers[i].id, markers[i + 1].id]);
    }

    return { markers, connections };
}

//  HUD sub-components 


function BrandBlock() {
    const { currentUniverse } = useArchive();
    const { iconUrl } = useUniverseTheme(currentUniverse);

    return (
        <div className="absolute left-5 top-8 z-20 flex items-center gap-3 pointer-events-none select-none">
            {iconUrl ? (
                <img
                    src={iconUrl}
                    alt=""
                    className="size-16 object-contain"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.35))' }}
                />
            ) : (
                <AppLogoIcon className='size-16 text-blue-600/80' />
            )}
            <div className="flex flex-col gap-0.5">
                <span className="font-extrabold text-3xl tracking-[0.2em] text-blue-600/80 uppercase">
                    {currentUniverse ? currentUniverse.name : 'Archives'}
                </span>
                <span className="text-[10px] font-mono tracking-widest text-sky-600">
                    {currentUniverse ? 'Intelligence Database' : 'An Intelligence Network Database'}
                </span>
            </div>
        </div>
    );
}

type OperatorPanelProps = { user: Auth['user'] | undefined; onLogin: () => void };
function OperatorPanel({ user, onLogin }: OperatorPanelProps) {
    // const sessionIdRef = useRef(Math.random().toString(36).slice(2, 10).toUpperCase());
    // const sessionId = sessionIdRef.current;

    const rows: [string, string][] = [
        ...(user ? [
            ['CODENAME', user?.agent_codename ?? ''],
            ['CLEARANCE', user?.clearance_level ?? ''],
            ['DIVISION', user?.department ?? ''],
            ['RANK', user?.rank ?? ''],
        ] : [
            ['CLEARANCE', 'UNAUTHORIZED'],
        ]) as [string,string][],
        // ['SESSION', sessionId],
    ];

    return (
        <div
            className="select-none"
            style={{ ...DARK_PANEL_STYLE, pointerEvents: user ? 'none' : 'auto' }}
        >
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                <span className="text-[10px] font-mono tracking-widest uppercase text-blue-400/70">Operator</span>
                <span
                    className="ml-auto inline-block w-2 h-2 rounded-full"
                    style={user
                        ? { background: 'rgba(34,197,94,0.70)', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }
                        : { background: 'rgba(239,68,68,0.70)', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }
                    }
                />
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-1">
                {rows.map(([label, val]) => (
                    <div key={label} className="flex items-baseline justify-between gap-2">
                        <span className="text-[9px] font-mono tracking-widest uppercase shrink-0 text-slate-500">{label}</span>
                        <span className="text-[11px] font-mono truncate text-right text-slate-300">{val}</span>
                    </div>
                ))}
            </div>
            {!user && (
                <button
                    onClick={onLogin}
                    className="w-full font-mono text-[9px] tracking-widest uppercase py-2 transition-all"
                    style={{
                        borderTop: '1px solid rgba(37,99,235,0.15)',
                        color: 'rgba(147,197,253,0.75)',
                        background: 'transparent',
                        cursor: 'pointer',
                        letterSpacing: '0.14em',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.12)'; e.currentTarget.style.color = 'rgba(147,197,253,1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(147,197,253,0.75)'; }}
                >
                    [ Access System ]
                </button>
            )}
        </div>
    );
}


//  Pinned assets panel 
const AMBER_PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(15,23,42,0.92)',
    border: '1px solid rgba(234,179,8,0.2)',
    borderLeftWidth: '3px',
    borderLeftColor: 'rgba(234,179,8,0.45)',
};

type PinnedAssetsPanelProps = {
    pinned: PinnedItem[];
    onOpenDossier: (item: PinnedItem) => void;
    onViewAll: () => void;
};

function PinnedAssetsPanel({ pinned, onOpenDossier, onViewAll }: PinnedAssetsPanelProps) {
    if (pinned.length === 0) return null;
    const visible = pinned.slice(-4).reverse(); // most-recently pinned first, max 4
    const totalCount = pinned.length;

    return (
        <div className="select-none" style={AMBER_PANEL_STYLE}>
            {/* Header */}
            <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ borderBottom: '1px solid rgba(234,179,8,0.15)' }}>
                <Pin size={8} style={{ color: 'rgba(234,179,8,0.7)', flexShrink: 0 }} />
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(234,179,8,0.7)' }}>Pinned Dossiers</span>
                <span className="ml-auto text-[8px] font-mono" style={{ color: 'rgba(234,179,8,0.4)' }}>{totalCount}</span>
            </div>

            {/* Items */}
            {visible.map((item) => (
                <button
                    key={`${item.entityId}-${item.universeId}`}
                    className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left transition-colors"
                    style={{ borderBottom: '1px solid rgba(234,179,8,0.07)' }}
                    onClick={() => onOpenDossier(item)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(234,179,8,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    {/* Thumbnail or type dot */}
                    {item.profileImage ? (
                        <img
                            src={item.profileImage}
                            alt=""
                            style={{
                                width: 22, height: 22, flexShrink: 0, objectFit: 'cover',
                                border: `1px solid ${statusColor(item.entityStatus?.slug)}35`,
                            }}
                        />
                    ) : (
                        <span
                            style={{
                                width: 22, height: 22, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${statusColor(item.entityStatus?.slug)}12`,
                                border: `1px solid ${statusColor(item.entityStatus?.slug)}28`,
                            }}
                        >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(item.entityStatus?.slug) }} />
                        </span>
                    )}
                    {/* Name + type */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="text-[10px] font-mono truncate leading-tight" style={{ color: 'rgba(226,232,240,0.9)' }}>{item.name}</div>
                        <div className="text-[8px] font-mono truncate leading-tight uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.7)' }}>
                            {item.entityType?.name ?? ''}
                        </div>
                    </div>
                    {/* Status glow dot */}
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: statusColor(item.entityStatus?.slug),
                        boxShadow: `0 0 5px ${statusColor(item.entityStatus?.slug)}80`,
                    }} />
                </button>
            ))}

            {/* Footer  view all */}
            <button
                className="w-full px-2.5 py-1 flex items-center justify-between transition-colors"
                onClick={onViewAll}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(234,179,8,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{ borderTop: '1px solid rgba(234,179,8,0.10)' }}
            >
                <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'rgba(100,116,139,0.6)' }}>View all</span>
                <span className="text-[8px] font-mono" style={{ color: 'rgba(234,179,8,0.4)' }}>→</span>
            </button>
        </div>
    );
}

//  Recent intel panel 
type RecentIntelPanelProps = {
    history: HistoryEntry[];
    onOpenDossier: (item: HistoryEntry) => void;
};

function RecentIntelPanel({ history, onOpenDossier }: RecentIntelPanelProps) {
    const [expanded, setExpanded] = useState(true);
    if (history.length === 0) return null;
    const visible = history.slice(0, 4);

    return (
        <div className="select-none" style={DARK_PANEL_STYLE}>
            {/* Header */}
            <div className="px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}
                onClick={() => setExpanded((e) => !e)}
            >
                <Clock size={8} style={{ color: 'rgba(96,165,250,0.65)', flexShrink: 0 }} />
                <span className="text-[9px] font-mono tracking-widest uppercase text-blue-400/65">Recent Intel</span>
            </div>
            <div 

                className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
            style={{ borderBottom: '1px solid rgba(37,99,235,0.12)' }}>

                {/* Items */}
                {visible.map((item) => (
                    <button
                        key={`${item.entityId}-${item.universeId}`}
                        className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left transition-colors"
                        style={{ borderBottom: '1px solid rgba(37,99,235,0.07)' }}
                        onClick={() => onOpenDossier(item)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.09)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        {/* Thumbnail or dot */}
                        {item.profileImage ? (
                            <img
                                src={item.profileImage}
                                alt=""
                                style={{
                                    width: 20, height: 20, flexShrink: 0, objectFit: 'cover',
                                    border: '1px solid rgba(37,99,235,0.25)', opacity: 0.75,
                                }}
                            />
                        ) : (
                            <span
                                style={{
                                    width: 20, height: 20, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(37,99,235,0.2)',
                                }}
                            >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(96,165,250,0.45)' }} />
                            </span>
                        )}
                        {/* Name + type */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="text-[10px] font-mono truncate leading-tight" style={{ color: 'rgba(203,213,225,0.85)' }}>{item.name}</div>
                            <div className="text-[8px] font-mono truncate leading-tight uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.65)' }}>
                                {item.entityType?.name ?? ''}
                            </div>
                        </div>
                        {/* Time ago */}
                        <span className="text-[8px] font-mono tracking-wider shrink-0" style={{ color: 'rgba(71,85,105,0.9)' }}>
                            {relativeTime(item.viewedAt)}
                        </span>
                    </button>
                ))}
            </div>

        </div>
    );
}

//  Map legend 
type MapLegendProps = { entityPinCount: number; universeCount: number };

function MapLegend({ entityPinCount, universeCount }: MapLegendProps) {
    const items: Array<{ color: string; label: string; circle?: boolean }> = [
        { color: '#2563eb', label: 'Universe Theater', circle: true },
        { color: '#2563eb', label: 'Active / Unknown' },
        { color: '#059669', label: 'Alive / Secure' },
        { color: '#b91c1c', label: 'Destroyed Site' },
        { color: '#0891b2', label: 'Contained Zone' },
        { color: '#94a3b8', label: 'Inactive Site' },
    ];

    return (
        <div className="select-none pointer-events-none" style={DARK_PANEL_STYLE}>
            <div className="px-2 py-1.5" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                <span className="text-[9px] font-mono tracking-wider uppercase text-blue-400/70">Map Legend</span>
            </div>

            <div className="px-2 py-2 flex flex-col gap-0.5">
                {items.map(({ color, label, circle }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        {circle ? (
                            <svg width="8" height="8" viewBox="0 0 10 10">
                                <circle cx="5" cy="5" r="4" fill={color} opacity={0.8} />
                            </svg>
                        ) : (
                            <svg width="8" height="8" viewBox="0 0 10 10">
                                <rect x="1.5" y="1.5" width="7" height="7" fill={color} opacity={0.8} transform="rotate(45 5 5)" />
                            </svg>
                        )}
                        <span className="text-[9px] font-mono text-slate-400">{label}</span>
                    </div>
                ))}

                <div className="mt-1 pt-1 flex gap-3" style={{ borderTop: '1px solid rgba(37,99,235,0.12)' }}>
                    <span className="text-[8px] font-mono text-slate-500">
                        THEATERS: <span className="text-slate-300">{universeCount}</span>
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">
                        SITES: <span className="text-blue-400">{entityPinCount}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}


//  Expandable inline search widget 
type ExpandableSearchProps = {
    onSearch: (query: string) => void;
    onAnalysis: (query: string) => void;
};

function ExpandableSearch({ onSearch, onAnalysis }: ExpandableSearchProps) {
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (expanded) inputRef.current?.focus();
    }, [expanded]);

    // Close on ESC key globally while open
    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') collapse(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [expanded]);

    const collapse = () => { setExpanded(false); setQuery(''); };

    const handleSearch = () => { if (query.trim()) onSearch(query); else onSearch(''); collapse(); };
    const handleAnalysis = () => { if (query.trim()) onAnalysis(query); else onAnalysis(''); collapse(); };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const modeBtnStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        fontFamily: 'monospace',
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: '0.55rem 0.5rem',
        background: 'rgba(30,41,59,0.6)',
        border: '1px solid rgba(37,99,235,0.2)',
        color: 'rgba(148,163,184,0.85)',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    };

    return (
        <>
            {/* Compact trigger button in the HUD */}
            <div className="select-none pointer-events-auto" style={DARK_PANEL_STYLE}>
                <button
                    className="w-full px-2.5 py-2 flex items-center gap-2"
                    onClick={() => setExpanded(true)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <Search size={10} style={{ color: 'rgba(96,165,250,0.7)', flexShrink: 0 }} />
                    <span className="text-[9px] font-mono tracking-widest uppercase text-blue-400/70 flex-1 text-left">Search</span>
                    <span className="text-[8px] font-mono" style={{ color: 'rgba(71,85,105,0.7)' }}>[ _ ]</span>
                </button>
            </div>

            {/* Centered overlay — rendered via portal-like fixed positioning */}
            {expanded && (
                /* Backdrop — click outside to close */
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center"
                    style={{ background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(2px)' }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) collapse(); }}
                >
                    <div
                        ref={panelRef}
                        className="flex flex-col w-[480px] max-w-[90vw]"
                        style={{
                            background: 'rgba(10,17,35,0.97)',
                            border: '1px solid rgba(37,99,235,0.35)',
                            borderTopWidth: '3px',
                            borderTopColor: 'rgba(37,99,235,0.65)',
                            boxShadow: '0 8px 48px rgba(0,0,0,0.55), 0 0 60px rgba(37,99,235,0.08)',
                        }}
                    >
                        {/* Header */}
                        <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                            <Search size={11} style={{ color: 'rgba(96,165,250,0.6)', flexShrink: 0 }} />
                            <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-blue-400/60 flex-1">Intelligence Query Terminal</span>
                            <button
                                onClick={collapse}
                                style={{ color: 'rgba(100,116,139,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.15rem', lineHeight: 1 }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.9)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(100,116,139,0.5)'; }}
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* Input */}
                        <div className="px-4 py-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="enter search query..."
                                className="w-full"
                                style={{
                                    background: 'rgba(15,23,42,0.9)',
                                    border: '1px solid rgba(37,99,235,0.3)',
                                    borderBottom: '2px solid rgba(37,99,235,0.5)',
                                    color: '#e2e8f0',
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem',
                                    padding: '0.6rem 0.75rem',
                                    outline: 'none',
                                    letterSpacing: '0.03em',
                                    width: '100%',
                                }}
                            />
                            <div className="mt-1.5 text-[8px] font-mono tracking-widest uppercase" style={{ color: 'rgba(71,85,105,0.6)' }}>
                                Press Enter to search · ESC to close
                            </div>
                        </div>

                        {/* Mode buttons */}
                        <div className="px-4 pb-4 flex gap-2">
                            <button
                                style={modeBtnStyle}
                                onClick={handleSearch}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.2)'; e.currentTarget.style.color = 'rgba(147,197,253,1)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; e.currentTarget.style.color = 'rgba(148,163,184,0.85)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'; }}
                            >
                                <Search size={10} />
                                Search Terminal
                            </button>
                            <button
                                style={modeBtnStyle}
                                onClick={handleAnalysis}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.2)'; e.currentTarget.style.color = 'rgba(147,197,253,1)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; e.currentTarget.style.color = 'rgba(148,163,184,0.85)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'; }}
                            >
                                <Brain size={10} />
                                Analysis Engine
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

//  Recent events panel 
const VIOLET_PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(15,23,42,0.92)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderLeftWidth: '3px',
    borderLeftColor: 'rgba(139,92,246,0.5)',
};

type RecentEventsPanelProps = {
    events: ApiMapRecentEvent[];
    universeId: number;
    onOpenTimeline: (timelineId: number, timelineName: string, universeId: number) => void;
};

function RecentEventsPanel({ events, universeId, onOpenTimeline }: RecentEventsPanelProps) {
    const [expanded, setExpanded] = useState(true);
    if (events.length === 0) return null;

    return (
        <div className="select-none pointer-events-auto" style={VIOLET_PANEL_STYLE}>
            <div
                className="px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}
                onClick={() => setExpanded((e) => !e)}
            >
                <Zap size={8} style={{ color: 'rgba(167,139,250,0.7)', flexShrink: 0 }} />
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>Event Feed</span>
                <span className="ml-auto text-[8px] font-mono" style={{ color: 'rgba(167,139,250,0.4)' }}>{events.length}</span>
            </div>
            <div className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                expanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
                {events.map((ev) => {
                    const typeColor = EVENT_TYPE_COLORS[ev.event_type ?? ''] ?? '#64748b';
                    const sevColor  = SEVERITY_COLORS[ev.severity ?? ''] ?? '#64748b';
                    return (
                        <button
                            key={ev.id}
                            className="w-full px-2.5 py-1.5 flex items-start gap-2 text-left transition-colors"
                            style={{ borderBottom: '1px solid rgba(139,92,246,0.07)' }}
                            onClick={() => onOpenTimeline(ev.timeline_id, ev.timeline_name, universeId)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {/* Event-type badge */}
                            <span
                                className="text-[7px] font-mono uppercase tracking-widest shrink-0 px-1 py-px mt-px"
                                style={{
                                    color: typeColor,
                                    background: `${typeColor}18`,
                                    border: `1px solid ${typeColor}35`,
                                }}
                            >
                                {ev.event_type ?? 'EVT'}
                            </span>
                            {/* Title + timeline name */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="text-[10px] font-mono truncate leading-tight" style={{ color: 'rgba(226,232,240,0.9)' }}>
                                    {ev.title}
                                </div>
                                <div className="text-[8px] font-mono truncate leading-tight" style={{ color: 'rgba(100,116,139,0.65)' }}>
                                    {ev.fictional_date ? `${ev.fictional_date} · ` : ''}{ev.timeline_name}
                                </div>
                            </div>
                            {/* Severity dot */}
                            {ev.severity && (
                                <span
                                    style={{
                                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                                        background: sevColor,
                                        boxShadow: `0 0 4px ${sevColor}80`,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

//  Intel updates panel (recently-edited entities) 
const EMERALD_PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(15,23,42,0.92)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderLeftWidth: '3px',
    borderLeftColor: 'rgba(16,185,129,0.45)',
};

type IntelUpdatesPanelProps = {
    entities: ApiEntitySummary[];
    onOpenDossier: (slug: string, name: string, universeId: number) => void;
    universeId: number;
};

function IntelUpdatesPanel({ entities, onOpenDossier, universeId }: IntelUpdatesPanelProps) {
    const [expanded, setExpanded] = useState(true);
    if (entities.length === 0) return null;
    const visible = entities.slice(0, 4);

    return (
        <div className="select-none pointer-events-auto" style={EMERALD_PANEL_STYLE}>
            <div
                className="px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                style={{ borderBottom: '1px solid rgba(16,185,129,0.15)' }}
                onClick={() => setExpanded((e) => !e)}
            >
                <RefreshCw size={8} style={{ color: 'rgba(52,211,153,0.7)', flexShrink: 0 }} />
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(52,211,153,0.7)' }}>Intel Updates</span>
            </div>
            <div className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                expanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
                {visible.map((entity) => {
                    const color = statusColor(entity.entity_status?.slug);
                    const profileImg = entity.images?.find((i) => i.type === 'profile');
                    return (
                        <button
                            key={entity.id}
                            className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left transition-colors"
                            style={{ borderBottom: '1px solid rgba(16,185,129,0.07)' }}
                            onClick={() => onOpenDossier(entity.slug, entity.name, universeId)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {/* Thumbnail or status dot */}
                            {profileImg ? (
                                <img
                                    src={profileImg.thumbnail_url ?? profileImg.url}
                                    alt=""
                                    style={{
                                        width: 20, height: 20, flexShrink: 0, objectFit: 'cover',
                                        border: `1px solid ${color}35`, opacity: 0.8,
                                    }}
                                />
                            ) : (
                                <span style={{
                                    width: 20, height: 20, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `${color}12`, border: `1px solid ${color}28`,
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                                </span>
                            )}
                            {/* Name + type */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="text-[10px] font-mono truncate leading-tight" style={{ color: 'rgba(203,213,225,0.9)' }}>{entity.name}</div>
                                <div className="text-[8px] font-mono truncate leading-tight uppercase tracking-wide" style={{ color: 'rgba(100,116,139,0.65)' }}>
                                    {entity.entity_type?.name ?? ''}
                                </div>
                            </div>
                            {/* Updated-at badge */}
                            <span className="text-[8px] font-mono shrink-0" style={{ color: 'rgba(52,211,153,0.5)' }}>
                                {relativeTime(entity.updated_at)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

//  Corner brackets  atmosphere 
function CornerBrackets() {
    const SZ = 20;
    const stroke = 'rgba(37,99,235,0.35)';
    const sw = 1.5;
    return (
        <div className="absolute inset-0 z-10 pointer-events-none select-none">
            {/* Top-left */}
            <svg width={SZ} height={SZ} className="absolute top-3 left-3">
                <polyline points={`0,${SZ} 0,0 ${SZ},0`} fill="none" stroke={stroke} strokeWidth={sw} />
            </svg>
            {/* Top-right */}
            <svg width={SZ} height={SZ} className="absolute top-3 right-3">
                <polyline points={`0,0 ${SZ},0 ${SZ},${SZ}`} fill="none" stroke={stroke} strokeWidth={sw} />
            </svg>
            {/* Bottom-left */}
            <svg width={SZ} height={SZ} className="absolute bottom-3 left-3">
                <polyline points={`0,0 0,${SZ} ${SZ},${SZ}`} fill="none" stroke={stroke} strokeWidth={sw} />
            </svg>
            {/* Bottom-right */}
            <svg width={SZ} height={SZ} className="absolute bottom-3 right-3">
                <polyline points={`${SZ},0 ${SZ},${SZ} 0,${SZ}`} fill="none" stroke={stroke} strokeWidth={sw} />
            </svg>
        </div>
    );
}

//  Loading / signal acquisition indicator 
type LoadingIndicatorProps = { pinsLoading: boolean };

function LoadingIndicator({ pinsLoading }: LoadingIndicatorProps) {
    if (!pinsLoading) return null;
    const label = 'Mapping Field Assets';
    return (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none select-none right-30 bottom-20">
            <div
                className="flex flex-col gap-3 px-6 py-4 font-mono min-w-[220px]"
                style={{
                    background: 'rgba(248,250,254,0.92)',
                    border: '1px solid rgba(15,23,42,0.08)',
                    borderLeftWidth: '3px',
                    borderLeftColor: 'rgba(37,99,235,0.5)',
                    boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
                }}
            >
                {/* Label row */}
                <div className="flex items-center gap-3">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
                        style={{ background: 'rgba(37,99,235,0.65)' }}
                    />
                    <span
                        className="text-[11px] tracking-widest uppercase"
                        style={{ color: 'rgba(37,99,235,0.70)' }}
                    >
                        {label}
                    </span>
                    <span
                        className="text-[11px] ml-auto"
                        style={{ color: 'rgba(100,116,139,0.45)', letterSpacing: '0.15em' }}
                    >
                        ···
                    </span>
                </div>

                {/* Progress bar */}
                <div
                    className="w-full h-[3px] overflow-hidden rounded-full"
                    style={{ background: 'rgba(37,99,235,0.10)' }}
                >
                    <div
                        className="h-full rounded-full"
                        style={{
                            background: 'rgba(37,99,235,0.55)',
                            width: '40%',
                            animation: 'loadingSlide 1.4s ease-in-out infinite',
                        }}
                    />
                </div>

                <style>{`
                    @keyframes loadingSlide {
                        0%   { transform: translateX(-100%); width: 40%; }
                        50%  { width: 60%; }
                        100% { transform: translateX(280%); width: 40%; }
                    }
                `}</style>
            </div>
        </div>
    );
}

type StatusBarProps = { markerCount: number; universeCount: number; entityPinCount: number; onLicenseDisclaimer?: () => void };

function StatusBar({ markerCount, universeCount, entityPinCount, onLicenseDisclaimer }: StatusBarProps) {
    const [utc, setUtc] = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');

    useEffect(() => {
        const id = setInterval(() => {
            setUtc(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="absolute inset-x-0 bottom-0 h-7 flex items-center gap-6 px-4 font-mono text-[10px] select-none uppercase"
            style={{ background: 'rgba(2, 6, 23, 0.98)', borderTop: '1px solid rgba(56, 189, 248, 0.2)' }}>
            
            <span className="text-sky-500/80">
                Status: <span className="text-sky-400">Nominal</span>
            </span>
            
            <span className="text-slate-700">::</span>
            
            <span className="text-slate-500">
                Theaters: <span className="text-slate-200">0{universeCount}</span>
            </span>

            <span className="text-slate-500">
                Point-Cloud: <span className="text-slate-200">{markerCount.toLocaleString()}</span>
            </span>

            <span className="text-slate-500">
                Tracked-Sites: <span className="text-amber-500/80">{entityPinCount}</span>
            </span>

            <div className="flex items-center gap-1 ml-auto">
                {/* <span className="text-slate-600 italic lowercase">syncing_uplink...</span>
                <span className="text-sky-500/40">● ○ ○</span> */}
                
                {onLicenseDisclaimer && (
                    <button className="ml-4 text-slate-500 cursor-pointer flex gap-1 my-auto items-center text-center hover:text-sky-200 transition-colors" onClick={onLicenseDisclaimer}>
                        <ScrollIcon size={12} /> License
                    </button>
                )}

                {/* github link */}
                <a href="https://github.com/bywyd/archives" target="_blank" rel="noopener noreferrer" className="ml-4 flex gap-1 my-auto items-center text-center text-slate-500 hover:text-sky-200 transition-colors hover:cursor-pointer">
                    <Github size={12} /> Github
                </a>

                <span className="ml-4 text-slate-500">{utc}</span>
            </div>
        </div>
    );
}

//  Map primitives 

// type ConnectionLinesProps = { markers: UniverseMarker[]; connections: [string, string][] };

// const ConnectionLines = memo(function ConnectionLines({ markers, connections }: ConnectionLinesProps) {
//     const byId = useMemo(() => new Map(markers.map((m) => [m.id, m.coordinates])), [markers]);

//     return (
//         <>
//             {connections.map(([aId, bId]) => {
//                 const from = byId.get(aId);
//                 const to = byId.get(bId);
//                 if (!from || !to) return null;
//                 return (
//                     <Line
//                         key={`${aId}-${bId}`}
//                         coordinates={[from, to]}
//                         stroke="rgba(37,99,235,0.15)"
//                         strokeWidth={0.6}
//                         strokeDasharray="3 6"
//                     />
//                 );
//             })}
//         </>
//     );
// });

type UniverseMarkerDotProps = {
    marker: UniverseMarker;
    isHovered: boolean;
    isDimmed?: boolean;
    onMouseEnter: (m: UniverseMarker, e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onClick: (m: UniverseMarker) => void;
};

function UniverseMarkerDot({ marker, isHovered, isDimmed, onMouseEnter, onMouseLeave, onClick }: UniverseMarkerDotProps) {
    const isPrimary = marker.type === 'primary';
    const outerR = isPrimary ? 7 : 5;
    const innerR = isPrimary ? 3 : 2;
    const color = isPrimary ? '#2563eb' : '#1d4ed8';
    const animDur = isPrimary ? '2.4s' : '3.2s';

    return (
        <Marker coordinates={marker.coordinates}>
            <g
                onMouseEnter={(e) => onMouseEnter(marker, e)}
                onMouseLeave={onMouseLeave}
                onClick={() => onClick(marker)}
                style={{ cursor: 'pointer', opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.25s' }}
            >
                {/* Animated expanding pulse ring */}
                <circle r={outerR + 4} fill="none" stroke={color} strokeWidth={0.7} opacity={0}>
                    <animate attributeName="r" from={outerR} to={outerR + 10} dur={animDur} repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur={animDur} repeatCount="indefinite" />
                </circle>
                {/* Hover-flash outer ring */}
                <circle r={outerR + 4} fill="none" stroke={color} strokeWidth={0.8} opacity={isHovered ? 0.55 : 0} style={{ transition: 'opacity 0.2s' }} />
                {/* Static outer ring */}
                <circle r={outerR} fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
                {/* Core */}
                <circle r={innerR} fill={color} opacity={0.9} />
                {/* Label */}
                <text
                    y={-outerR - 5}
                    textAnchor="middle"
                    style={{ fontFamily: 'monospace', fontSize: isPrimary ? 6 : 5, fill: '#9ca3af', letterSpacing: '0.1em' }}
                >
                    {marker.label}
                </text>
            </g>
        </Marker>
    );
}

type UniverseTooltipProps = { hover: UniverseHoverState };

function UniverseTooltip({ hover }: UniverseTooltipProps) {
    const { marker, universe, x, y } = hover;
    const left = Math.min(x + 12, window.innerWidth - TOOLTIP_WIDTH - 8);
    const top = y - 10;

    const rows: [string, string | number][] = [
        ['UNIVERSE ID', universe.id],
        ['DESIGNATION', universe.name],
        ['ENTITIES', marker.count ?? ''],
    ];

    return (
        <div
            className="fixed z-50 pointer-events-none font-mono"
            style={{ left, top, width: TOOLTIP_WIDTH }}
        >
            <div
                style={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(37,99,235,0.3)',
                    boxShadow: '0 0 20px rgba(37,99,235,0.08)',
                }}
            >
                <div className="px-3 py-1.5 border-b border-blue-900/25 flex items-center gap-2">
                    <span className="text-[9px] tracking-widest text-blue-400/70 uppercase">Intel Brief</span>
                    <span className="ml-auto text-[9px] text-emerald-400/60 tracking-widest uppercase">
                        {marker.type === 'primary' ? 'PRIMARY THEATER' : 'THEATER'}
                    </span>
                </div>
                <div className="p-2 flex flex-col gap-1">
                    {rows.map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-3">
                            <span className="text-[9px] tracking-widest text-slate-500 uppercase shrink-0">{label}</span>
                            <span className="text-[11px] text-slate-300 truncate">{val}</span>
                        </div>
                    ))}
                    <div className="mt-1 text-[8px] text-slate-600 tracking-widest uppercase">↵ Click to enter universe</div>
                </div>
            </div>
        </div>
    );
}

//  Entity pin 
type EntityPinDotProps = {
    pin: EntityPin;
    isHovered: boolean;
    onMouseEnter: (pin: EntityPin, e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onClick: (pin: EntityPin) => void;
};

function EntityPinDot({ pin, isHovered, onMouseEnter, onMouseLeave, onClick }: EntityPinDotProps) {
    const color = statusColor(pin.entityStatusSlug);
    const size  = isHovered ? 4.5 : 3;

    return (
        <Marker coordinates={pin.coordinates}>
            <g
                onMouseEnter={(e) => onMouseEnter(pin, e)}
                onMouseLeave={onMouseLeave}
                onClick={() => onClick(pin)}
                style={{ cursor: 'pointer' }}
            >
                {/* Glow halo */}
                <circle r={size + 6} fill={color} opacity={isHovered ? 0.12 : 0.04} />
                {/* Outer ring */}
                <circle r={size + 2.5} fill="none" stroke={color} strokeWidth={0.7} opacity={isHovered ? 0.65 : 0.28} />
                {/* Diamond body */}
                <rect x={-size} y={-size} width={size * 2} height={size * 2} fill={color} opacity={isHovered ? 0.95 : 0.78} transform="rotate(45)" />
                {/* Centre dot */}
                <circle r={1} fill="rgba(255,255,255,0.55)" />
                {/* Hover label */}
                {isHovered && (
                    <text
                        y={-size - 8}
                        textAnchor="middle"
                        style={{ fontFamily: 'monospace', fontSize: 8, fill: '#94b4c8', letterSpacing: '0.07em', pointerEvents: 'none' }}
                    >
                        {pin.name.length > 18 ? pin.name.substring(0, 17) + '…' : pin.name.toUpperCase()}
                    </text>
                )}
            </g>
        </Marker>
    );
}

//  Entity tooltip 
type EntityTooltipProps = { hover: EntityHoverState };

function EntityTooltip({ hover }: EntityTooltipProps) {
    const { pin, x, y } = hover;
    const color = statusColor(pin.entityStatusSlug);
    const left  = Math.min(x + 14, window.innerWidth  - TOOLTIP_WIDTH - 8);
    const top   = Math.min(y - 10, window.innerHeight - 180);

    return (
        <div className="fixed z-50 pointer-events-none font-mono" style={{ left, top, width: TOOLTIP_WIDTH }}>
            <div style={{ background: 'rgba(15,23,42,0.96)', border: `1px solid ${color}40`, boxShadow: `0 0 18px ${color}0a` }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${color}20` }}>
                    <span className="text-[9px] tracking-widest uppercase" style={{ color: `${color}bb` }}>
                        {pin.entityTypeSlug ?? 'location'}
                    </span>
                    <span className="ml-auto text-[9px] tracking-widest uppercase font-bold" style={{ color }}>
                        {pin.entityStatusSlug?.toUpperCase() ?? ''}
                    </span>
                </div>
                <div className="px-3 py-2">
                    <div className="text-[12px] font-bold tracking-wide text-slate-100 mb-1.5 leading-tight">{pin.name}</div>
                    {pin.shortDescription && (
                        <div
                            className="text-[9px] text-slate-400 leading-relaxed"
                            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
                        >
                            {pin.shortDescription}
                        </div>
                    )}
                    <div className="mt-2 text-[8px] text-slate-500 tracking-widest uppercase">↵ Click to open dossier</div>
                </div>
            </div>
        </div>
    );
}

//  Main component 

export function OperationsMap() {
    const page = usePage().props as { auth?: { user?: Auth['user'] } };
    const user = page.auth?.user;
    const { openWindow } = useWindowStore();
    const { history, pinned } = useHistoryStore();
    const recentHistory = history.slice(0, 4);
    const { universes, currentUniverse } = useArchive();
    // On the workbench, scope map to the active universe only.
    // On the selector screen (no currentUniverse), show all universes.
    const visibleUniverses = currentUniverse ? [currentUniverse] : universes;

    const [entityPins,       setEntityPins]       = useState<EntityPin[]>([]);
    const [uniHover,         setUniHover]         = useState<UniverseHoverState | null>(null);
    const [entityHover,      setEntityHover]      = useState<EntityHoverState | null>(null);
    const [pinsLoading,      setPinsLoading]      = useState(false);
    const [recentEntities,   setRecentEntities]   = useState<ApiEntitySummary[]>([]);
    const [recentEvents,     setRecentEvents]     = useState<ApiMapRecentEvent[]>([]);

    const uniTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const entityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tipTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Single fetch: pins + recently-edited entities + recent events
    useEffect(() => {
        if (!currentUniverse) {
            setEntityPins([]);
            setRecentEntities([]);
            setRecentEvents([]);
            return;
        }
        let cancelled = false;
        setPinsLoading(true);
        setEntityPins([]);
        setRecentEntities([]);
        setRecentEvents([]);

        api.fetchMapData(currentUniverse.id)
            .catch(() => ({ pins: [], recent_entities: [], recent_events: [] }))
            .then((data) => {
                if (cancelled) return;
                const pins: EntityPin[] = data.pins.map((e) => ({
                    id:               e.id,
                    universeId:       currentUniverse.id,
                    name:             e.name,
                    slug:             e.slug,
                    shortDescription: e.short_description,
                    entityType:       e.entity_type,
                    entityTypeSlug:   e.entity_type_slug,
                    entityStatus:     e.entity_status,
                    entityStatusSlug: e.entity_status_slug,
                    coordinates:      [e.longitude, e.latitude] as [number, number],
                }));
                setEntityPins(pins);
                setRecentEntities(data.recent_entities);
                setRecentEvents(data.recent_events);
                setPinsLoading(false);
            });

        return () => { cancelled = true; };
    }, [currentUniverse]);

    const { markers: uMarkers } = buildUniverseMarkers(visibleUniverses);
    const universeById = new Map(visibleUniverses.map((u) => [u.id, u]));

    // Timer helpers
    const clearTimers = () => {
        if (uniTimerRef.current)    clearTimeout(uniTimerRef.current);
        if (entityTimerRef.current) clearTimeout(entityTimerRef.current);
        if (tipTimerRef.current)    clearTimeout(tipTimerRef.current);
    };

    // Universe marker handlers
    const handleUniEnter = (marker: UniverseMarker, e: React.MouseEvent) => {
        clearTimers();
        const universe = universeById.get(marker.universeId);
        if (!universe) return;
        setEntityHover(null);
        setUniHover({ marker, universe, x: e.clientX, y: e.clientY });
    };
    const handleUniLeave = () => {
        clearTimers();
        uniTimerRef.current = setTimeout(() => setUniHover(null), HIDE_DELAY_UNI);
    };
    const handleUniTooltipEnter = () => clearTimers();
    const handleUniTooltipLeave = () => {
        clearTimers();
        tipTimerRef.current = setTimeout(() => setUniHover(null), HIDE_DELAY_TIP);
    };
    const handleUniClick = (marker: UniverseMarker) => {
        router.visit(`/archives/${marker.slug}`);
    };

    // Entity pin handlers
    const handlePinEnter = (pin: EntityPin, e: React.MouseEvent) => {
        clearTimers();
        setUniHover(null);
        setEntityHover({ pin, x: e.clientX, y: e.clientY });
    };
    const handlePinLeave = () => {
        clearTimers();
        entityTimerRef.current = setTimeout(() => setEntityHover(null), HIDE_DELAY_PIN);
    };
    const handlePinClick = (pin: EntityPin) => {
        openWindow({
            type:  'entity-dossier',
            title: pin.name,
            props: {
                key:        `entity-${pin.universeId}-${pin.slug}`,
                universeId: pin.universeId,
                entitySlug: pin.slug,
            },
        });
    };

    const handleOpenSearch = (query = '') => {
        openWindow({ type: 'search', title: 'SEARCH TERMINAL', icon: 'SR', props: query ? { initialQuery: query } : undefined });
    };
    const handleOpenAnalysis = (query = '') => {
        openWindow({ type: 'advanced-search', title: 'INTELLIGENCE ANALYSIS', icon: 'IA', size: { width: 600, height: 550 }, props: query ? { initialQuery: query } : undefined });
    };
    const handleOpenLicenseDisclaimer = () => {
        openWindow({ type: 'license-disclaimer', title: 'DISCLAIMER', icon: 'LD', size: { width: 400, height: 280 } });
    };
    const handleOpenLogin = () => {
        openWindow({ type: 'login', title: 'SYSTEM ACCESS', icon: 'AU', size: { width: 380, height: 400 } });
    };
    const handleOpenDossierFromMap = (item: HistoryEntry | PinnedItem) => {
        openWindow({
            type: 'entity-dossier',
            title: item.name,
            props: {
                key:        `entity-${item.universeId}-${item.slug}`,
                universeId: item.universeId,
                entitySlug: item.slug,
            },
        });
    };
    const handleOpenDossierBySlug = (slug: string, name: string, universeId: number) => {
        openWindow({
            type: 'entity-dossier',
            title: name,
            props: { key: `entity-${universeId}-${slug}`, universeId, entitySlug: slug },
        });
    };
    const handleOpenTimeline = (timelineId: number, timelineName: string, universeId: number) => {
        openWindow({
            type:  'timeline',
            title: timelineName,
            icon:  'TL',
            props: { universeId, timelineId },
        });
    };
    const handleViewAllPinned = () => {
        openWindow({ type: 'recently-viewed', title: 'HISTORY & PINNED', icon: 'RV', size: { width: 520, height: 480 } });
    };

    // Cleanup on unmount
    useEffect(() => () => clearTimers(), []);

    return (
        <div className="relative w-full h-full overflow-hidden select-none" style={{ background: '#f0f4fa' }}>

            {/* Corner bracket atmosphere overlay */}
            <CornerBrackets />

            {/* Scanline texture overlay */}
            {/* <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(transparent 0px, transparent 3px, rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 4px)',
                }}
            /> */}

            {/* Brand identity block */}
            <BrandBlock />

            {/* Right HUD column */}
            <div className="absolute right-5 top-8 z-20 w-52 flex flex-col gap-2 pointer-events-none">
                <OperatorPanel user={user} onLogin={handleOpenLogin} />
                
                {currentUniverse && recentHistory.length > 0 && (
                    <div className="pointer-events-auto">
                        <RecentIntelPanel
                            history={recentHistory}
                            onOpenDossier={handleOpenDossierFromMap}
                        />
                    </div>
                )}
                {currentUniverse && recentEntities.length > 0 && (
                    <IntelUpdatesPanel
                        entities={recentEntities}
                        onOpenDossier={handleOpenDossierBySlug}
                        universeId={currentUniverse.id}
                    />
                )}
            </div>

            {/* Pinned assets panel (bottom-right) */}
            {currentUniverse && pinned.length > 0 && (
                <div className="absolute right-5 bottom-12 z-20 w-52 pointer-events-auto">
                    <PinnedAssetsPanel
                        pinned={pinned}
                        onOpenDossier={handleOpenDossierFromMap}
                        onViewAll={handleViewAllPinned}
                    />
                </div>
            )}

            {/* Left HUD column - stacks upward from bottom-12 */}
            {currentUniverse && (
                <div className="absolute left-4 bottom-12 z-20 w-48 flex flex-col-reverse gap-2">
                    {/* Bottom-most: Map legend (pointer-events-none) */}
                    {/* <MapLegend entityPinCount={entityPins.length} universeCount={universes.length} /> */}

                    {/* Expandable search */}
                    <ExpandableSearch
                        onSearch={handleOpenSearch}
                        onAnalysis={handleOpenAnalysis}
                    />

                    {/* Above quick access: Recent events feed */}
                    {recentEvents.length > 0 && (
                        <RecentEventsPanel
                            events={recentEvents}
                            universeId={currentUniverse.id}
                            onOpenTimeline={handleOpenTimeline}
                        />
                    )}
                </div>
            )}

            {/* Signal acquisition indicator */}
            <LoadingIndicator pinsLoading={pinsLoading} />

            {/* World map */}
            <div
                className="absolute inset-0"
                style={currentUniverse ? { filter: 'hue-rotate(5deg) saturate(0.88) brightness(0.97)' } : undefined}
            >
                <ComposableMap
                    projection="geoNaturalEarth1"
                    projectionConfig={{ scale: 190, center: [15, 15] }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <Geographies geography={GEO_URL}>
                        {({ geographies }: any) =>
                            geographies
                                .filter((geo: any) => geo.id !== '010')
                                .map((geo: any) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#dde4ef"
                                        strokeWidth={0.4}
                                        style={{
                                            default: { outline: '#dde4ef', stroke: "#dde4ef" },
                                            hover:   { outline: 'none', fill: '#cdd7e8' },
                                            pressed: { outline: 'none' },
                                            
                                        }}
                                    />
                                ))
                        }
                    </Geographies>

                    {/* Entity location pins - below universe markers */}
                    {currentUniverse && entityPins.map((pin) => (
                        <EntityPinDot
                            key={`epin-${pin.id}`}
                            pin={pin}
                            isHovered={entityHover?.pin.id === pin.id}
                            onMouseEnter={handlePinEnter}
                            onMouseLeave={handlePinLeave}
                            onClick={handlePinClick}
                        />
                    ))}

                    {/* Universe theater markers - above entity pins */}
                    {uMarkers.map((m) => (
                        <UniverseMarkerDot
                            key={m.id}
                            marker={m}
                            isHovered={uniHover?.marker.id === m.id}
                            onMouseEnter={handleUniEnter}
                            onMouseLeave={handleUniLeave}
                            onClick={handleUniClick}
                        />
                    ))}
                </ComposableMap>
            </div>

            {/* Vignette - subtle dark-edge depth */}
            <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(15,23,42,0.18) 100%)' }}
            />

            {/* Status bar */}
            <StatusBar markerCount={uMarkers.length} universeCount={universes.length} entityPinCount={entityPins.length} onLicenseDisclaimer={handleOpenLicenseDisclaimer} />

            {/* Universe tooltip (hoverable) */}
            {uniHover && (
                <div onMouseEnter={handleUniTooltipEnter} onMouseLeave={handleUniTooltipLeave}>
                    <UniverseTooltip hover={uniHover} />
                </div>
            )}

            {/* Entity dossier tooltip */}
            {entityHover && <EntityTooltip hover={entityHover} />}
        </div>
    );
}
