<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        //  Permissions 

        $permissionData = [
            // Entities
            ['slug' => 'entities.create', 'name' => 'Create entities', 'group' => 'entities'],
            ['slug' => 'entities.update', 'name' => 'Update entities', 'group' => 'entities'],
            ['slug' => 'entities.delete', 'name' => 'Delete entities', 'group' => 'entities'],

            // Relations
            ['slug' => 'relations.manage', 'name' => 'Manage entity relations', 'group' => 'relations'],

            // Timelines
            ['slug' => 'timelines.manage', 'name' => 'Manage timelines & events', 'group' => 'timelines'],

            // Media
            ['slug' => 'media.manage', 'name' => 'Manage media sources', 'group' => 'media'],
            ['slug' => 'images.manage', 'name' => 'Manage images', 'group' => 'media'],

            // Categories & Tags
            ['slug' => 'categories.manage', 'name' => 'Manage categories', 'group' => 'taxonomy'],
            ['slug' => 'tags.manage', 'name' => 'Manage tags', 'group' => 'taxonomy'],

            // Universes
            ['slug' => 'universes.create', 'name' => 'Create universes', 'group' => 'universes'],
            ['slug' => 'universes.update', 'name' => 'Update universes', 'group' => 'universes'],
            ['slug' => 'universes.delete', 'name' => 'Delete universes', 'group' => 'universes'],
            ['slug' => 'universes.lock', 'name' => 'Lock/unlock universes', 'group' => 'universes'],
            ['slug' => 'universes.override-lock', 'name' => 'Edit locked universes', 'group' => 'universes'],

            // Entity locks
            ['slug' => 'entities.lock', 'name' => 'Lock/unlock entities', 'group' => 'entities'],
            ['slug' => 'entities.override-lock', 'name' => 'Edit locked entities', 'group' => 'entities'],
            ['slug' => 'entities.rollback', 'name' => 'Rollback/restore entity revisions', 'group' => 'entities'],

            // Meta / schema definitions (admin-level)
            ['slug' => 'meta.manage', 'name' => 'Manage meta definitions', 'group' => 'admin'],

            // RBAC administration
            ['slug' => 'rbac.manage', 'name' => 'Manage roles & permissions', 'group' => 'admin'],
        ];

        $permissions = collect();
        foreach ($permissionData as $perm) {
            $permissions->push(Permission::firstOrCreate(['slug' => $perm['slug']], $perm));
        }

        //  Roles 

        // Super Admin  bypasses all permission checks via is_super_admin flag
        Role::firstOrCreate(
            ['slug' => 'super-admin'],
            ['name' => 'Super Admin', 'description' => 'Full unrestricted access', 'is_super_admin' => true]
        );

        // Admin  everything except RBAC management
        $admin = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'description' => 'Full content management access']
        );
        $admin->permissions()->sync(
            $permissions->whereNotIn('slug', ['rbac.manage'])->pluck('id')
        );

        // Editor  can create/update content but not delete or manage schema
        $editor = Role::firstOrCreate(
            ['slug' => 'editor'],
            ['name' => 'Editor', 'description' => 'Can create and edit content']
        );
        $editor->permissions()->sync(
            $permissions->whereIn('slug', [
                'entities.create', 'entities.update',
                'relations.manage', 'timelines.manage',
                'media.manage', 'images.manage',
                'categories.manage', 'tags.manage',
            ])->pluck('id')
        );

        // Viewer  read-only (no extra permissions needed, GET routes are public)
        Role::firstOrCreate(
            ['slug' => 'viewer'],
            ['name' => 'Viewer', 'description' => 'Read-only access']
        );

        //  Assign super-admin to first user if exists 

        $firstUser = User::first();
        if ($firstUser) {
            $superAdmin = Role::where('slug', 'super-admin')->first();
            $firstUser->roles()->syncWithoutDetaching([$superAdmin->id]);
        }
    }
}
