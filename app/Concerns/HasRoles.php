<?php

namespace App\Concerns;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

/**
 * Provides RBAC capabilities to the User model.
 *
 * Roles and permissions are eager-loaded once per request and cached
 * on the model instance, eliminating N+1 queries when checking
 * multiple permissions within a single request lifecycle.
 */
trait HasRoles
{
    private ?Collection $cachedPermissions = null;

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Load all permission slugs for the user in a single query.
     * Result is cached on the model for the lifetime of the request.
     */
    public function loadPermissions(): Collection
    {
        if ($this->cachedPermissions !== null) {
            return $this->cachedPermissions;
        }

        // Single query: join through role_user -> roles -> role_permission -> permissions
        $this->cachedPermissions = Permission::query()
            ->select('permissions.slug')
            ->join('role_permission', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('role_user', 'role_permission.role_id', '=', 'role_user.role_id')
            ->where('role_user.user_id', $this->id)
            ->distinct()
            ->pluck('permissions.slug');

        return $this->cachedPermissions;
    }

    /**
     * Check if user has super_admin role (bypasses all permission checks).
     */
    public function isSuperAdmin(): bool
    {
        // Use the already-loaded roles relation if available, else load once
        if (! $this->relationLoaded('roles')) {
            $this->load('roles');
        }

        return $this->roles->contains('is_super_admin', true);
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->loadPermissions()->contains($permission);
    }

    public function hasAnyPermission(string ...$permissions): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->loadPermissions()->intersect($permissions)->isNotEmpty();
    }

    public function hasAllPermissions(string ...$permissions): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $loaded = $this->loadPermissions();

        return collect($permissions)->every(fn (string $p) => $loaded->contains($p));
    }

    public function hasRole(string $roleSlug): bool
    {
        if (! $this->relationLoaded('roles')) {
            $this->load('roles');
        }

        return $this->roles->contains('slug', $roleSlug);
    }

    /**
     * Flush the cached permissions (useful after role/permission changes).
     */
    public function flushPermissionCache(): void
    {
        $this->cachedPermissions = null;
        $this->unsetRelation('roles');
    }
}
