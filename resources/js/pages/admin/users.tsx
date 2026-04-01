import { Head } from '@inertiajs/react';
import { RefreshCw, Shield, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import AdminLayout from '@/layouts/admin/layout';
import * as api from '@/lib/api';
import type { ApiAdminUser, ApiRole } from '@/types/api';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/users' },
    { title: 'Users', href: '/admin/users' },
];

export default function AdminUsers() {
    const [users, setUsers] = useState<ApiAdminUser[]>([]);
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [editUser, setEditUser] = useState<ApiAdminUser | null>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([api.fetchAdminUsers(), api.fetchRoles()])
            .then(([usersData, rolesData]) => {
                setUsers(usersData);
                setRoles(rolesData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openEditDialog = (user: ApiAdminUser) => {
        setEditUser(user);
        setSelectedRoleIds(user.roles.map((r) => r.id));
    };

    const toggleRole = (roleId: number) => {
        setSelectedRoleIds((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
        );
    };

    const handleSaveRoles = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            await api.syncUserRoles(editUser.id, selectedRoleIds);
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editUser.id
                        ? { ...u, roles: roles.filter((r) => selectedRoleIds.includes(r.id)) }
                        : u,
                ),
            );
            setEditUser(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin  Users" />
            <AdminLayout>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Users</h2>
                            <p className="text-muted-foreground text-sm">
                                Manage user accounts and role assignments.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={load}>
                            <RefreshCw className="mr-1.5 size-3.5" /> Refresh
                        </Button>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading users…
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Agent Codename</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="py-8 text-center text-muted-foreground"
                                            >
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        {user.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {user.email}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {user.agent_codename ?? (
                                                        <span className="italic opacity-40"></span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles.length === 0 ? (
                                                            <span className="text-xs italic text-muted-foreground">
                                                                No roles
                                                            </span>
                                                        ) : (
                                                            user.roles.map((role) => (
                                                                <Badge
                                                                    key={role.id}
                                                                    variant={
                                                                        role.is_super_admin
                                                                            ? 'destructive'
                                                                            : 'secondary'
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {role.is_super_admin && (
                                                                        <Shield className="mr-0.5 size-2.5" />
                                                                    )}
                                                                    {role.name}
                                                                </Badge>
                                                            ))
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(user)}
                                                        className="h-7 text-xs"
                                                    >
                                                        <User className="mr-1 size-3" />
                                                        Roles
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Assign Roles Dialog */}
                <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Assign Roles  {editUser?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 py-2">
                            {roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={selectedRoleIds.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            {role.name}
                                            {role.is_super_admin && (
                                                <Badge variant="destructive" className="text-[10px]">
                                                    Super Admin
                                                </Badge>
                                            )}
                                        </div>
                                        {role.description && (
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {role.description}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditUser(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRoles} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Roles'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </AppLayout>
    );
}
