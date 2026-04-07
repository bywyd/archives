import type { ApiEntityAttribute, ApiImage } from '@/types/api';

type Props = {
    name: string;
    image?: ApiImage | null;
    attributes: ApiEntityAttribute[];
    type?: string | null;
    status?: string | null;
    statusColor?: string | null;
    aliases?: string[];
    children?: React.ReactNode;
    short_description?: string | null;
};

export function WikiInfobox({ name, image, attributes, type, status, statusColor, aliases, children, short_description }: Props) {
    const grouped = groupAttributes(attributes);

    const hasContent = !!(image || short_description || type || status || (aliases && aliases.length > 0) || attributes.length > 0);
    if (!hasContent) return null;

    return (
        <div className="w-full space-y-4 text-[0.8125rem]">
            {/* Entity name */}
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-2">
                {name}
            </p>

            {/* Profile image */}
            {image && (
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-sm">
                    <img
                        src={image.url}
                        alt={image.alt_text ?? name}
                        className="w-full object-cover object-top block"
                        loading="lazy"
                    />
                    {image.caption && (
                        <div className="border-t border-slate-200 dark:border-slate-700/60 px-3 py-1.5 text-center text-[11px] italic text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                            {image.caption}
                        </div>
                    )}
                </div>
            )}

            {/* Type & Status */}
            {(type || status) && (
                <div>
                    {type && <InfoRow label="Type" value={type} />}
                    {status && (
                        <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-r-md border-l-2 border-transparent mb-px">
                            <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0">Status</span>
                            <span
                                className={statusColor
                                    ? 'inline-flex items-center px-2 py-0.5 text-[0.625rem] font-bold rounded-full uppercase tracking-wide border whitespace-nowrap'
                                    : 'inline-flex items-center px-2 py-0.5 text-[0.625rem] font-bold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 whitespace-nowrap'}
                                style={statusColor ? { borderColor: statusColor, color: statusColor, background: statusColor + '15' } : undefined}
                            >
                                {status}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Aliases */}
            {aliases && aliases.length > 0 && (
                <div>
                    <SectionLabel>Also known as</SectionLabel>
                    <div className="pl-2 flex flex-wrap gap-1 mt-2">
                        {aliases.map((alias, i) => (
                            <span key={i} className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {alias}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Short description */}
            {short_description && (
                <div>
                    <SectionLabel>Description</SectionLabel>
                    <p className="pl-2 mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{short_description}</p>
                </div>
            )}

            {/* Grouped attributes */}
            {Object.entries(grouped).map(([group, attrs]) => (
                <div key={group}>
                    {group !== '_ungrouped' && <SectionLabel>{group}</SectionLabel>}
                    <div className={group !== '_ungrouped' ? 'mt-1.5' : ''}>
                        {attrs.map((attr) => (
                            <InfoRow
                                key={attr.id}
                                label={attr.definition.name}
                                value={formatAttributeValue(attr)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {children}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 pl-2 mb-1">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
                {children}
            </p>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-r-md border-l-2 border-transparent hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 mb-px transition-colors">
            <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 whitespace-nowrap">{label}</span>
            <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-300 break-words min-w-0">{value || '—'}</span>
        </div>
    );
}

function formatAttributeValue(attr: ApiEntityAttribute): string {
    if (!attr.value) return '';
    if (attr.definition?.data_type === 'json') {
        try {
            const parsed = JSON.parse(attr.value);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch { /* fall through */ }
    }
    return attr.value;
}

function groupAttributes(attributes: ApiEntityAttribute[]) {
    const groups: Record<string, ApiEntityAttribute[]> = {};
    for (const attr of attributes) {
        const key = attr.definition.group_name ?? '_ungrouped';
        if (!groups[key]) groups[key] = [];
        groups[key].push(attr);
    }
    return groups;
}
