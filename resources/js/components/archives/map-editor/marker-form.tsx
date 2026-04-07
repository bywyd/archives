import { useEffect, useState } from 'react';
import { Save, Trash2, GripVertical } from 'lucide-react';
import { MARKER_TYPES, MARKER_COLORS, getEntityProfileUrl } from '@/lib/map-utils';
import { EntityPicker } from '@/components/archives/entity-picker';
import { ColorPicker } from './color-picker';
import { ConfirmButton, FieldGroup } from './shared';
import { useMapEditorStore } from './use-map-editor-store';
import type { ApiEntityMapMarker } from '@/types/api';

type MarkerFormProps = {
    marker: ApiEntityMapMarker;
};

export function MarkerForm({ marker }: MarkerFormProps) {
    const universeId = useMapEditorStore((s) => s.universeId);
    const updateMarker = useMapEditorStore((s) => s.updateMarker);
    const deleteMarker = useMapEditorStore((s) => s.deleteMarker);

    const [name, setName] = useState(marker.name);
    const [description, setDescription] = useState(marker.description || '');
    const [markerType, setMarkerType] = useState(marker.marker_type);
    const [color, setColor] = useState(marker.color || '');
    const [entityId, setEntityId] = useState<number | null>(marker.entity_id ?? null);

    // Sync when marker changes (e.g. drag-reposition)
    useEffect(() => {
        setName(marker.name);
        setDescription(marker.description || '');
        setMarkerType(marker.marker_type);
        setColor(marker.color || '');
        setEntityId(marker.entity_id ?? null);
    }, [marker.id, marker.name, marker.description, marker.marker_type, marker.color, marker.entity_id, marker.x_percent, marker.y_percent]);

    const profileUrl = getEntityProfileUrl(marker.entity);
    const displayColor = color || MARKER_COLORS[markerType] || '#94a3b8';

    const handleSave = () => {
        updateMarker(marker.id, {
            name,
            description,
            marker_type: markerType,
            color: color || null,
            entity_id: entityId,
        });
    };

    return (
        <div className="space-y-3">
            {/* Header with live preview */}
            <div className="flex items-center gap-2 rounded bg-[var(--arc-surface-alt)] px-2 py-1.5">
                {profileUrl ? (
                    <img
                        src={profileUrl}
                        alt=""
                        className="size-7 rounded-full border border-[var(--arc-border)] object-cover"
                    />
                ) : (
                    <div
                        className="size-5 rounded-full border border-[rgba(0,0,0,0.12)]"
                        style={{ background: displayColor }}
                    />
                )}
                <div className="flex-1 min-w-0">
                    <span className="arc-mono block truncate text-[9px] font-bold tracking-wider text-[var(--arc-text)]">
                        {name || 'UNNAMED'}
                    </span>
                    <span className="arc-mono text-[7px] text-[var(--arc-text-muted)]">
                        {markerType.replace(/-/g, ' ').toUpperCase()} • ({marker.x_percent.toFixed(1)}%, {marker.y_percent.toFixed(1)}%)
                    </span>
                </div>
                <GripVertical className="size-3 text-[var(--arc-text-muted)] opacity-30" />
            </div>

            <FieldGroup label="NAME">
                <input
                    type="text"
                    className="arc-input w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marker name..."
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
                    value={markerType}
                    onChange={(e) => setMarkerType(e.target.value as typeof markerType)}
                >
                    {MARKER_TYPES.map((t) => (
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
                    autoColorType={markerType}
                    autoColorSource="marker"
                />
            </FieldGroup>

            <p className="arc-mono text-[8px] text-[var(--arc-text-muted)]">
                Drag the pin on the map to reposition
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-[var(--arc-border)] pt-3">
                <button
                    className="arc-mono flex flex-1 items-center justify-center gap-1.5 rounded bg-[var(--arc-accent)]/10 px-2 py-1.5 text-[9px] font-semibold tracking-wider text-[var(--arc-accent)] hover:bg-[var(--arc-accent)]/20 transition-colors"
                    onClick={handleSave}
                >
                    <Save className="size-3" /> SAVE
                </button>
                <ConfirmButton
                    onConfirm={() => deleteMarker(marker.id)}
                    label="Delete marker"
                    confirmLabel="DELETE?"
                    className="flex items-center justify-center rounded bg-[var(--arc-danger)]/10 p-1.5 text-[var(--arc-danger)] hover:bg-[var(--arc-danger)]/20 transition-colors"
                    icon={<Trash2 className="size-3.5" />}
                />
            </div>
        </div>
    );
}
