import { cn } from '@/lib/utils';
import type { ApiMetaEntityStatus } from '@/types/api';

type Props = {
    status: ApiMetaEntityStatus | null;
    size?: 'sm' | 'md';
};

export function StatusBadge({ status, size = 'sm' }: Props) {
    if (!status) {
        return null;
    }

    return (
        <span
            data-status={status.slug}
            className={cn(
                'inline-flex items-center gap-1 rounded-none font-medium uppercase tracking-wider',
                size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
            )}
            style={{
                color: status.color ?? '#6B7280',
                backgroundColor: `${status.color ?? '#6B7280'}18`,
                borderWidth: 1,
                borderColor: `${status.color ?? '#6B7280'}30`,
            }}
        >
            <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: status.color ?? '#6B7280' }}
            />
            {status.name}
        </span>
    );
}
