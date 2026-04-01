import { Head } from '@inertiajs/react';
import { Edit3, Plus, Shield, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import AdminLayout from '@/layouts/admin/layout';
import * as api from '@/lib/api';
import type { ApiPermission, ApiRole } from '@/types/api';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/users' },
    { title: 'Roles & Permissions', href: '/admin/roles' },
];

type RoleFormData = { name: string; slug: string; description: string };
const EMPTY_ROLE_FORM: RoleFormData = { name: '', slug: '', description: '' };

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function AdminRoles() {
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [permissions, setPermissions] = useState<ApiPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected role for permission editing
    const [selectedRole, setSelectedRole] = useState<ApiRole | null>(null);
    const [permissionIds, setPermissionIds] = useState<number[]>([]);
    const [savingPerms, setSavingPerms] = useState(false);

    // Role create/edit dialog
    const [roleDialog, setRoleDialog] = useState<false | 'create' | ApiRole>(false);
    const [roleForm, setRoleForm] = useState<RoleFormData>(EMPTY_ROLE_FORM);
    const [savingRole, setSavingRole] = useState(false);
    const [roleErrors, setRoleErrors] = useState<Partial<RoleFormData>>({});

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<ApiRole | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([api.fetchRoles(), api.fetchPermissions()])
            .then(([rolesData, permsData]) => {
                setRoles(rolesData);
                setPermissions(permsData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const selectRole = (role: ApiRole) => {
        setSelectedRole(role);
        setPermissionIds(role.permissions.map((p) => p.id));
    };

    const togglePermission = (id: number) => {
        setPermissionIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setSavingPerms(true);
        try {
            const updated = await api.syncRolePermissions(selectedRole.id, permissionIds);
            setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelectedRole(updated);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSavingPerms(false);
        }
    };

    const openCreateDialog = () => {
        setRoleForm(EMPTY_ROLE_FORM);
        setRoleErrors({});
        setRoleDialog('create');
    };

    const openEditDialog = (role: ApiRole) => {
        setRoleForm({ name: role.name, slug: role.slug, description: role.description ?? '' });
        setRoleErrors({});
        setRoleDialog(role);
    };

    const handleSaveRole = async () => {
        setSavingRole(true);
        setRoleErrors({});
        try {
            if (roleDialog === 'create') {
                const created = await api.createRole(roleForm);
                setRoles((prev) => [...prev, created]);
            } else if (roleDialog !== false) {
                const updated = await api.updateRole(roleDialog.id, roleForm);
                setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                if (selectedRole?.id === updated.id) setSelectedRole(updated);
            }
            setRoleDialog(false);
        } catch (e: any) {
            if (e.body?.errors) setRoleErrors(e.body.errors);
            else alert(e.message);
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.deleteRole(deleteTarget.id);
            setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            if (selectedRole?.id === deleteTarget.id) setSelectedRole(null);
            setDeleteTarget(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeleting(false);
        }
    };

    // Group permissions by group
    const permsByGroup = permissions.reduce<Record<string, ApiPermission[]>>((acc, p) => {
        const key = p.group ?? 'General';
        (acc[key] ??= []).push(p);
        return acc;
    }, {});

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin  Roles & Permissions" />
            <AdminLayout>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Roles & Permissions</h2>
                            <p className="text-muted-foreground text-sm">
                                Create roles, assign permissions to roles.
                            </p>
                        </div>
                        <Button size="sm" onClick={openCreateDialog}>
                            <Plus className="mr-1.5 size-3.5" /> New Role
                        </Button>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading…
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            {/* Roles list */}
                            <div className="w-64 shrink-0 space-y-1">
                                {roles.map((role) => (
                                    <div
                                        key={role.id}
                                        onClick={() => selectRole(role)}
                                        className={cn(
                                            'flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors',
                                            selectedRole?.id === role.id
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:bg-muted/50',
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 text-sm font-medium">
                                                {role.is_super_admin && (
                                                    <Shield className="size-3.5 shrink-0 text-destructive" />
                                                )}
                                                <span className="truncate">{role.name}</span>
                                            </div>
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                {role.permissions.length} permissions
                                            </div>
                                        </div>
                                        {!role.is_super_admin && (
                                            <div className="ml-2 flex shrink-0 gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6"
                                                    onClick={(e) => { e.stopPropagation(); openEditDialog(role); }}
                                                >
                                                    <Edit3 className="size-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6 text-destructive hover:text-destructive"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Permission editor */}
                            <div className="min-w-0 flex-1 rounded-md border p-4">
                                {!selectedRole ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Select a role to edit its permissions
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold">{selectedRole.name}</h3>
                                                {selectedRole.description && (
                                                    <p className="text-muted-foreground text-sm">
                                                        {selectedRole.description}
                                                    </p>
                                                )}
                                            </div>
                                            {!selectedRole.is_super_admin && (
                                                <Button
                                                    size="sm"
                                                    onClick={handleSavePermissions}
                                                    disabled={savingPerms}
                                                >
                                                    {savingPerms ? 'Saving…' : 'Save Permissions'}
                                                </Button>
                                            )}
                                        </div>

                                        {selectedRole.is_super_admin ? (
                                            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                                Super Admin has all permissions implicitly and cannot be modified.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {Object.entries(permsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, perms]) => (
                                                    <div key={group}>
                                                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            {group}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {perms.map((perm) => (
                                                                <label
                                                                    key={perm.id}
                                                                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={permissionIds.includes(perm.id)}
                                                                        onChange={() => togglePermission(perm.id)}
                                                                    />
                                                                    <span>{perm.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Create / Edit Role Dialog */}
                <Dialog open={roleDialog !== false} onOpenChange={(open) => !open && setRoleDialog(false)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {roleDialog === 'create' ? 'Create Role' : 'Edit Role'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div className="space-y-1">
                                <Label>Name</Label>
                                <Input
                                    value={roleForm.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setRoleForm((prev) => ({
                                            ...prev,
                                            name,
                                            slug: roleDialog === 'create' ? slugify(name) : prev.slug,
                                        }));
                                    }}
                                    placeholder="Editor"
                                />
                                {roleErrors.name && (
                                    <p className="text-xs text-destructive">{roleErrors.name}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label>Slug</Label>
                                <Input
                                    value={roleForm.slug}
                                    onChange={(e) => setRoleForm((prev) => ({ ...prev, slug: e.target.value }))}
                                    placeholder="editor"
                                />
                                {roleErrors.slug && (
                                    <p className="text-xs text-destructive">{roleErrors.slug}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label>Description</Label>
                                <Input
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRoleDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRole} disabled={savingRole}>
                                {savingRole ? 'Saving…' : roleDialog === 'create' ? 'Create' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm Dialog */}
                <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Role</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This
                            will remove it from all users.
                        </p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteRole}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </AppLayout>
    );
}
