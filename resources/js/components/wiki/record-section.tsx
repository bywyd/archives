import { RecordFormPanel } from '@/components/archives/record-form-panel';
import { AddItemButton } from '@/components/wiki/wiki-inline-editor';
import type { RecordType } from '@/lib/api';

/**
 * Renders a record section with inline add/edit, sharing a parent activeRecord state.
 * Keeps the 3-block pattern (component + create form + add button) in one call.
 */
export function RecordBlock({
    type,
    label,
    records,
    universeId,
    entityId,
    universeSlug,
    editMode,
    activeRecord,
    setActiveRecord,
    deleteRecord,
    save,
    children,
}: {
    type: RecordType;
    label: string;
    records: any[];
    universeId: number;
    entityId: number;
    universeSlug: string;
    editMode: boolean;
    activeRecord: { type: RecordType; id: number | null; record: Record<string, any> | null } | null;
    setActiveRecord: (v: { type: RecordType; id: number | null; record: Record<string, any> | null } | null) => void;
    deleteRecord: (type: RecordType) => (id: number) => Promise<void>;
    save: (fn: () => Promise<any>, msg: string) => Promise<void>;
    children: (props: {
        onDelete?: (id: number) => Promise<void>;
        onEdit?: (r: any) => void;
        editingId: number | null;
        renderEditForm: (r: any) => React.ReactNode;
    }) => React.ReactNode;
}) {
    const isActive = activeRecord?.type === type;

    return (
        <>
            {children({
                onDelete: editMode ? deleteRecord(type) : undefined,
                onEdit: editMode ? (r: any) => setActiveRecord({ type, id: r.id, record: r }) : undefined,
                editingId: isActive ? activeRecord!.id : null,
                renderEditForm: (r: any) => (
                    <RecordFormPanel
                        universeId={universeId}
                        entityId={entityId}
                        recordType={type}
                        record={r}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record updated'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                ),
            })}
            {editMode && isActive && activeRecord!.id === null && (
                <div className="mb-6">
                    <RecordFormPanel
                        universeId={universeId}
                        entityId={entityId}
                        recordType={type}
                        onSaved={() => { setActiveRecord(null); save(() => Promise.resolve(), 'Record created'); }}
                        onCancel={() => setActiveRecord(null)}
                    />
                </div>
            )}
            {editMode && !isActive && (
                <div className="mt-2 mb-6">
                    <AddItemButton label={`Add ${label}`} onClick={() => setActiveRecord({ type, id: null, record: null })} />
                </div>
            )}
        </>
    );
}
