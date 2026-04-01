import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            branding?: {
                logo_url?: string;
            };
            auth: Auth & { permissions: string[]; is_super_admin: boolean };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
