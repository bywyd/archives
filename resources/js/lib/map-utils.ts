import L from 'leaflet';

// Type → glyph
export const MARKER_GLYPHS: Record<string, string> = {
    poi: '●',
    character: 'P',
    item: '◆',
    event: '!',
    entrance: '▶',
    exit: '◀',
    'save-point': '✦',
    boss: '★',
    note: '?',
    threat: '▲',
    objective: '⊕',
    secret: '◇',
    'safe-room': 'S',
    custom: '·',
};

// Type → default color
export const MARKER_COLORS: Record<string, string> = {
    poi: '#60a5fa',
    item: '#fbbf24',
    character: '#34d399',
    event: '#f87171',
    entrance: '#818cf8',
    exit: '#fb923c',
    'save-point': '#22d3ee',
    boss: '#ef4444',
    note: '#a78bfa',
    threat: '#dc2626',
    objective: '#6366f1',
    secret: '#a855f7',
    'safe-room': '#4ade80',
    custom: '#94a3b8',
};

export const REGION_COLORS: Record<string, string> = {
    room: '#60a5fa',
    zone: '#34d399',
    corridor: '#a78bfa',
    outdoor: '#22d3ee',
    restricted: '#ef4444',
    safe: '#4ade80',
    'boss-arena': '#f87171',
    containment: '#7c3aed',
    lab: '#0d9488',
    storage: '#d97706',
    utility: '#9a3412',
    exterior: '#6b7280',
    'safe-room': '#4ade80',
    custom: '#94a3b8',
};

export const MARKER_TYPES = [
    'poi', 'item', 'character', 'event', 'entrance', 'exit',
    'save-point', 'boss', 'note', 'threat', 'objective', 'secret', 'safe-room', 'custom',
] as const;

export const REGION_TYPES = [
    'room', 'zone', 'corridor', 'outdoor', 'restricted', 'safe',
    'boss-arena', 'containment', 'lab', 'storage', 'utility', 'exterior', 'safe-room', 'custom',
] as const;

// Coordinate helpers
export function pctToLatLng(xPct: number, yPct: number, bounds: L.LatLngBoundsExpression): L.LatLng {
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const lat = b.getSouth() + (1 - yPct / 100) * (b.getNorth() - b.getSouth());
    const lng = b.getWest() + (xPct / 100) * (b.getEast() - b.getWest());
    return L.latLng(lat, lng);
}

export function latLngToPct(latlng: L.LatLng, bounds: L.LatLngBoundsExpression): { x: number; y: number } {
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const x = ((latlng.lng - b.getWest()) / (b.getEast() - b.getWest())) * 100;
    const y = (1 - (latlng.lat - b.getSouth()) / (b.getNorth() - b.getSouth())) * 100;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

export function regionPointsToLatLngs(points: { x: number; y: number }[], bounds: L.LatLngBoundsExpression): L.LatLng[] {
    return points.map((p) => pctToLatLng(p.x, p.y, bounds));
}

// SVG teardrop pin factory
export function makeTeardropPath(cx: number, cy: number, r: number, tipY: number): string {
    return [
        `M${cx} ${cy - r}`,
        `A${r} ${r} 0 0 1 ${cx + r} ${cy}`,
        `C${cx + r} ${cy + r * 0.9},${cx + r * 0.4} ${tipY - 4},${cx} ${tipY}`,
        `C${cx - r * 0.4} ${tipY - 4},${cx - r} ${cy + r * 0.9},${cx - r} ${cy}`,
        `A${r} ${r} 0 0 1 ${cx} ${cy - r} Z`,
    ].join(' ');
}

/**
 * Create a teardrop map-pin DivIcon.
 * When `imageUrl` is provided, renders a circular-clipped profile image
 * inside the pin instead of the default text glyph.
 */
export function createMarkerPin(
    color: string,
    markerType: string,
    selected: boolean,
    imageUrl?: string | null,
): L.DivIcon {
    const size = selected ? 28 : 22;
    const r = size / 2 - 1;
    const cx = size / 2;
    const height = Math.round(size * 1.4);
    const tipY = height - 1;
    const innerR = Math.round(r * 0.44);
    const fontSize = Math.max(6, Math.round(r * 0.48));
    const rawGlyph = MARKER_GLYPHS[markerType] || '●';
    const glyph = rawGlyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const strokeColor = selected ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.28)';
    const strokeWidth = selected ? '2' : '1.5';
    const shadowStr = `drop-shadow(0 ${selected ? '3px 8px' : '1px 4px'} ${color}55)`;

    // Inner content: either a clipped profile image or the glyph text
    let innerContent: string;
    if (imageUrl) {
        // Circular clip for profile image inside the pin
        innerContent = [
            `<defs><clipPath id="pin-clip-${size}"><circle cx="${cx}" cy="${cx}" r="${innerR + 1}"/></clipPath></defs>`,
            `<image href="${imageUrl}" x="${cx - innerR - 1}" y="${cx - innerR - 1}" width="${(innerR + 1) * 2}" height="${(innerR + 1) * 2}"`,
            ` clip-path="url(#pin-clip-${size})" preserveAspectRatio="xMidYMid slice"/>`,
            `<circle cx="${cx}" cy="${cx}" r="${innerR + 1}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>`,
        ].join('');
    } else {
        innerContent = [
            `<circle cx="${cx}" cy="${cx}" r="${innerR}" fill="rgba(0,0,0,0.22)"/>`,
            `<text x="${cx}" y="${cx + fontSize * 0.4}" font-size="${fontSize}" text-anchor="middle"`,
            ` fill="rgba(255,255,255,0.95)" font-family="monospace" font-weight="bold">${glyph}</text>`,
        ].join('');
    }

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">`,
        `<path d="${makeTeardropPath(cx, cx, r, tipY)}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`,
        innerContent,
        `</svg>`,
    ].join('');

    return L.divIcon({
        className: 'arc-map-pin',
        html: `<div style="filter:${shadowStr}">${svg}</div>`,
        iconSize: [size, height],
        iconAnchor: [cx, tipY],
    });
}

/**
 * Simpler editor pin — uses the same teardrop shape but smaller for
 * the editing canvas. Shows profile image when available.
 */
export function createEditorMarkerIcon(
    type: string,
    active: boolean,
    imageUrl?: string | null,
): L.DivIcon {
    const color = MARKER_COLORS[type] || MARKER_COLORS.poi;
    const size = active ? 22 : 18;
    const r = size / 2 - 1;
    const cx = size / 2;
    const height = Math.round(size * 1.35);
    const tipY = height - 1;
    const innerR = Math.round(r * 0.42);
    const fontSize = Math.max(5, Math.round(r * 0.44));
    const rawGlyph = MARKER_GLYPHS[type] || '●';
    const glyph = rawGlyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const strokeColor = active ? '#fff' : 'rgba(0,0,0,0.5)';
    const strokeWidth = active ? '2' : '1.5';
    const shadowStr = `drop-shadow(0 ${active ? '2px 6px' : '1px 3px'} ${color}66)`;

    let innerContent: string;
    if (imageUrl) {
        innerContent = [
            `<defs><clipPath id="epin-clip-${size}"><circle cx="${cx}" cy="${cx}" r="${innerR + 1}"/></clipPath></defs>`,
            `<image href="${imageUrl}" x="${cx - innerR - 1}" y="${cx - innerR - 1}" width="${(innerR + 1) * 2}" height="${(innerR + 1) * 2}"`,
            ` clip-path="url(#epin-clip-${size})" preserveAspectRatio="xMidYMid slice"/>`,
            `<circle cx="${cx}" cy="${cx}" r="${innerR + 1}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>`,
        ].join('');
    } else {
        innerContent = [
            `<circle cx="${cx}" cy="${cx}" r="${innerR}" fill="rgba(0,0,0,0.22)"/>`,
            `<text x="${cx}" y="${cx + fontSize * 0.4}" font-size="${fontSize}" text-anchor="middle"`,
            ` fill="rgba(255,255,255,0.95)" font-family="monospace" font-weight="bold">${glyph}</text>`,
        ].join('');
    }

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">`,
        `<path d="${makeTeardropPath(cx, cx, r, tipY)}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`,
        innerContent,
        `</svg>`,
    ].join('');

    return L.divIcon({
        className: 'arc-map-pin',
        html: `<div style="filter:${shadowStr}">${svg}</div>`,
        iconSize: [size, height],
        iconAnchor: [cx, tipY],
    });
}

// Profile image helper
export function getEntityProfileUrl(
    entity?: { images?: { type: string; thumbnail_url?: string | null; url: string }[] } | null,
): string | null {
    if (!entity?.images?.length) return null;
    const profile = entity.images.find((img) => img.type === 'profile');
    const img = profile ?? entity.images[0];
    return img.thumbnail_url ?? img.url ?? null;
}

// Floor label helper
export function floorLabel(floorNumber: number): string {
    if (floorNumber > 0) return `F${floorNumber}`;
    if (floorNumber === 0) return 'GF';
    return `B${Math.abs(floorNumber)}`;
}

export function floorLabelLong(floorNumber: number): string {
    if (floorNumber > 0) return `FLOOR ${floorNumber}`;
    if (floorNumber === 0) return 'GROUND FLOOR';
    return `BASEMENT ${Math.abs(floorNumber)}`;
}
