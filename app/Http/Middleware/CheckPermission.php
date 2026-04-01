<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate API routes behind permission checks.
 *
 * Usage in routes:
 *   ->middleware('permission:entities.create')
 *   ->middleware('permission:entities.create,entities.update')  // requires ANY of listed
 *
 * The user must be authenticated via the web session guard.
 * All permission lookups use the HasRoles trait which caches
 * roles+permissions in a single query per request  no N+1.
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user('web');

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (empty($permissions)) {
            return $next($request);
        }

        if (! $user->hasAnyPermission(...$permissions)) {
            return response()->json(['message' => 'Forbidden. Required permission: ' . implode(' or ', $permissions)], 403);
        }

        return $next($request);
    }
}
