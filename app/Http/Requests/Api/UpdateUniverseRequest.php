<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUniverseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('universes', 'slug')->ignore($this->route('universe'))],
            'description' => ['nullable', 'string'],
            'settings' => ['nullable', 'array'],
            'settings.theme_color' => ['nullable', 'string'],
                'compound_names'       => ['nullable', 'array'],
                'compound_names.*'     => ['string', 'max:255'],
            ];
    }
}
