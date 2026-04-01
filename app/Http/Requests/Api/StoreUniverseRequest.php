<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreUniverseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:universes,slug'],
            'description' => ['nullable', 'string'],
                'settings'    => ['nullable', 'array'],
                'compound_names' => ['nullable', 'array'],
                'compound_names.*' => ['string', 'max:255'],
        ];
    }
}
