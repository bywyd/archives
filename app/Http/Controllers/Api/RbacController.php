<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RbacController extends Controller
{
    public function roles(): JsonResponse
    {
        $roles = Role::with('permissions')->orderBy('name')->get();

        return response()->json($roles);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'slug' => ['required', 'string', 'max:255', 'unique:roles,slug'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $role = Role::create($validated);
        $role->load('permissions');

        return response()->json($role, 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        if ($role->is_super_admin) {
            return response()->json(['message' => 'Cannot modify the super admin role.'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:roles,name,' . $role->id],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:roles,slug,' . $role->id],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $role->update($validated);
        $role->load('permissions');

        return response()->json($role);
    }

    public function destroyRole(Role $role): JsonResponse
    {
        if ($role->is_super_admin) {
            return response()->json(['message' => 'Cannot delete the super admin role.'], 403);
        }

        $role->delete();

        return response()->json(null, 204);
    }

    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('group')->orderBy('name')->get();

        return response()->json($permissions);
    }

    public function syncPermissions(Request $request, Role $role): JsonResponse
    {
        if ($role->is_super_admin) {
            return response()->json(['message' => 'Super admin role has all permissions implicitly.'], 403);
        }

        $validated = $request->validate([
            'permission_ids' => ['required', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role->permissions()->sync($validated['permission_ids']);
        $role->load('permissions');

        return response()->json($role);
    }

    public function users(): JsonResponse
    {
        $users = User::with('roles')->orderBy('name')->get();

        return response()->json($users);
    }

    public function userRoles(User $user): JsonResponse
    {
        $user->load('roles.permissions');

        return response()->json($user->roles);
    }

    public function syncUserRoles(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_ids' => ['required', 'array'],
            'role_ids.*' => ['integer', 'exists:roles,id'],
        ]);

        $user->roles()->sync($validated['role_ids']);
        $user->flushPermissionCache();
        $user->load('roles.permissions');

        return response()->json($user->roles);
    }
}
