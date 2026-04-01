<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMediaSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $universeId = $this->route('universe')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required', 'string', 'max:255',
                Rule::unique('media_sources')->where('universe_id', $universeId),
            ],
            'media_type' => ['required', 'string', Rule::in(['game', 'movie', 'book', 'comic', 'anime', 'tv_series', 'novel', 'manga', 'ova', 'other'])],
            'release_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
