<?php

use App\Http\Controllers\SitemapController;
use App\Http\Controllers\WikiController;
use App\Http\Resources\UniverseResource;
use App\Models\Universe;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

//  Landing Page 
Route::get('/', [WikiController::class, 'landing'])->name('home');

//  Sitemap 
Route::get('sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

//  Wiki Pages (public, SEO-friendly) 
Route::prefix('w')->group(function () {
    Route::get('/', [WikiController::class, 'home'])->name('wiki.home');
    Route::get('search', [WikiController::class, 'search'])->name('wiki.search');
    Route::get('changelog', [WikiController::class, 'changelog'])->name('wiki.changelog');

    Route::get('{universe}', [WikiController::class, 'universe'])->name('wiki.universe');
    Route::get('{universe}/type/{entityType}', [WikiController::class, 'entityTypeList'])->name('wiki.entity-type');
    Route::get('{universe}/timeline/{timeline}', [WikiController::class, 'timeline'])->name('wiki.timeline')->scopeBindings();
    Route::get('{universe}/media/{mediaSource}', [WikiController::class, 'mediaSource'])->name('wiki.media-source')->scopeBindings();
    Route::get('{universe}/category/{category}', [WikiController::class, 'category'])->name('wiki.category')->scopeBindings();
    Route::get('{universe}/categories/{category}', [WikiController::class, 'category'])->name('wiki.categories')->scopeBindings();

    // Entity map page (must be before the entity catch-all)
    Route::get('{universe}/{entity}/maps/{map}', [WikiController::class, 'entityMap'])->name('wiki.entity-map');

    // Entity revision history page (must be before the entity catch-all)
    Route::get('{universe}/{entity}/history', [WikiController::class, 'entityHistory'])->name('wiki.entity-history')->scopeBindings();

    // Entity page  registered LAST (catch-all within universe scope)
    Route::get('{universe}/{entity}', [WikiController::class, 'entity'])->name('wiki.entity')->scopeBindings();
});

//  Workspace (existing MDI workbench) 
Route::get('archives', function () {
    $universes = Universe::query()
        ->withCount(['entities', 'timelines', 'mediaSources'])
        ->withBranding()
        ->orderBy('name')
        ->get();

    return Inertia::render('archives/index', [
        'universes'        => UniverseResource::collection($universes)->resolve(),
        'currentUniverse'  => null,
    ]);
})->name('archives');

Route::get('archives/{universe:slug}', function (Universe $universe) {
    $allUniverses = Universe::query()
        ->withCount(['entities', 'timelines', 'mediaSources'])
        ->withBranding()
        ->orderBy('name')
        ->get();

    $universe->loadCount(['entities', 'timelines', 'mediaSources']);
    $universe->load('images');

    return Inertia::render('archives/index', [
        'universes'        => UniverseResource::collection($allUniverses)->resolve(),
        'currentUniverse'  => (new UniverseResource($universe))->resolve(),
    ]);
})->name('archives.universe');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Admin panel
    Route::prefix('admin')->middleware(['permission:meta.manage'])->group(function () {
        Route::redirect('', '/admin/users')->name('admin');
        Route::inertia('users', 'admin/users')->name('admin.users');
        Route::inertia('roles', 'admin/roles')->name('admin.roles');
        Route::inertia('meta', 'admin/meta')->name('admin.meta');
        Route::inertia('universes', 'admin/universes')->name('admin.universes');
    });
});

require __DIR__.'/settings.php';
