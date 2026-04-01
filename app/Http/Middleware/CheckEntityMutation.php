<?php

namespace App\Http\Middleware;

use App\Models\Entity;
use App\Models\Universe;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate entity-scoped mutation routes behind dynamic lock checks.
 *
 * Logic:
 *   1. Resolve the universe (and optionally entity) from route parameters.
 *   2. If nothing is locked, ANY user (including unauthenticated) may proceed.
 *   3. If the universe or entity is locked, the user must be authenticated
 *      and hold the relevant `*.override-lock` permission (or be a super admin).
 *
 * Lock status is cached for 5 minutes to avoid repeated DB lookups.
 *
 * Usage in routes:
 *   ->middleware('entity-mutation')                       // resolve universe + entity from route
 *   ->middleware('entity-mutation:universe_only')         // only check universe lock (no entity)
 */
class CheckEntityMutation
{
    public function handle(Request $request, Closure $next, string $scope = 'default'): Response
    {
        // Resolve universe
        $universe = $request->route('universe');
        if ($universe && ! $universe instanceof Universe) {
            $universe = Universe::find($universe);
        }

        // Resolve entity (unless scope is universe_only)
        $entity = null;
        if ($scope !== 'universe_only') {
            $entity = $request->route('entity');
            if ($entity && ! $entity instanceof Entity) {
                $entity = Entity::find($entity);
            }
        }

        // Check lock status via cache
        $universeLocked = $universe
            ? Cache::remember("universe:{$universe->id}:is_locked", 300, fn () => (bool) $universe->is_locked)
            : false;

        $entityLocked = $entity
            ? Cache::remember("entity:{$entity->id}:is_locked", 300, fn () => (bool) $entity->is_locked)
            : false;

        // If nothing is locked, allow all users (including unauthenticated) through
        if (! $universeLocked && ! $entityLocked) {
            return $next($request);
        }

        // Content is locked  authentication is now required
        $user = $request->user('web');

        if (! $user) {
            return response()->json(['message' => 'Authentication required to modify locked content.'], 401);
        }

        // Super admins bypass lock checks
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check universe lock permission
        if ($universeLocked && ! $user->hasPermission('universes.override-lock')) {
            return response()->json([
                'message' => 'This universe is locked. Only authorised users may modify locked content.',
            ], 423);
        }

        // Check entity lock permission
        if ($entityLocked && ! $user->hasPermission('entities.override-lock')) {
            return response()->json([
                'message' => 'This entity is locked. Only authorised users may modify locked content.',
            ], 423);
        }

        return $next($request);
    }
}
