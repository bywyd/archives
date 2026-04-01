import { Link } from '@inertiajs/react';
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

    return (
        <div className="float-right w-72 ml-8 mb-6  border border-blue-200 rounded-lg overflow-hidden text-[0.8125rem] shadow-sm max-md:float-none max-md:w-full max-md:ml-0">
            {/* Title */}
            <div className=" px-3.5 py-2.5 font-semibold text-[0.8125rem] text-center border-b border-blue-200">{name}</div>

            {/* Image */}
            {image && (
                <div className="relative">
                    <img
                        src={image.url}
                        alt={image.alt_text ?? name}
                        className="w-full max-h-[28rem] object-cover object-top block border-b border-blue-200"
                        loading="lazy"
                    />
                    {image.caption && (
                        <div className="border-b border-blue-200 bg-slate-50 px-3 py-1.5 text-center text-[11px] italic text-slate-500">
                            {image.caption}
                        </div>
                    )}
                </div>
            )}

            {/* Short Description */}
            {short_description && (
                <div className=" px-3.5 py-2.5">
                    <div className="text-[0.625rem] font-bold uppercase tracking-wider text-blue-600 mb-1.5 pb-1 border-b border-blue-100">Description</div>
                    <div className="text-slate-700 text-sm">{short_description}</div>
                </div>
            )}

            {/* Type & Status */}
            {(type || status) && (
                <div className=" px-3.5 py-2.5">
                    {/* <div className="text-[0.625rem] font-bold uppercase tracking-wider text-blue-600 mb-1.5 pb-1 border-b border-blue-100">Statuses & Types</div> */}
                    {type && (
                        <div className="flex justify-between py-1 gap-3">
                            <span className="text-slate-500 whitespace-nowrap shrink-0 text-xs">Type</span>
                            <span className="text-right font-medium text-slate-900 break-words">{type}</span>
                        </div>
                    )}
                    {status && (
                        <div className="flex justify-between py-1 gap-3">
                            <span className="text-slate-500 whitespace-nowrap shrink-0 text-xs">Status</span>
                            <span className="text-right font-medium text-slate-900 break-words">
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-semibold rounded-full uppercase tracking-wide border border-slate-200 text-slate-500 bg-white whitespace-nowrap"
                                    style={statusColor ? { borderColor: statusColor, color: statusColor, background: statusColor + '10' } : undefined}
                                >
                                    {status}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Aliases */}
            {aliases && aliases.length > 0 && (
                <div className=" px-3.5 py-2.5">
                    <div className="text-[0.625rem] font-bold uppercase tracking-wider text-blue-600 mb-1.5 pb-1 border-b border-blue-100">Also known as</div>
                    <div className="flex flex-wrap gap-1">
                        {aliases.map((alias, i) => (
                            <span key={i} className="rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-500">
                                {alias}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Grouped attributes */}
            {Object.entries(grouped).map(([group, attrs]) => (
                <div key={group} className=" px-3.5 py-2.5 last:border-b-0">
                    {group !== '_ungrouped' && (
                        <div className="text-[0.625rem] font-bold uppercase tracking-wider text-blue-600 mb-1.5 pb-1 border-b border-blue-100">{group}</div>
                    )}
                    {attrs.map((attr) => (
                        <div key={attr.id} className="flex justify-between py-1 gap-3">
                            <span className="text-slate-500 whitespace-nowrap shrink-0 text-xs">{attr.definition.name}</span>
                            <span className="text-right font-medium text-slate-900 break-words">{attr.value ?? '\u2014'}</span>
                        </div>
                    ))}
                </div>
            ))}

            {children}
        </div>
    );
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
