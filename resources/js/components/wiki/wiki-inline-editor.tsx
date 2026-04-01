import { Loader2, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useWikiEdit } from './wiki-edit-context';

// ============================================================
// Edit mode toggle button (placed in wiki layout / page header)
// ============================================================

export function EditModeToggle({
    canEdit,
    isLocked,
    lockLabel,
}: {
    canEdit: boolean;
    isLocked?: boolean;
    lockLabel?: string;
}) {
    const { editMode, setEditMode, saving } = useWikiEdit();

    if (!canEdit) return null;

    return (
        <div className="flex items-center gap-2">
            {isLocked && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Lock className="size-3" />
                    {lockLabel ?? 'Locked'}
                </span>
            )}
            <button
                onClick={() => setEditMode(!editMode)}
                disabled={saving}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    editMode
                        ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
                }`}
            >
                <Pencil className="size-3" />
                {editMode ? 'Editing' : 'Edit'}
            </button>
        </div>
    );
}

// ============================================================
// Lock toggle button
// ============================================================

export function LockToggleButton({
    isLocked,
    onToggle,
    label,
}: {
    isLocked: boolean;
    onToggle: () => Promise<void>;
    label: string;
}) {
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try {
            await onToggle();
            toast.success(isLocked ? `${label} unlocked` : `${label} locked`);
        } catch {
            toast.error('Failed to toggle lock');
        } finally {
            setToggling(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={toggling}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 transition-colors hover:text-slate-900"
            title={isLocked ? `Unlock ${label}` : `Lock ${label}`}
        >
            {toggling ? (
                <Loader2 className="size-3 animate-spin" />
            ) : isLocked ? (
                <Lock className="size-3" />
            ) : (
                <Unlock className="size-3" />
            )}
            {isLocked ? 'Unlock' : 'Lock'}
        </button>
    );
}

// ============================================================
// Add new item button
// ============================================================

export function AddItemButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    const { editMode } = useWikiEdit();
    if (!editMode) return null;

    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1 rounded border border-dashed border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
            <Plus className="size-3.5" />
            {label}
        </button>
    );
}

// ============================================================
// Delete item button (for record/relation rows)
// ============================================================

export function DeleteItemButton({
    onDelete,
    label = 'Delete',
}: {
    onDelete: () => Promise<void>;
    label?: string;
}) {
    const { editMode } = useWikiEdit();
    const [deleting, setDeleting] = useState(false);

    if (!editMode) return null;

    const handle = async () => {
        setDeleting(true);
        try {
            await onDelete();
            toast.success('Deleted');
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <button
            onClick={handle}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-red-500 transition-colors hover:bg-red-50"
            title={label}
        >
            {deleting ? <Loader2 className="size-2.5 animate-spin" /> : <Trash2 className="size-2.5" />}
        </button>
    );
}

// ============================================================
// Utility: wrap an API call with saving state + toast
// ============================================================

export function useInlineSave() {
    const { setSaving, refreshData } = useWikiEdit();

    const save = useCallback(
        async (fn: () => Promise<unknown>, successMsg = 'Saved') => {
            setSaving(true);
            try {
                await fn();
                toast.success(successMsg);
                refreshData();
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Operation failed';
                toast.error(message);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [setSaving, refreshData],
    );

    return save;
}
