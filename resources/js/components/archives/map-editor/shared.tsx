import { useEffect, useState } from 'react';

/** Small label + children wrapper for form fields */
export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="arc-mono text-[9px] font-bold tracking-[0.2em] text-[var(--arc-text-muted)]">
                {label}
            </span>
            {children}
        </label>
    );
}

/** Inline delete-confirm button — first click shows label, second click confirms */
export function ConfirmButton({
    onConfirm,
    label,
    confirmLabel,
    className,
    icon,
}: {
    onConfirm: () => void;
    label: string;
    confirmLabel: string;
    className?: string;
    icon?: React.ReactNode;
}) {
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (!confirming) return;
        const t = setTimeout(() => setConfirming(false), 3000);
        return () => clearTimeout(t);
    }, [confirming]);

    return (
        <button
            className={className}
            title={confirming ? confirmLabel : label}
            onClick={() => {
                if (confirming) {
                    onConfirm();
                    setConfirming(false);
                } else {
                    setConfirming(true);
                }
            }}
        >
            {confirming ? (
                <span className="arc-mono text-[8px] font-bold tracking-wider">{confirmLabel}</span>
            ) : (
                icon
            )}
        </button>
    );
}
