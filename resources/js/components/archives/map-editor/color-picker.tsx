import { cn } from '@/lib/utils';
import { MARKER_COLORS, REGION_COLORS } from '@/lib/map-utils';

const COLOR_PRESETS = [
    '#3b82f6', '#60a5fa', '#34d399', '#10b981',
    '#f59e0b', '#fbbf24', '#f87171', '#ef4444',
    '#a78bfa', '#8b5cf6', '#fb923c', '#22d3ee',
    '#1e293b', '#64748b', '#e2e8f0', '#ffffff',
] as const;

type ColorPickerProps = {
    value: string;
    onChange: (hex: string) => void;
    /** Pass a marker_type or region_type to show the "Auto" default color */
    autoColorType?: string;
    autoColorSource?: 'marker' | 'region';
};

export function ColorPicker({ value, onChange, autoColorType, autoColorSource }: ColorPickerProps) {
    const autoColor = autoColorType
        ? (autoColorSource === 'region' ? REGION_COLORS : MARKER_COLORS)[autoColorType] ?? null
        : null;

    const isAuto = !value;

    return (
        <div className="space-y-1.5">
            {/* Auto color option */}
            {autoColor && (
                <button
                    type="button"
                    className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors',
                        isAuto
                            ? 'bg-[var(--arc-accent)]/10 text-[var(--arc-accent)]'
                            : 'text-[var(--arc-text-muted)] hover:bg-[var(--arc-surface-hover)]',
                    )}
                    onClick={() => onChange('')}
                >
                    <div
                        className="size-4 rounded border border-[rgba(0,0,0,0.12)]"
                        style={{ background: autoColor }}
                    />
                    <span className="arc-mono text-[8px] font-bold tracking-[0.15em]">
                        AUTO ({autoColor.toUpperCase()})
                    </span>
                </button>
            )}

            {/* Preset grid */}
            <div className="grid grid-cols-8 gap-1">
                {COLOR_PRESETS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        title={c}
                        className={cn(
                            'size-5 rounded border-2 transition-transform hover:scale-110',
                            value.toLowerCase() === c.toLowerCase()
                                ? 'border-[var(--arc-accent)] scale-110'
                                : 'border-transparent',
                        )}
                        style={{ background: c }}
                        onClick={() => onChange(c)}
                    />
                ))}
            </div>

            {/* Hex input */}
            <input
                type="text"
                className="arc-input w-full text-xs"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={autoColor ? `Auto: ${autoColor}` : '#hex color'}
            />
        </div>
    );
}
