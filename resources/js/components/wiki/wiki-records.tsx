import { Link } from '@inertiajs/react';
import { Activity, Brain, Building2, Edit3, FileSearch, GitBranch, Loader2, MessageSquare, Radio, Skull, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { EntityHoverLink } from '@/components/shared/entity-preview-card';
import type {
    ApiEntityAffiliationHistory,
    ApiEntityConsciousnessRecord,
    ApiEntityDeathRecord,
    ApiEntityInfectionRecord,
    ApiEntityIntelligenceRecord,
    ApiEntityMutationStage,
    ApiEntityPowerProfile,
    ApiEntityQuote,
    ApiEntitySummary,
    ApiEntityTransmissionRecord,
    ApiEntityTransmissionRelation,
} from '@/types/api';

type EntityLinkProps = { entity?: ApiEntitySummary | null; fallback?: string | null; universeSlug: string };

function EntityLink({ entity, fallback, universeSlug }: EntityLinkProps) {
    if (entity) {
        return (
            <EntityHoverLink slug={entity.slug} universeSlug={universeSlug} href={`/w/${universeSlug}/${entity.slug}`}>
                {entity.name}
            </EntityHoverLink>
        );
    }
    return <span>{fallback ?? ''}</span>;
}

// Absolute-positioned edit/delete for card-based records
function RecordCardActions({ record, onDelete, onEdit }: { record: Record<string, any>; onDelete?: (id: number) => Promise<void>; onEdit?: (record: Record<string, any>) => void }) {
    const [busy, setBusy] = useState(false);
    if (!onDelete && !onEdit) return null;
    return (
        <div className="absolute right-2 top-2 flex items-center gap-1">
            {onEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                    className="shrink-0 rounded p-0.5 text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                >
                    <Edit3 className="size-3" />
                </button>
            )}
            {onDelete && (
                <button
                    onClick={async (e) => { e.stopPropagation(); setBusy(true); try { await onDelete(record.id); } catch {} finally { setBusy(false); } }}
                    disabled={busy}
                    className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                >
                    {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </button>
            )}
        </div>
    );
}

// Inline edit/delete for table row actions
function RecordRowActions({ record, onDelete, onEdit }: { record: Record<string, any>; onDelete?: (id: number) => Promise<void>; onEdit?: (record: Record<string, any>) => void }) {
    const [busy, setBusy] = useState(false);
    if (!onDelete && !onEdit) return null;
    return (
        <div className="flex items-center gap-1">
            {onEdit && (
                <button
                    onClick={() => onEdit(record)}
                    className="shrink-0 rounded p-0.5 text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                >
                    <Edit3 className="size-3" />
                </button>
            )}
            {onDelete && (
                <button
                    onClick={async () => { setBusy(true); try { await onDelete(record.id); } catch {} finally { setBusy(false); } }}
                    disabled={busy}
                    className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                >
                    {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </button>
            )}
        </div>
    );
}

const Badge = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap" style={style}>
        {children}
    </span>
);

const SectionHeading = ({ id, icon: Icon, children }: { id: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-slate-900 pb-2 border-b-2 border-blue-100 mb-4 flex items-center gap-2">
        {Icon && <Icon className="size-5 text-slate-400 shrink-0" />}
        <a href={`#${id}`} className="hover:text-blue-600 transition-colors">{children}</a>
    </h2>
);

const RecordCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative bg-white border border-slate-200 rounded-lg p-4 mb-3 transition-all shadow-sm hover:border-blue-100 hover:shadow ${className}`}>
        {children}
    </div>
);

const Th = ({ children }: { children?: React.ReactNode }) => (
    <th className="bg-slate-50 px-3.5 py-2.5 text-left font-semibold text-[0.6875rem] uppercase tracking-wide text-slate-500 border-b border-slate-200">{children}</th>
);

const Td = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
    <td className={`px-3.5 py-2.5 border-b border-slate-100 align-middle ${className}`}>{children}</td>
);

// --- Infection Records ---

export function WikiInfectionRecords({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityInfectionRecord[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityInfectionRecord) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-infections">
            <SectionHeading id="section-infections" icon={Activity}>Infection Records</SectionHeading>
            <div className="space-y-3">
                {records.map((r) =>
                    editingId === r.id && renderEditForm ? (
                        <div key={r.id} className="mb-3">{renderEditForm(r)}</div>
                    ) : (
                        <RecordCard key={r.id}>
                            <RecordCardActions record={r} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex items-center gap-2">
                                <Badge>{r.status}</Badge>
                                {r.severity && <span className="text-xs text-slate-500">Severity: {r.severity}</span>}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div><span className="text-slate-400">Pathogen:</span> <EntityLink entity={r.pathogen} fallback={r.pathogen_name} universeSlug={universeSlug} /></div>
                                <div><span className="text-slate-400">Method:</span> {r.infection_method ?? ''}</div>
                                <div><span className="text-slate-400">Cure:</span> <EntityLink entity={r.cure} fallback={r.cure_name} universeSlug={universeSlug} /></div>
                                <div><span className="text-slate-400">Cure Method:</span> {r.cure_method ?? ''}</div>
                            </div>
                            {r.symptoms_exhibited && r.symptoms_exhibited.length > 0 && (
                                <div className="mt-1 text-xs"><span className="text-slate-400">Symptoms:</span> {r.symptoms_exhibited.join(', ')}</div>
                            )}
                            {r.notes && <p className="mt-1 text-xs text-slate-500">{r.notes}</p>}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Mutation Stages ---

export function WikiMutationStages({
    stages, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    stages: ApiEntityMutationStage[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityMutationStage) => React.ReactNode;
}) {
    if (stages.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-mutations">
            <SectionHeading id="section-mutations" icon={GitBranch}>Mutation Stages</SectionHeading>
            <div className="space-y-3">
                {stages.sort((a, b) => a.stage_number - b.stage_number).map((s) =>
                    editingId === s.id && renderEditForm ? (
                        <div key={s.id} className="mb-3">{renderEditForm(s)}</div>
                    ) : (
                        <RecordCard key={s.id}>
                            <RecordCardActions record={s} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs">Stage {s.stage_number}: {s.name}</span>
                                {s.threat_level != null && <Badge>Threat: {s.threat_level}/10</Badge>}
                            </div>
                            {s.trigger && <div className="mt-1 text-xs"><span className="text-slate-400">Trigger:</span> {s.trigger}</div>}
                            {s.trigger_entity && (
                                <div className="mt-0.5 text-xs"><span className="text-slate-400">Trigger Entity:</span> <EntityLink entity={s.trigger_entity} universeSlug={universeSlug} /></div>
                            )}
                            {s.description && <p className="mt-1 text-xs text-slate-500">{s.description}</p>}
                            {s.physical_changes && s.physical_changes.length > 0 && (
                                <div className="mt-1 text-xs"><span className="text-slate-400">Physical Changes:</span> {s.physical_changes.join(', ')}</div>
                            )}
                            {s.abilities_gained && s.abilities_gained.length > 0 && (
                                <div className="mt-0.5 text-xs"><span className="text-slate-400">Abilities Gained:</span> {s.abilities_gained.join(', ')}</div>
                            )}
                            {s.abilities_lost && s.abilities_lost.length > 0 && (
                                <div className="mt-0.5 text-xs"><span className="text-slate-400">Abilities Lost:</span> {s.abilities_lost.join(', ')}</div>
                            )}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Affiliation History ---

export function WikiAffiliations({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityAffiliationHistory[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityAffiliationHistory) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    const hasActions = !!(onDelete || onEdit);
    const colSpan = hasActions ? 6 : 5;
    return (
        <div className="mb-8 scroll-mt-20" id="section-affiliations">
            <SectionHeading id="section-affiliations" icon={Building2}>Affiliation History</SectionHeading>
            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-[0.8125rem] [&_tbody_tr:last-child_td]:border-b-0">
                    <thead>
                        <tr><Th>Organization</Th><Th>Role</Th><Th>Rank</Th><Th>Period</Th><Th>Status</Th>{hasActions && <Th></Th>}</tr>
                    </thead>
                    <tbody>
                        {records.map((r) =>
                            editingId === r.id && renderEditForm ? (
                                <tr key={r.id}>
                                    <td colSpan={colSpan} className="border-b border-slate-100 p-3">
                                        {renderEditForm(r)}
                                    </td>
                                </tr>
                            ) : (
                                <tr key={r.id} className="transition-colors hover:bg-blue-50/50">
                                    <Td><EntityLink entity={r.organization} fallback={r.organization_name} universeSlug={universeSlug} /></Td>
                                    <Td>{r.role ?? ''}</Td>
                                    <Td>{r.rank ?? ''}</Td>
                                    <Td className="text-slate-400">{r.fictional_start ?? '?'} - {r.fictional_end ?? 'present'}</Td>
                                    <Td><Badge>{r.status}</Badge></Td>
                                    {hasActions && (
                                        <Td>
                                            <RecordRowActions record={r} onDelete={onDelete} onEdit={onEdit} />
                                        </Td>
                                    )}
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Death Records ---

export function WikiDeathRecords({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityDeathRecord[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityDeathRecord) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-deaths">
            <SectionHeading id="section-deaths" icon={Skull}>Death Records</SectionHeading>
            <div className="space-y-3">
                {records.map((r) =>
                    editingId === r.id && renderEditForm ? (
                        <div key={r.id} className="mb-3">{renderEditForm(r)}</div>
                    ) : (
                        <RecordCard key={r.id}>
                            <RecordCardActions record={r} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex items-center gap-2">
                                <Badge>{r.death_type}</Badge>
                                {r.is_confirmed ? (
                                    <span className="text-[10px] text-red-500">Confirmed</span>
                                ) : (
                                    <span className="text-[10px] text-amber-500">Unconfirmed</span>
                                )}
                                {r.is_revived && <span className="text-[10px] text-green-500">Revived</span>}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {r.killer && <div><span className="text-slate-400">Killed by:</span> <EntityLink entity={r.killer} universeSlug={universeSlug} /></div>}
                                {r.location && <div><span className="text-slate-400">Location:</span> <EntityLink entity={r.location} universeSlug={universeSlug} /></div>}
                                {r.cause_of_death && <div><span className="text-slate-400">Cause:</span> {r.cause_of_death}</div>}
                                {r.fictional_date && <div><span className="text-slate-400">Date:</span> {r.fictional_date}</div>}
                            </div>
                            {r.circumstances && <p className="mt-1 text-xs text-slate-500">{r.circumstances}</p>}
                            {r.is_revived && r.revival_method && (
                                <div className="mt-2 rounded-md bg-green-50 p-2.5 text-xs border border-green-100">
                                    <span className="font-medium text-green-700">Revival:</span> {r.revival_method}
                                    {r.revived_by && <> by <EntityLink entity={r.revived_by} universeSlug={universeSlug} /></>}
                                </div>
                            )}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Power Profiles ---

export function WikiPowerProfiles({
    profiles, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    profiles: ApiEntityPowerProfile[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityPowerProfile) => React.ReactNode;
}) {
    if (profiles.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-powers">
            <SectionHeading id="section-powers" icon={Zap}>Power Profiles</SectionHeading>
            <div className="space-y-3">
                {profiles.map((p) =>
                    editingId === p.id && renderEditForm ? (
                        <div key={p.id} className="mb-3">{renderEditForm(p)}</div>
                    ) : (
                        <RecordCard key={p.id}>
                            <RecordCardActions record={p} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs">{p.name}</span>
                                <Badge>{p.category}</Badge>
                                <Badge>{p.status}</Badge>
                                {p.power_level != null && <span className="text-[10px] text-slate-400">Level {p.power_level}/10</span>}
                            </div>
                            {p.source && <div className="mt-1 text-xs"><span className="text-slate-400">Source:</span> {p.source}</div>}
                            {p.source_entity && (
                                <div className="mt-0.5 text-xs"><span className="text-slate-400">Source Entity:</span> <EntityLink entity={p.source_entity} universeSlug={universeSlug} /></div>
                            )}
                            {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Consciousness Records ---

export function WikiConsciousnessRecords({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityConsciousnessRecord[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityConsciousnessRecord) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-consciousness">
            <SectionHeading id="section-consciousness" icon={Brain}>Consciousness Records</SectionHeading>
            <div className="space-y-3">
                {records.map((r) =>
                    editingId === r.id && renderEditForm ? (
                        <div key={r.id} className="mb-3">{renderEditForm(r)}</div>
                    ) : (
                        <RecordCard key={r.id}>
                            <RecordCardActions record={r} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex items-center gap-2">
                                <Badge>{r.status}</Badge>
                                {r.vessel_status && <span className="text-[10px] text-slate-400">Vessel: {r.vessel_status}</span>}
                            </div>
                            {r.vessel && <div className="mt-1 text-xs"><span className="text-slate-400">Vessel:</span> <EntityLink entity={r.vessel} universeSlug={universeSlug} /></div>}
                            {r.transfer_method && <div className="mt-0.5 text-xs"><span className="text-slate-400">Transfer Method:</span> {r.transfer_method}</div>}
                            {r.description && <p className="mt-1 text-xs text-slate-500">{r.description}</p>}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Quotes ---

export function WikiQuotes({
    quotes, onDelete, onEdit, editingId, renderEditForm,
}: {
    quotes: ApiEntityQuote[];
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityQuote) => React.ReactNode;
}) {
    if (quotes.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-quotes">
            <SectionHeading id="section-quotes" icon={MessageSquare}>Quotes</SectionHeading>
            <div className="space-y-3">
                {quotes.map((q) =>
                    editingId === q.id && renderEditForm ? (
                        <div key={q.id} className="mb-3">{renderEditForm(q)}</div>
                    ) : (
                        <blockquote key={q.id} className="relative border-l-4 border-blue-200 bg-blue-50/50 pl-8 py-4 my-2 italic text-sm text-slate-700 rounded-r-md">
                            <span className="absolute left-2 top-1 text-4xl text-blue-200 font-serif leading-none select-none" aria-hidden="true">&#8220;</span>
                            <RecordCardActions record={q} onDelete={onDelete} onEdit={onEdit} />
                            <p>{q.quote}</p>
                            {(q.context || q.source_media) && (
                                <footer className="mt-1 text-[10px] text-slate-400 not-italic">
                                    {q.context}
                                    {q.source_media && <> - <em>{q.source_media.name}</em></>}
                                </footer>
                            )}
                        </blockquote>
                    )
                )}
            </div>
        </div>
    );
}

// --- Intelligence Records ---

const CLASSIFICATION_COLORS: Record<string, string> = {
    classified: 'border-red-200 text-red-600 bg-red-50',
    redacted: 'border-gray-300 text-gray-500 bg-gray-100',
    unknown: 'border-amber-200 text-amber-600 bg-amber-50',
    partial: 'border-yellow-200 text-yellow-600 bg-yellow-50',
    rumored: 'border-purple-200 text-purple-600 bg-purple-50',
    known: 'border-green-200 text-green-600 bg-green-50',
    discovered: 'border-blue-200 text-blue-600 bg-blue-50',
};

export function WikiIntelligenceRecords({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityIntelligenceRecord[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityIntelligenceRecord) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-intelligence">
            <SectionHeading id="section-intelligence" icon={FileSearch}>Intelligence Records</SectionHeading>
            <div className="space-y-3">
                {records.map((r) =>
                    editingId === r.id && renderEditForm ? (
                        <div key={r.id} className="mb-3">{renderEditForm(r)}</div>
                    ) : (
                        <RecordCard key={r.id}>
                            <RecordCardActions record={r} onDelete={onDelete} onEdit={onEdit} />
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border whitespace-nowrap ${CLASSIFICATION_COLORS[r.classification] ?? 'border-slate-200 text-slate-500 bg-white'}`}>
                                    {r.classification}
                                </span>
                                {r.reliability && <Badge>{r.reliability}</Badge>}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {r.observer && <div><span className="text-slate-400">Observer:</span> <EntityLink entity={r.observer} universeSlug={universeSlug} /></div>}
                                {r.subject && <div><span className="text-slate-400">Subject:</span> <EntityLink entity={r.subject} universeSlug={universeSlug} /></div>}
                                {r.discovered_during && <div><span className="text-slate-400">Discovered during:</span> {r.discovered_during}</div>}
                                {r.source && <div><span className="text-slate-400">Source:</span> {r.source}</div>}
                                {r.fictional_date_learned && <div><span className="text-slate-400">Date learned:</span> {r.fictional_date_learned}</div>}
                                {r.fictional_date_declassified && <div><span className="text-slate-400">Declassified:</span> {r.fictional_date_declassified}</div>}
                            </div>
                            {r.intelligence_summary && (
                                <p className="mt-2 text-xs text-slate-700 leading-relaxed">{r.intelligence_summary}</p>
                            )}
                            {r.classification === 'redacted' && r.redacted_details && (
                                <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-400 select-none">
                                    ████ {r.redacted_details} ████
                                </div>
                            )}
                        </RecordCard>
                    )
                )}
            </div>
        </div>
    );
}

// --- Transmission Participants ---

const ROLE_COLORS: Record<string, string> = {
    speaker: 'border-blue-200 text-blue-600 bg-blue-50',
    listener: 'border-green-200 text-green-600 bg-green-50',
    interceptor: 'border-orange-200 text-orange-600 bg-orange-50',
    location: 'border-slate-200 text-slate-600 bg-slate-50',
    mentioned: 'border-purple-200 text-purple-600 bg-purple-50',
    moderator: 'border-indigo-200 text-indigo-600 bg-indigo-50',
};

export function WikiTransmissionParticipants({
    participants, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    participants: ApiEntityTransmissionRelation[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityTransmissionRelation) => React.ReactNode;
}) {
    if (participants.length === 0) return null;
    const hasActions = !!(onDelete || onEdit);
    const colSpan = hasActions ? 5 : 4;
    return (
        <div className="mb-8 scroll-mt-20" id="section-transmission-participants">
            <SectionHeading id="section-transmission-participants" icon={Radio}>Transmission Participants</SectionHeading>
            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-[0.8125rem] [&_tbody_tr:last-child_td]:border-b-0">
                    <thead>
                        <tr><Th>Participant</Th><Th>Role</Th><Th>Callsign / Channel</Th><Th>Present</Th>{hasActions && <Th></Th>}</tr>
                    </thead>
                    <tbody>
                        {[...participants].sort((a, b) => a.sort_order - b.sort_order).map((p) =>
                            editingId === p.id && renderEditForm ? (
                                <tr key={p.id}>
                                    <td colSpan={colSpan} className="border-b border-slate-100 p-3">
                                        {renderEditForm(p)}
                                    </td>
                                </tr>
                            ) : (
                                <tr key={p.id} className="transition-colors hover:bg-blue-50/50">
                                    <Td>
                                        {p.participant
                                            ? <EntityLink entity={p.participant} universeSlug={universeSlug} />
                                            : <span className="text-slate-400">-</span>}
                                    </Td>
                                    <Td>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border whitespace-nowrap ${ROLE_COLORS[p.role] ?? 'border-slate-200 text-slate-500 bg-white'}`}>
                                            {p.role}
                                        </span>
                                    </Td>
                                    <Td className="text-slate-500">
                                        {p.callsign && <span className="mr-2 font-mono text-[11px]">{p.callsign}</span>}
                                        {p.channel && <span className="text-slate-400">{p.channel}</span>}
                                    </Td>
                                    <Td>
                                        {p.is_present
                                            ? <span className="text-[10px] font-medium text-green-600">Yes</span>
                                            : <span className="text-[10px] text-slate-400">No</span>}
                                    </Td>
                                    {hasActions && (
                                        <Td><RecordRowActions record={p} onDelete={onDelete} onEdit={onEdit} /></Td>
                                    )}
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Transmission Log ---

const CONTENT_TYPE_TEXT: Record<string, string> = {
    dialogue: 'text-slate-800 italic',
    narration: 'text-slate-500',
    action: 'text-orange-600 font-medium',
    static: 'text-gray-400 font-mono',
    system: 'text-indigo-500 font-mono text-[10px]',
    redacted: 'text-red-300 font-mono',
};

function TxDeleteBtn({ onDelete }: { onDelete: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <button
            onClick={async () => { setBusy(true); try { await onDelete(); } catch {} finally { setBusy(false); } }}
            disabled={busy}
            className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
    );
}

export function WikiTransmissionRecords({
    records, universeSlug, onDelete, onEdit, editingId, renderEditForm,
}: {
    records: ApiEntityTransmissionRecord[];
    universeSlug: string;
    onDelete?: (id: number) => Promise<void>;
    onEdit?: (record: Record<string, any>) => void;
    editingId?: number | null;
    renderEditForm?: (record: ApiEntityTransmissionRecord) => React.ReactNode;
}) {
    if (records.length === 0) return null;
    return (
        <div className="mb-8 scroll-mt-20" id="section-transmission-records">
            <SectionHeading id="section-transmission-records" icon={Radio}>Transmission Log</SectionHeading>
            <div className="space-y-1 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {[...records].sort((a, b) => a.sort_order - b.sort_order).map((r) =>
                    editingId === r.id && renderEditForm ? (
                        <div key={r.id} className="p-3">{renderEditForm(r)}</div>
                    ) : (
                        <div key={r.id} className="group relative flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                            {(onDelete || onEdit) && (
                                <div className="absolute right-2 top-1.5 hidden items-center gap-1 group-hover:flex">
                                    {onEdit && (
                                        <button onClick={() => onEdit(r)} className="rounded p-0.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600" title="Edit">
                                            <Edit3 className="size-3" />
                                        </button>
                                    )}
                                    {onDelete && <TxDeleteBtn onDelete={() => onDelete(r.id)} />}
                                </div>
                            )}
                            {r.fictional_timestamp && (
                                <span className="mt-0.5 shrink-0 font-mono text-[10px] text-slate-400 w-20">{r.fictional_timestamp}</span>
                            )}
                            <div className="flex-1 min-w-0">
                                {(r.speaker || r.speaker_label) && (
                                    <span className="mr-1.5 text-[11px] font-semibold text-slate-700">
                                        {r.speaker
                                            ? <EntityLink entity={r.speaker} universeSlug={universeSlug} />
                                            : r.speaker_label}:
                                    </span>
                                )}
                                <span className={`text-xs leading-relaxed ${r.is_redacted ? 'blur-[3px] select-none' : ''} ${CONTENT_TYPE_TEXT[r.content_type] ?? 'text-slate-800'}`}>
                                    {r.is_redacted ? '[REDACTED]' : r.content}
                                </span>
                                {r.notes && <p className="mt-0.5 text-[10px] text-slate-400 italic">{r.notes}</p>}
                            </div>
                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[0.5rem] font-semibold rounded uppercase tracking-wide border border-slate-200 text-slate-400 bg-slate-50 whitespace-nowrap">
                                {r.content_type}
                            </span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
