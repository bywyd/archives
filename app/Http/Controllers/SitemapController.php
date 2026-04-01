<?php

namespace App\Http\Controllers;

use App\Models\Entity;
use App\Models\MediaSource;
use App\Models\Timeline;
use App\Models\Universe;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $xml = Cache::remember('sitemap:xml', 3600, function () {
            $urls = [];
            $baseUrl = rtrim(config('app.url'), '/');

            // Landing + wiki home
            $urls[] = ['loc' => $baseUrl, 'changefreq' => 'daily', 'priority' => '1.0'];
            $urls[] = ['loc' => "{$baseUrl}/w", 'changefreq' => 'daily', 'priority' => '0.9'];
            $urls[] = ['loc' => "{$baseUrl}/w/changelog", 'changefreq' => 'daily', 'priority' => '0.4'];
            $urls[] = ['loc' => "{$baseUrl}/w/search", 'changefreq' => 'weekly', 'priority' => '0.3'];

            // Universes
            $universes = Universe::all(['id', 'slug', 'updated_at']);
            foreach ($universes as $u) {
                $urls[] = [
                    'loc' => "{$baseUrl}/w/{$u->slug}",
                    'lastmod' => $u->updated_at->toW3cString(),
                    'changefreq' => 'weekly',
                    'priority' => '0.8',
                ];
            }

            // Entities
            $entities = Entity::with('universe:id,slug')
                ->select(['id', 'slug', 'universe_id', 'entity_type_id', 'updated_at'])
                ->get();

            foreach ($entities as $e) {
                if (!$e->universe) continue;
                $urls[] = [
                    'loc' => "{$baseUrl}/w/{$e->universe->slug}/{$e->slug}",
                    'lastmod' => $e->updated_at->toW3cString(),
                    'changefreq' => 'weekly',
                    'priority' => '0.7',
                ];
            }

            // Timelines
            $timelines = Timeline::with('universe:id,slug')
                ->select(['id', 'slug', 'universe_id', 'updated_at'])
                ->get();

            foreach ($timelines as $t) {
                if (!$t->universe) continue;
                $urls[] = [
                    'loc' => "{$baseUrl}/w/{$t->universe->slug}/timeline/{$t->slug}",
                    'lastmod' => $t->updated_at->toW3cString(),
                    'changefreq' => 'monthly',
                    'priority' => '0.5',
                ];
            }

            // Media sources
            $mediaSources = MediaSource::with('universe:id,slug')
                ->select(['id', 'slug', 'universe_id', 'updated_at'])
                ->get();

            foreach ($mediaSources as $m) {
                if (!$m->universe) continue;
                $urls[] = [
                    'loc' => "{$baseUrl}/w/{$m->universe->slug}/media/{$m->slug}",
                    'lastmod' => $m->updated_at->toW3cString(),
                    'changefreq' => 'monthly',
                    'priority' => '0.5',
                ];
            }

            return $this->buildXml($urls);
        });

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }

    private function buildXml(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>" . htmlspecialchars($url['loc'], ENT_XML1, 'UTF-8') . "</loc>\n";
            if (isset($url['lastmod'])) {
                $xml .= "    <lastmod>{$url['lastmod']}</lastmod>\n";
            }
            if (isset($url['changefreq'])) {
                $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
            }
            if (isset($url['priority'])) {
                $xml .= "    <priority>{$url['priority']}</priority>\n";
            }
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }
}
