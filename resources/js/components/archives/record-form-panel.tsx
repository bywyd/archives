import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { EntityPicker } from '@/components/archives/entity-picker';
import * as api from '@/lib/api';
import type { RecordType } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
    universeId: number;
    entityId: number;
    recordType: RecordType;
    record?: Record<string, any> | null;
    onSaved: () => void;
    onCancel: () => void;
};

// Field definitions for each record type
type FieldDef = {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'entity' | 'number' | 'boolean' | 'tags';
    options?: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
};

const RECORD_FIELDS: Record<RecordType, FieldDef[]> = {
    'infection-records': [
        { name: 'pathogen_entity_id', label: 'Pathogen Entity', type: 'entity' },
        { name: 'pathogen_name', label: 'Pathogen Name', type: 'text', placeholder: 'e.g. T-Virus' },
        { name: 'infection_method', label: 'Infection Method', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: 'active', label: 'Active' }, { value: 'cured', label: 'Cured' }, { value: 'dormant', label: 'Dormant' },
            { value: 'fatal', label: 'Fatal' }, { value: 'mutated', label: 'Mutated' }, { value: 'partial', label: 'Partial' }, { value: 'unknown', label: 'Unknown' },
        ]},
        { name: 'severity', label: 'Severity', type: 'text' },
        { name: 'cure_entity_id', label: 'Cure Entity', type: 'entity' },
        { name: 'cure_name', label: 'Cure Name', type: 'text' },
        { name: 'cure_method', label: 'Cure Method', type: 'text' },
        { name: 'fictional_date_infected', label: 'Date Infected', type: 'text', placeholder: 'Fictional date' },
        { name: 'fictional_date_cured', label: 'Date Cured', type: 'text', placeholder: 'Fictional date' },
        { name: 'symptoms_exhibited', label: 'Symptoms', type: 'tags', placeholder: 'Add symptom...' },
        { name: 'side_effects', label: 'Side Effects', type: 'tags', placeholder: 'Add side effect...' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'mutation-stages': [
        { name: 'name', label: 'Stage Name', type: 'text', required: true },
        { name: 'stage_number', label: 'Stage Number', type: 'number', required: true },
        { name: 'trigger_entity_id', label: 'Trigger Entity', type: 'entity' },
        { name: 'trigger', label: 'Trigger', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'physical_changes', label: 'Physical Changes', type: 'tags', placeholder: 'Add change...' },
        { name: 'abilities_gained', label: 'Abilities Gained', type: 'tags', placeholder: 'Add ability...' },
        { name: 'abilities_lost', label: 'Abilities Lost', type: 'tags', placeholder: 'Add ability...' },
        { name: 'threat_level', label: 'Threat Level (1-10)', type: 'number' },
        { name: 'is_reversible', label: 'Reversible', type: 'boolean' },
        { name: 'fictional_date', label: 'Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'affiliation-history': [
        { name: 'organization_entity_id', label: 'Organization', type: 'entity' },
        { name: 'organization_name', label: 'Organization Name', type: 'text', placeholder: 'If no entity linked' },
        { name: 'role', label: 'Role', type: 'text', placeholder: 'e.g. Researcher, Agent' },
        { name: 'rank', label: 'Rank', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: 'active', label: 'Active' }, { value: 'former', label: 'Former' }, { value: 'defected', label: 'Defected' },
            { value: 'expelled', label: 'Expelled' }, { value: 'deceased', label: 'Deceased' }, { value: 'undercover', label: 'Undercover' }, { value: 'honorary', label: 'Honorary' },
        ]},
        { name: 'fictional_start', label: 'Start Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'fictional_end', label: 'End Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'quotes': [
        { name: 'quote', label: 'Quote', type: 'textarea', required: true },
        { name: 'context', label: 'Context', type: 'text', placeholder: 'When/where was this said' },
        { name: 'fictional_date', label: 'Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'is_featured', label: 'Featured', type: 'boolean' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'power-profiles': [
        { name: 'name', label: 'Power Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'source_entity_id', label: 'Source Entity', type: 'entity' },
        { name: 'source', label: 'Source', type: 'text', placeholder: 'e.g. T-Virus mutation' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: [
            { value: 'physical', label: 'Physical' }, { value: 'mental', label: 'Mental' }, { value: 'viral', label: 'Viral' },
            { value: 'technological', label: 'Technological' }, { value: 'combat', label: 'Combat' }, { value: 'supernatural', label: 'Supernatural' },
            { value: 'medical', label: 'Medical' }, { value: 'other', label: 'Other' },
        ]},
        { name: 'power_level', label: 'Power Level (0-100)', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: 'active', label: 'Active' }, { value: 'lost', label: 'Lost' }, { value: 'dormant', label: 'Dormant' },
            { value: 'evolving', label: 'Evolving' }, { value: 'artificial', label: 'Artificial' }, { value: 'temporary', label: 'Temporary' },
        ]},
        { name: 'fictional_date_acquired', label: 'Date Acquired', type: 'text', placeholder: 'Fictional date' },
        { name: 'fictional_date_lost', label: 'Date Lost', type: 'text', placeholder: 'Fictional date' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'consciousness-records': [
        { name: 'vessel_entity_id', label: 'Vessel Entity', type: 'entity' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
            { value: 'active', label: 'Active' }, { value: 'transferred', label: 'Transferred' }, { value: 'dormant', label: 'Dormant' },
            { value: 'fragmented', label: 'Fragmented' }, { value: 'merged', label: 'Merged' }, { value: 'destroyed', label: 'Destroyed' },
            { value: 'digital', label: 'Digital' }, { value: 'shared', label: 'Shared' },
        ]},
        { name: 'transfer_method', label: 'Transfer Method', type: 'text' },
        { name: 'vessel_status', label: 'Vessel Status', type: 'select', options: [
            { value: '', label: '' }, { value: 'original', label: 'Original' }, { value: 'new', label: 'New' }, { value: 'cloned', label: 'Cloned' },
            { value: 'synthetic', label: 'Synthetic' }, { value: 'decaying', label: 'Decaying' }, { value: 'deceased', label: 'Deceased' }, { value: 'overwritten', label: 'Overwritten' },
        ]},
        { name: 'fictional_date_start', label: 'Start Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'fictional_date_end', label: 'End Date', type: 'text', placeholder: 'Fictional date' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'side_effects', label: 'Side Effects', type: 'tags', placeholder: 'Add side effect...' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'intelligence-records': [
        { name: 'observer_entity_id', label: 'Observer', type: 'entity', required: true },
        { name: 'subject_entity_id', label: 'Subject', type: 'entity' },
        { name: 'classification', label: 'Classification', type: 'select', required: true, options: [
            { value: 'known', label: 'Known' }, { value: 'unknown', label: 'Unknown' }, { value: 'classified', label: 'Classified' },
            { value: 'redacted', label: 'Redacted' }, { value: 'partial', label: 'Partial' }, { value: 'rumored', label: 'Rumored' }, { value: 'discovered', label: 'Discovered' },
        ]},
        { name: 'discovered_during', label: 'Discovered During', type: 'text' },
        { name: 'intelligence_summary', label: 'Intelligence Summary', type: 'textarea' },
        { name: 'redacted_details', label: 'Redacted Details', type: 'textarea' },
        { name: 'source', label: 'Source', type: 'text' },
        { name: 'reliability', label: 'Reliability', type: 'select', options: [
            { value: '', label: '' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'suspected', label: 'Suspected' },
            { value: 'unverified', label: 'Unverified' }, { value: 'disinformation', label: 'Disinformation' },
        ]},
        { name: 'fictional_date_learned', label: 'Date Learned', type: 'text', placeholder: 'Fictional date' },
        { name: 'fictional_date_declassified', label: 'Date Declassified', type: 'text', placeholder: 'Fictional date' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'death-records': [
        { name: 'death_type', label: 'Death Type', type: 'select', required: true, options: [
            { value: 'killed', label: 'Killed' }, { value: 'sacrificed', label: 'Sacrificed' }, { value: 'executed', label: 'Executed' }, { value: 'suicide', label: 'Suicide' },
            { value: 'accidental', label: 'Accidental' }, { value: 'presumed', label: 'Presumed' }, { value: 'mutation-death', label: 'Mutation Death' }, { value: 'disintegrated', label: 'Disintegrated' },
        ]},
        { name: 'killer_entity_id', label: 'Killer', type: 'entity' },
        { name: 'incident_entity_id', label: 'Incident', type: 'entity' },
        { name: 'location_entity_id', label: 'Location', type: 'entity' },
        { name: 'cause_of_death', label: 'Cause of Death', type: 'text' },
        { name: 'circumstances', label: 'Circumstances', type: 'textarea' },
        { name: 'fictional_date', label: 'Date of Death', type: 'text', placeholder: 'Fictional date' },
        { name: 'is_confirmed', label: 'Confirmed', type: 'boolean' },
        { name: 'is_revived', label: 'Revived', type: 'boolean' },
        { name: 'revival_method', label: 'Revival Method', type: 'text' },
        { name: 'fictional_date_revived', label: 'Date Revived', type: 'text', placeholder: 'Fictional date' },
        { name: 'revival_circumstances', label: 'Revival Circumstances', type: 'textarea' },
        { name: 'revived_by_entity_id', label: 'Revived By', type: 'entity' },
        { name: 'body_modifications', label: 'Body Modifications', type: 'tags', placeholder: 'Add modification...' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'transmission-participants': [
        { name: 'participant_entity_id', label: 'Participant', type: 'entity', required: true },
        { name: 'role', label: 'Role', type: 'select', required: true, options: [
            { value: 'speaker', label: 'Speaker' }, { value: 'listener', label: 'Listener' }, { value: 'interceptor', label: 'Interceptor' },
            { value: 'location', label: 'Location' }, { value: 'mentioned', label: 'Mentioned' }, { value: 'moderator', label: 'Moderator' },
        ]},
        { name: 'callsign', label: 'Callsign', type: 'text' },
        { name: 'channel', label: 'Channel', type: 'text' },
        { name: 'is_present', label: 'Present', type: 'boolean' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    'transmission-records': [
        { name: 'speaker_entity_id', label: 'Speaker', type: 'entity' },
        { name: 'speaker_label', label: 'Speaker Label', type: 'text', placeholder: 'Override label' },
        { name: 'content', label: 'Content', type: 'textarea', required: true },
        { name: 'content_type', label: 'Content Type', type: 'select', required: true, options: [
            { value: 'dialogue', label: 'Dialogue' }, { value: 'narration', label: 'Narration' }, { value: 'action', label: 'Action' },
            { value: 'static', label: 'Static' }, { value: 'system', label: 'System' }, { value: 'redacted', label: 'Redacted' },
        ]},
        { name: 'tone', label: 'Tone', type: 'text', placeholder: 'e.g. urgent, calm' },
        { name: 'fictional_timestamp', label: 'Timestamp', type: 'text', placeholder: 'Fictional timestamp' },
        { name: 'is_redacted', label: 'Redacted', type: 'boolean' },
        { name: 'redacted_reason', label: 'Redaction Reason', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
};

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
    'infection-records': 'Infection Record',
    'mutation-stages': 'Mutation Stage',
    'affiliation-history': 'Affiliation',
    'quotes': 'Quote',
    'power-profiles': 'Power Profile',
    'consciousness-records': 'Consciousness Record',
    'intelligence-records': 'Intelligence Record',
    'death-records': 'Death Record',
    'transmission-participants': 'Transmission Participant',
    'transmission-records': 'Transmission Record',
};

export function RecordFormPanel({ universeId, entityId, recordType, record, onSaved, onCancel }: Props) {
    const fields = RECORD_FIELDS[recordType];
    const isEditing = !!record?.id;
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        if (record) {
            const d: Record<string, any> = {};
            for (const f of fields) {
                if (f.type === 'entity') {
                    d[f.name] = record[f.name] ?? null;
                } else {
                    d[f.name] = record[f.name] ?? (f.type === 'boolean' ? false : f.type === 'tags' ? [] : '');
                }
            }
            return d;
        }
        const d: Record<string, any> = {};
        for (const f of fields) {
            d[f.name] = f.type === 'boolean' ? false : f.type === 'tags' ? [] : f.type === 'number' ? '' : '';
        }
        return d;
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setField = (name: string, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        // Prepare payload  strip empty strings, convert types
        const payload: Record<string, any> = {};
        for (const f of fields) {
            const val = formData[f.name];
            if (f.type === 'entity') {
                payload[f.name] = val || null;
            } else if (f.type === 'number') {
                payload[f.name] = val !== '' ? Number(val) : null;
            } else if (f.type === 'boolean') {
                payload[f.name] = !!val;
            } else if (f.type === 'tags') {
                payload[f.name] = Array.isArray(val) ? val : [];
            } else if (f.type === 'select' && val === '') {
                payload[f.name] = null;
            } else {
                payload[f.name] = val || null;
            }
        }

        try {
            if (isEditing) {
                await api.updateEntityRecord(universeId, entityId, recordType, record!.id, payload);
            } else {
                await api.createEntityRecord(universeId, entityId, recordType, payload);
            }
            onSaved();
        } catch (err: any) {
            if (err.body?.errors) {
                const e: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(err.body.errors)) {
                    e[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
                }
                setErrors(e);
            } else {
                setErrors({ _form: err.body?.message || err.message || 'Failed to save' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--arc-border)] pb-2">
                <h4 className="arc-mono text-[10px] font-bold tracking-[0.15em] text-[var(--arc-accent)]">
                    {isEditing ? 'EDIT' : 'NEW'} {RECORD_TYPE_LABELS[recordType].toUpperCase()}
                </h4>
                <button type="button" onClick={onCancel} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-text)]">
                    <X className="size-4" />
                </button>
            </div>

            {errors._form && (
                <div className="rounded border border-[var(--arc-danger)]/30 bg-[var(--arc-danger)]/5 px-3 py-1.5 text-xs text-[var(--arc-danger)]">
                    {errors._form}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {fields.map((field) => (
                    <div key={field.name} className={cn('space-y-1', (field.type === 'textarea' || field.type === 'tags') && 'col-span-2')}>
                        <label className="arc-mono text-[10px] font-medium tracking-wider text-[var(--arc-text-muted)]">
                            {field.label}
                            {field.required && <span className="ml-0.5 text-[var(--arc-danger)]">*</span>}
                        </label>

                        {field.type === 'text' && (
                            <input
                                type="text"
                                value={formData[field.name] ?? ''}
                                onChange={(e) => setField(field.name, e.target.value)}
                                placeholder={field.placeholder}
                                className="arc-input text-xs"
                            />
                        )}

                        {field.type === 'textarea' && (
                            <textarea
                                value={formData[field.name] ?? ''}
                                onChange={(e) => setField(field.name, e.target.value)}
                                placeholder={field.placeholder}
                                rows={3}
                                className="arc-input text-xs"
                            />
                        )}

                        {field.type === 'number' && (
                            <input
                                type="number"
                                value={formData[field.name] ?? ''}
                                onChange={(e) => setField(field.name, e.target.value)}
                                className="arc-input text-xs"
                            />
                        )}

                        {field.type === 'select' && (
                            <select
                                value={formData[field.name] ?? ''}
                                onChange={(e) => setField(field.name, e.target.value)}
                                className="arc-input text-xs"
                            >
                                {!field.required && <option value=""></option>}
                                {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}

                        {field.type === 'boolean' && (
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!formData[field.name]}
                                    onChange={(e) => setField(field.name, e.target.checked)}
                                    className="size-3.5 rounded border-[var(--arc-border)]"
                                />
                                <span className="text-xs text-[var(--arc-text)]">Yes</span>
                            </label>
                        )}

                        {field.type === 'entity' && (
                            <EntityPicker
                                universeId={universeId}
                                value={formData[field.name]}
                                onChange={(id) => setField(field.name, id)}
                            />
                        )}

                        {field.type === 'tags' && (
                            <TagsInput
                                value={formData[field.name] ?? []}
                                onChange={(val) => setField(field.name, val)}
                                placeholder={field.placeholder}
                            />
                        )}

                        {errors[field.name] && (
                            <p className="text-[10px] text-[var(--arc-danger)]">{errors[field.name]}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--arc-border)] pt-3">
                <button type="button" onClick={onCancel} className="arc-btn text-xs">
                    Cancel
                </button>
                <button type="submit" disabled={saving} className="arc-btn arc-btn-primary text-xs">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    {isEditing ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
}

// --- Tags Input (string array) ---

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
    const [input, setInput] = useState('');

    const add = () => {
        const trimmed = input.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInput('');
    };

    const remove = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-1">
            <div className="flex gap-1">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                    className="arc-input flex-1 text-xs"
                />
                <button type="button" onClick={add} className="arc-btn text-xs">
                    <Plus className="size-3" />
                </button>
            </div>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {value.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded border border-[var(--arc-border)] bg-[var(--arc-surface-alt)] px-1.5 py-0.5 text-[10px]">
                            {tag}
                            <button type="button" onClick={() => remove(idx)} className="text-[var(--arc-text-muted)] hover:text-[var(--arc-danger)]">
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export { RECORD_FIELDS, RECORD_TYPE_LABELS };
