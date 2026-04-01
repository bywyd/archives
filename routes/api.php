<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\EntityAttributeController;
use App\Http\Controllers\Api\EntityController;
use App\Http\Controllers\Api\EntityRecordController;
use App\Http\Controllers\Api\EntityRelationController;
use App\Http\Controllers\Api\EntitySectionController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\MediaSourceController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\RbacController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SidebarController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TimelineController;
use App\Http\Controllers\Api\TimelineEventController;
use App\Http\Controllers\Api\UniverseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Archives API - Fictional Universe Wiki
| All routes are prefixed with /api
|
| Route protection:
|   - GET routes are public (read-only access)
|   - POST/PUT/DELETE routes require partial authentication + RBAC permission
|
*/

//  Public read-only routes 

Route::middleware('throttle:api')->group(function () {
    // Global search across all universes
    Route::get('search', [SearchController::class, 'globalSearch']);
    
    // Tags (read)
    Route::get('tags', [TagController::class, 'index']);
    Route::get('tags/{tag}', [TagController::class, 'show']);
    
    // Meta / lookup data (read)
    Route::prefix('meta')->group(function () {
        Route::get('entity-types', [MetaController::class, 'entityTypes']);
        Route::get('entity-statuses', [MetaController::class, 'entityStatuses']);
        Route::get('relation-types', [MetaController::class, 'relationTypes']);
        Route::get('attribute-definitions', [MetaController::class, 'attributeDefinitions']);
    });
    
    // Universes (read)
    Route::get('universes', [UniverseController::class, 'index']);
    Route::get('universes/{universe}', [UniverseController::class, 'show']);
    
    Route::prefix('universes/{universe}')->group(function () {
        // Sidebar tree
        Route::get('sidebar-tree', [SidebarController::class, 'universeTree']);
    
        // Search within a universe
        Route::get('search', [SearchController::class, 'search']);

        // Advanced natural-language search
        Route::get('advanced-search', [SearchController::class, 'advancedSearch']);
    
        // Entities (read)
        Route::get('entities', [EntityController::class, 'index']);
        Route::get('entities/{entity}', [EntityController::class, 'show']);
        Route::get('entity-locations', [EntityController::class, 'entityLocations']);
        Route::get('entities/{entity}/graph', [EntityController::class, 'graphData']);
        Route::get('entities/{entity}/relations', [EntityController::class, 'relations']);
        Route::get('entities/{entity}/preview', [EntityController::class, 'preview']);
        Route::get('entities/{entity}/infection-records', [EntityController::class, 'infectionRecords']);
        Route::get('entities/{entity}/mutation-stages', [EntityController::class, 'mutationStages']);
        Route::get('entities/{entity}/affiliation-history', [EntityController::class, 'affiliationHistory']);
        Route::get('entities/{entity}/quotes', [EntityController::class, 'quotes']);
        Route::get('entities/{entity}/power-profiles', [EntityController::class, 'powerProfiles']);
        Route::get('entities/{entity}/consciousness-records', [EntityController::class, 'consciousnessRecords']);
        Route::get('entities/{entity}/intelligence-records', [EntityController::class, 'intelligenceRecords']);
        Route::get('entities/{entity}/death-records', [EntityController::class, 'deathRecords']);
        Route::get('entities/{entity}/transmission-participants', [EntityController::class, 'transmissionParticipants']);
        Route::get('entities/{entity}/transmission-records', [EntityController::class, 'transmissionRecords']);
        Route::get('entities/{entity}/related-by-tag', [EntityController::class, 'relatedByTag']);
        Route::get('entities/{entity}/revisions', [EntityController::class, 'revisions']);
    
        // Entity maps (read)
        Route::get('entities/{entity}/maps', [MapController::class, 'index']);
        Route::get('entities/{entity}/maps/{map}', [MapController::class, 'show']);

        // Entity sections (read)
        Route::get('entities/{entity}/sections', [EntitySectionController::class, 'index']);
        Route::get('entities/{entity}/sections/{section}', [EntitySectionController::class, 'show']);
    
        // Entity attributes (read)
        Route::get('entities/{entity}/attributes', [EntityAttributeController::class, 'index']);
    
        // Entity relations (read)
        Route::get('relations', [EntityRelationController::class, 'index']);
        Route::get('relations/{relation}', [EntityRelationController::class, 'show']);
    
        // Timelines (read)
        Route::get('timelines', [TimelineController::class, 'index']);
        Route::get('timelines/{timeline}', [TimelineController::class, 'show']);
    
        // Timeline events (read)
        Route::get('timelines/{timeline}/events', [TimelineEventController::class, 'index']);
        Route::get('timelines/{timeline}/events/{event}', [TimelineEventController::class, 'show']);
    
        // Media sources (read)
        Route::get('media-sources', [MediaSourceController::class, 'index']);
        Route::get('media-sources/{mediaSource}', [MediaSourceController::class, 'show']);
    
        // Categories (read)
        Route::get('categories', [CategoryController::class, 'index']);
        Route::get('categories/{category}', [CategoryController::class, 'show']);
    });
});


//  Protected mutation routes (auth + dynamic lock checks) 
Route::middleware('throttle:api')->group(function () {
    // Tags & images  authenticated users, no lock check (global resources)
    Route::middleware('entity-mutation:universe_only')->group(function () {
        Route::post('tags', [TagController::class, 'store']);
        Route::put('tags/{tag}', [TagController::class, 'update']);
        Route::delete('tags/{tag}', [TagController::class, 'destroy']);
    });
    
    Route::middleware('entity-mutation:universe_only')->group(function () {
        Route::post('images', [ImageController::class, 'upload']);
        Route::put('images/{image}', [ImageController::class, 'update']);
        Route::delete('images/{image}', [ImageController::class, 'destroy']);
    });
    
    // Meta / lookup data (write)  admin-level operations (strict permissions)
    Route::prefix('meta')->middleware('permission:meta.manage')->group(function () {
        Route::post('entity-types', [MetaController::class, 'storeEntityType']);
        Route::put('entity-types/{entityType}', [MetaController::class, 'updateEntityType']);
        Route::delete('entity-types/{entityType}', [MetaController::class, 'destroyEntityType']);
    
        Route::post('entity-statuses', [MetaController::class, 'storeEntityStatus']);
        Route::put('entity-statuses/{entityStatus}', [MetaController::class, 'updateEntityStatus']);
        Route::delete('entity-statuses/{entityStatus}', [MetaController::class, 'destroyEntityStatus']);
    
        Route::post('relation-types', [MetaController::class, 'storeRelationType']);
        Route::put('relation-types/{relationType}', [MetaController::class, 'updateRelationType']);
        Route::delete('relation-types/{relationType}', [MetaController::class, 'destroyRelationType']);
    
        Route::post('attribute-definitions', [MetaController::class, 'storeAttributeDefinition']);
        Route::put('attribute-definitions/{attributeDefinition}', [MetaController::class, 'updateAttributeDefinition']);
        Route::delete('attribute-definitions/{attributeDefinition}', [MetaController::class, 'destroyAttributeDefinition']);
    });
    
    // Universes (write)  strict permissions for create/delete, lock-aware for update
    Route::middleware('permission:universes.create')->post('universes', [UniverseController::class, 'store']);
    Route::middleware('permission:universes.update')->put('universes/{universe}', [UniverseController::class, 'update']);
    Route::middleware('permission:universes.delete')->delete('universes/{universe}', [UniverseController::class, 'destroy']);

    // Universe lock toggle (requires universes.lock permission)
    Route::middleware('permission:universes.lock')->put('universes/{universe}/lock', [UniverseController::class, 'toggleLock']);
    
    Route::prefix('universes/{universe}')->group(function () {
        // Entity lock toggle (requires entities.lock permission)
        Route::middleware('permission:entities.lock')->put('entities/{entity}/lock', [EntityController::class, 'toggleLock']);

        // Revision rollback + entity restore (requires entities.rollback permission)
        Route::middleware('permission:entities.rollback')->group(function () {
            Route::post('entities/{entity}/revisions/{revision}/rollback', [EntityController::class, 'rollback']);
            Route::post('entities/{entityId}/restore', [EntityController::class, 'restore'])->where('entityId', '[0-9]+');
        });

        // Entities (write)  dynamic lock checks, any authenticated user if unlocked
        Route::middleware('entity-mutation')->group(function () {
            Route::post('entities', [EntityController::class, 'store']);
            Route::put('entities/{entity}', [EntityController::class, 'update']);
            Route::delete('entities/{entity}', [EntityController::class, 'destroy']);
        });
    
        // Entity records (write)
        Route::middleware('entity-mutation')->group(function () {
            Route::post('entities/{entity}/records/{recordType}', [EntityRecordController::class, 'store']);
            Route::put('entities/{entity}/records/{recordType}/{recordId}', [EntityRecordController::class, 'update']);
            Route::delete('entities/{entity}/records/{recordType}/{recordId}', [EntityRecordController::class, 'destroy']);
        });
    
        // Entity maps (write)
        Route::middleware('entity-mutation')->group(function () {
            Route::post('entities/{entity}/maps', [MapController::class, 'store']);
            Route::put('entities/{entity}/maps/{map}', [MapController::class, 'update']);
            Route::delete('entities/{entity}/maps/{map}', [MapController::class, 'destroy']);

            Route::post('entities/{entity}/maps/{map}/floors', [MapController::class, 'storeFloor']);
            Route::put('entities/{entity}/maps/{map}/floors/{floor}', [MapController::class, 'updateFloor']);
            Route::delete('entities/{entity}/maps/{map}/floors/{floor}', [MapController::class, 'destroyFloor']);

            Route::post('entities/{entity}/maps/{map}/markers', [MapController::class, 'storeMarker']);
            Route::put('entities/{entity}/maps/{map}/markers/{marker}', [MapController::class, 'updateMarker']);
            Route::delete('entities/{entity}/maps/{map}/markers/{marker}', [MapController::class, 'destroyMarker']);

            Route::post('entities/{entity}/maps/{map}/regions', [MapController::class, 'storeRegion']);
            Route::put('entities/{entity}/maps/{map}/regions/{region}', [MapController::class, 'updateRegion']);
            Route::delete('entities/{entity}/maps/{map}/regions/{region}', [MapController::class, 'destroyRegion']);
        });

        // Entity sections (write)
        Route::middleware('entity-mutation')->group(function () {
            Route::post('entities/{entity}/sections', [EntitySectionController::class, 'store']);
            Route::put('entities/{entity}/sections/{section}', [EntitySectionController::class, 'update']);
            Route::delete('entities/{entity}/sections/{section}', [EntitySectionController::class, 'destroy']);
            Route::post('entities/{entity}/sections/reorder', [EntitySectionController::class, 'reorder']);
        });
    
        // Entity attributes (write)
        Route::middleware('entity-mutation')->group(function () {
            Route::post('entities/{entity}/attributes', [EntityAttributeController::class, 'store']);
            Route::put('entities/{entity}/attributes/bulk', [EntityAttributeController::class, 'bulkUpdate']);
            Route::delete('entities/{entity}/attributes/{attribute}', [EntityAttributeController::class, 'destroy']);
        });
    
        // Entity relations (write)
        Route::middleware('entity-mutation')->group(function () {
            Route::post('relations', [EntityRelationController::class, 'store']);
            Route::put('relations/{relation}', [EntityRelationController::class, 'update']);
            Route::delete('relations/{relation}', [EntityRelationController::class, 'destroy']);
        });
    
        // Timelines (write)  lock-aware
        Route::middleware('entity-mutation:universe_only')->group(function () {
            Route::post('timelines', [TimelineController::class, 'store']);
            Route::put('timelines/{timeline}', [TimelineController::class, 'update']);
            Route::delete('timelines/{timeline}', [TimelineController::class, 'destroy']);
            Route::post('timelines/{timeline}/entities', [TimelineController::class, 'attachEntity']);
            Route::delete('timelines/{timeline}/entities/{entityId}', [TimelineController::class, 'detachEntity']);
        });
    
        // Timeline events (write)  lock-aware
        Route::middleware('entity-mutation:universe_only')->group(function () {
            Route::post('timelines/{timeline}/events', [TimelineEventController::class, 'store']);
            Route::put('timelines/{timeline}/events/{event}', [TimelineEventController::class, 'update']);
            Route::delete('timelines/{timeline}/events/{event}', [TimelineEventController::class, 'destroy']);
        });
    
        // Media sources (write)  lock-aware
        Route::middleware('entity-mutation:universe_only')->group(function () {
            Route::post('media-sources', [MediaSourceController::class, 'store']);
            Route::put('media-sources/{mediaSource}', [MediaSourceController::class, 'update']);
            Route::delete('media-sources/{mediaSource}', [MediaSourceController::class, 'destroy']);
            Route::post('media-sources/{mediaSource}/entities', [MediaSourceController::class, 'attachEntity']);
            Route::delete('media-sources/{mediaSource}/entities/{entityId}', [MediaSourceController::class, 'detachEntity']);
        });
    
        // Categories (write)  lock-aware
        Route::middleware('entity-mutation:universe_only')->group(function () {
            Route::post('categories', [CategoryController::class, 'store']);
            Route::put('categories/{category}', [CategoryController::class, 'update']);
            Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
        });
    });
    
    //  RBAC administration (super_admin only) 
    
    Route::prefix('rbac')->middleware('permission:rbac.manage')->group(function () {
        Route::get('users', [RbacController::class, 'users']);
        Route::get('roles', [RbacController::class, 'roles']);
        Route::post('roles', [RbacController::class, 'storeRole']);
        Route::put('roles/{role}', [RbacController::class, 'updateRole']);
        Route::delete('roles/{role}', [RbacController::class, 'destroyRole']);
    
        Route::get('permissions', [RbacController::class, 'permissions']);
    
        Route::put('roles/{role}/permissions', [RbacController::class, 'syncPermissions']);
        Route::get('users/{user}/roles', [RbacController::class, 'userRoles']);
        Route::put('users/{user}/roles', [RbacController::class, 'syncUserRoles']);
    });
});
