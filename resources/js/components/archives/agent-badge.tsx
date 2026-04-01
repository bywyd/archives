import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types/auth';

const CLEARANCE_COLORS: Record<string, string> = {
    'LEVEL-1': '#4ade80',
    'LEVEL-2': '#facc15',
    'LEVEL-3': '#fb923c',
    'LEVEL-4': '#f87171',
    'LEVEL-5': '#c41e1e',
};

function getClearanceColor(level: string | null): string {
    if (!level) return '#4ade80';
    return CLEARANCE_COLORS[level.toUpperCase()] ?? '#4ade80';
}

function initials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

export function AgentBadge() {
    const { auth } = usePage<{ auth: Auth }>().props;
    if (!auth?.user) return null;

    const user = auth.user;
    const displayName = user.agent_codename ?? user.name;
    const clearance = user.clearance_level ?? 'LEVEL-1';
    const clearanceColor = getClearanceColor(clearance);

    return (
        <div className="flex flex-col gap-1.5 border-t border-[var(--arc-sidebar-border)] p-3">
            {/* Agent info row */}
            <div className="flex items-center gap-2">
                {/* Avatar circle */}
                <div
                    className="arc-mono flex size-7 shrink-0 items-center justify-center rounded border text-[9px] font-bold"
                    style={{
                        borderColor: `${clearanceColor}50`,
                        backgroundColor: `${clearanceColor}12`,
                        color: clearanceColor,
                    }}
                >
                    {initials(user.name)}
                </div>

                {/* Name + rank */}
                <div className="min-w-0 flex-1">
                    <div
                        className="arc-mono truncate text-[9px] font-bold tracking-[0.12em]"
                        style={{ color: 'var(--arc-sidebar-text)' }}
                    >
                        {displayName.toUpperCase()}
                    </div>
                    {user.rank && (
                        <div className="arc-mono truncate text-[7.5px] tracking-[0.1em] text-[var(--arc-sidebar-text-muted)]/60">
                            {user.rank.toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Clearance badge */}
                <div
                    className="arc-mono shrink-0 rounded px-1.5 py-0.5 text-[7px] font-bold tracking-widest"
                    style={{
                        color: clearanceColor,
                        backgroundColor: `${clearanceColor}18`,
                        border: `1px solid ${clearanceColor}40`,
                    }}
                >
                    {clearance}
                </div>
            </div>

            {/* Department row */}
            {user.department && (
                <div
                    className="arc-mono truncate text-[7.5px] tracking-[0.1em] text-[var(--arc-sidebar-text-muted)]/50 border-l-2 pl-2"
                    style={{ borderColor: `${clearanceColor}40` }}
                >
                    {user.department.toUpperCase()}
                </div>
            )}
        </div>
    );
}
