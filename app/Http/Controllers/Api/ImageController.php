<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ImageResource;
use App\Models\Image;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ImageController extends Controller
{
    /**
     * Upload an image via the configured CDN disk (ftp/sftp) and attach to an imageable model.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'image', 'max:10240'], // 10 MB
            'imageable_type' => ['required', 'string', Rule::in(['entity', 'universe', 'timeline', 'section', 'map_floor', 'media_source'])],
            'imageable_id' => ['required', 'integer'],
            'type' => ['required', Rule::in(['profile', 'gallery', 'banner', 'icon'])],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
            'credit' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $imageableMap = [
            'entity' => \App\Models\Entity::class,
            'universe' => \App\Models\Universe::class,
            'timeline' => \App\Models\Timeline::class,
            'section' => \App\Models\EntitySection::class,
            'map_floor' => \App\Models\EntityMapFloor::class,
            'media_source' => \App\Models\MediaSource::class,
        ];

        $imageableClass = $imageableMap[$request->input('imageable_type')];
        $imageable = $imageableClass::findOrFail($request->input('imageable_id'));

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $extension;

        // Organize by imageable type / imageable id
        $directory = 'images/' . $request->input('imageable_type') . '/' . $request->input('imageable_id');
        $path = $directory . '/' . $filename;

        // Upload to configured CDN disk
        $disk = $this->getCdnDisk();
        $disk->put($path, file_get_contents($file->getRealPath()));

        $cdnBase = rtrim(config('app.cdn_url', config('app.url')), '/');
        $url = $cdnBase . '/' . $path;

        // Generate thumbnail path (same directory, prefixed)
        $thumbnailUrl = null;
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            $thumbnailUrl = $cdnBase . '/' . $directory . '/thumb_' . $filename;
            // Upload resized thumbnail if GD is available
            $this->uploadThumbnail($disk, $file->getRealPath(), $directory . '/thumb_' . $filename, $extension);
        }

        $image = $imageable->images()->create([
            'type' => $request->input('type'),
            'url' => $url,
            'thumbnail_url' => $thumbnailUrl,
            'alt_text' => $request->input('alt_text'),
            'caption' => $request->input('caption'),
            'credit' => $request->input('credit'),
            'sort_order' => $request->input('sort_order', 0),
        ]);

       if (method_exists($imageable, 'flushCache')) {
            $imageable->flushCache();
        }

        return response()->json([
            'data' => new ImageResource($image),
        ], 201);
    }

    /**
     * Delete an image from CDN and database.
     */
    public function destroy(Image $image): JsonResponse
    {
        // Remove from CDN disk
        $disk = $this->getCdnDisk();
        $cdnBase = rtrim(config('app.cdn_url', config('app.url')), '/');

        $path = str_replace($cdnBase . '/', '', $image->url);
        $disk->delete($path);

        if ($image->thumbnail_url) {
            $thumbPath = str_replace($cdnBase . '/', '', $image->thumbnail_url);
            $disk->delete($thumbPath);
        }

        $image->delete();

        return response()->json(null, 204);
    }

    /**
     * Update image metadata (alt, caption, credit, type, sort_order).
     */
    public function update(Request $request, Image $image): JsonResponse
    {
        $request->validate([
            'type' => ['sometimes', Rule::in(['profile', 'gallery', 'banner', 'icon'])],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
            'credit' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $image->update($request->only(['type', 'alt_text', 'caption', 'credit', 'sort_order']));

        return response()->json([
            'data' => new ImageResource($image),
        ]);
    }

    private function getCdnDisk(): \Illuminate\Contracts\Filesystem\Filesystem
    {
        $diskName = config('app.cdn_disk', 'ftp');

        return Storage::disk($diskName);
    }

    private function uploadThumbnail($disk, string $sourcePath, string $destPath, string $extension): void
    {
        if (! extension_loaded('gd')) {
            return;
        }

        $image = match ($extension) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($sourcePath),
            'png' => @imagecreatefrompng($sourcePath),
            'webp' => @imagecreatefromwebp($sourcePath),
            default => false,
        };

        if (! $image) {
            return;
        }

        $origW = imagesx($image);
        $origH = imagesy($image);
        $maxDim = 300;

        if ($origW <= $maxDim && $origH <= $maxDim) {
            // Small enough, just copy original as thumbnail
            $disk->put($destPath, file_get_contents($sourcePath));
            imagedestroy($image);

            return;
        }

        $ratio = min($maxDim / $origW, $maxDim / $origH);
        $newW = (int) ($origW * $ratio);
        $newH = (int) ($origH * $ratio);

        $thumb = imagecreatetruecolor($newW, $newH);

        // Preserve transparency for PNG/WebP
        if (in_array($extension, ['png', 'webp'])) {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
        }

        imagecopyresampled($thumb, $image, 0, 0, 0, 0, $newW, $newH, $origW, $origH);

        ob_start();
        match ($extension) {
            'jpg', 'jpeg' => imagejpeg($thumb, null, 85),
            'png' => imagepng($thumb, null, 8),
            'webp' => imagewebp($thumb, null, 85),
        };
        $thumbData = ob_get_clean();

        $disk->put($destPath, $thumbData);

        imagedestroy($image);
        imagedestroy($thumb);
    }
}
