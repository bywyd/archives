import { Link } from '@inertiajs/react';
import { Database, Globe, Shield, Users } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import { useCurrentUrl } from '@/hooks/use-current-url';

const adminNavItems = [
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Roles & Permissions', href: '/admin/roles', icon: Shield },
    { title: 'Meta / Lookup Data', href: '/admin/meta', icon: Database },
    { title: 'Universes', href: '/admin/universes', icon: Globe },
];

export default function AdminLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <div className="mb-6 border-b pb-4">
                <h1 className="text-xl font-semibold">Admin Panel</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Manage users, roles, meta data and universes
                </p>
            </div>
            <div className="flex flex-col gap-8 lg:flex-row">
                <aside className="w-full shrink-0 lg:w-52">
                    <nav className="flex flex-col gap-1">
                        {adminNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    isCurrentOrParentUrl(item.href)
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                )}
                            >
                                <item.icon className="size-4 shrink-0" />
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </aside>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
