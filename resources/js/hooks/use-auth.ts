import { usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import type { Auth } from '@/types/auth';

type AuthData = Auth & {
    permissions: string[];
    is_super_admin: boolean;
};

export function useAuth() {
    const { auth } = usePage<{ auth: AuthData }>().props;

    const isAuthenticated = !!auth?.user;
    const isSuperAdmin = auth?.is_super_admin ?? false;
    const permissions = useMemo(() => auth?.permissions ?? [], [auth?.permissions]);

    const can = useCallback(
        (permission: string) => {
            if (!isAuthenticated) return false;
            if (isSuperAdmin) return true;
            return permissions.includes(permission);
        },
        [isAuthenticated, isSuperAdmin, permissions],
    );

    const canEditContent = useCallback(
        (opts?: { universeLocked?: boolean; entityLocked?: boolean }) => {
            // If nothing is locked, anyone (including unauthenticated) can edit
            const anyLocked = opts?.universeLocked || opts?.entityLocked;
            if (!anyLocked) return true;

            // Locked content requires authentication
            if (!isAuthenticated) return false;
            if (isSuperAdmin) return true;
            if (opts?.universeLocked && !permissions.includes('universes.override-lock')) return false;
            if (opts?.entityLocked && !permissions.includes('entities.override-lock')) return false;
            return true;
        },
        [isAuthenticated, isSuperAdmin, permissions],
    );

    return {
        user: auth?.user ?? null,
        permissions,
        isAuthenticated,
        isSuperAdmin,
        can,
        canEditContent,
    };
}
