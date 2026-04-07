import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { REGION_TYPES, REGION_COLORS } from '@/lib/map-utils';
import { EntityPicker } from '@/components/archives/entity-picker';
import { ColorPicker } from './color-picker';
import { ConfirmButton, FieldGroup } from './shared';
import { useMapEditorStore } from './use-map-editor-store';
import type { ApiEntityMapRegion } from '@/types/api';

type RegionFormProps = {
    region: ApiEntityMapRegion;
};

export function RegionForm({ region }: RegionFormProps) {
    const universeId = useMapEditorStore((s) => s.universeId);
    const updateRegion = useMapEditorStore((s) => s.updateRegion);
    const deleteRegion = useMapEditorStore((s) => s.deleteRegion);

    const [name, setName] = useState(region.name);
    const [description, setDescription] = useState(region.description || '');
    const [regionType, setRegionType] = useState(region.region_type);
    const [color, setColor] = useState(region.color || '');
    const [fillOpacity, setFillOpacity] = useState(region.fill_opacity);
    const [entityId, setEntityId] = useState<number | null>(region.entity_id ?? null);

    useEffect(() => {
        setName(region.name);
        setDescription(region.description || '');
        setRegionType(region.region_type);
        setColor(region.color || '');
        setFillOpacity(region.fill_opacity);
        setEntityId(region.entity_id ?? null);
    }, [region.id, region.name, region.description, region.region_type, region.color, region.fill_opacity, region.entity_id]);

    const displayColor = color || REGION_COLORS[regionType] || '#94a3b8';

    const handleSave = () => {
        updateRegion(region.id, {
            name,
            description,
            region_type: regionType,
            color: color || null,
            fill_opacity: fillOpacity,
            entity_id: entityId,
        });
    };

    return (
        <div className="space-y-3">
            {/* Header with color preview */}
            <div className="flex items-center gap-2 rounded bg-[var(--arc-surface-alt)] px-2 py-1.5">
                <div
                    className="size-5 rounded-sm border border-[rgba(0,0,0,0.12)]"
                    style={{ background: displayColor + '66' }}
                />
                <div className="flex-1 min-w-0">
                    <span className="arc-mono block truncate text-[9px] font-bold tracking-wider text-[var(--arc-text)]">
                        {name || 'UNNAMED'}
                    </span>
                    <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">
                        {regionType.replace(/-/g, ' ').toUpperCase()} • {region.boundary_points.length} POINTS
                    </span>
                </div>
            </div>

            <FieldGroup label="NAME">
                <input
                    type="text"
                    className="arc-input w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Region name..."
                />
            </FieldGroup>

            <FieldGroup label="LINKED ENTITY">
                <EntityPicker
                    universeId={universeId}
                    value={entityId}
                    onChange={(id) => setEntityId(id)}
                    placeholder="Search entities..."
                />
            </FieldGroup>

            <FieldGroup label="DESCRIPTION">
                <textarea
                    className="arc-input w-full resize-none text-xs"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes..."
                />
            </FieldGroup>

            <FieldGroup label="TYPE">
                <select
                    className="arc-input w-full text-xs"
                    value={regionType}
                    onChange={(e) => setRegionType(e.target.value as typeof regionType)}
                >
                    {REGION_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t.replace(/-/g, ' ').toUpperCase()}
                        </option>
                    ))}
                </select>
            </FieldGroup>

            <FieldGroup label="COLOR">
                <ColorPicker
                    value={color}
                    onChange={setColor}
                    autoColorType={regionType}
                    autoColorSource="region"
                />
            </FieldGroup>

            <FieldGroup label="FILL OPACITY">
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="flex-1"
                        value={fillOpacity}
                        onChange={(e) => setFillOpacity(Number(e.target.value))}
                    />
                    <span className="arc-mono w-10 shrink-0 text-right text-[8px] text-[var(--arc-text-muted)]">
                        {(fillOpacity * 100).toFixed(0)}%
                    </span>
                </div>
            </FieldGroup>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-[var(--arc-border)] pt-3">
                <button
                    className="arc-mono flex flex-1 items-center justify-center gap-1.5 rounded bg-[var(--arc-accent)]/10 px-2 py-1.5 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20 transition-colors"
                    onClick={handleSave}
                >
                    <Save className="size-3" /> SAVE
                </button>
                <ConfirmButton
                    onConfirm={() => deleteRegion(region.id)}
                    label="Delete region"
                    confirmLabel="DELETE?"
                    className="flex items-center justify-center rounded bg-[var(--arc-danger)]/10 p-1.5 text-[var(--arc-danger)] hover:bg-[var(--arc-danger)]/20 transition-colors"
                    icon={<Trash2 className="size-3.5" />}
                />
            </div>
        </div>
    );
}
