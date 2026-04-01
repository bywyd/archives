import type { ApiEntityAttribute } from '@/types/api';
import { FileIcon } from 'lucide-react';

type Props = {
    attributes: ApiEntityAttribute[];
};

export function EntityInfobox({ attributes }: Props) {
    // Group attributes by group_name
    const groups = new Map<string, ApiEntityAttribute[]>();

    for (const attr of attributes) {
        const group = attr.definition?.group_name ?? 'General';

        if (!groups.has(group)) {
            groups.set(group, []);
        }

        groups.get(group)!.push(attr);
    }

    return (
        <div className="overflow-hidden rounded border border-[var(--arc-border)] bg-[var(--arc-surface)]">
            <div className="border-b-2 border-[var(--arc-border-strong)] bg-[var(--arc-surface-alt)] px-3 pb-1">
                <span className="arc-mono text-[10px] font-bold tracking-[0.2em] text-[var(--arc-accent)]">
                   SUBJECT DATA
                </span>
            </div>

            <div className="divide-y divide-[var(--arc-border)]">
                {[...groups.entries()].map(([groupName, attrs]) => (
                    <div key={groupName} className="px-3 py-2.5">
                        <div className="arc-mono mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--arc-text-muted)]">
                            <span>{groupName}</span>
                            <div className="h-px flex-1 bg-[var(--arc-border)]/50" />
                        </div>
                        <table className="w-full">
                            <tbody>
                                {attrs.map((attr) => (
                                    <tr key={attr.id} className="border-b border-[var(--arc-border)]/30 last:border-b-0">
                                        <td className="py-1 pr-3 text-[11px] text-[var(--arc-text-muted)]">
                                            {attr.definition?.name ?? 'Unknown'}
                                        </td>
                                        <td className="arc-mono py-1 text-right text-[11px] font-medium text-[var(--arc-text)]">
                                            {formatAttributeValue(attr)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatAttributeValue(attr: ApiEntityAttribute): string {
    if (!attr.value) {
        return '';
    }

    // Try to parse JSON for array/object types
    if (attr.definition?.data_type === 'json') {
        try {
            const parsed = JSON.parse(attr.value);

            if (Array.isArray(parsed)) {
                return parsed.join(', ');
            }

            return attr.value;
        } catch {
            return attr.value;
        }
    }

    return attr.value;
}
