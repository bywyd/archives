<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEntityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $universeId = $this->route('universe')?->id ?? $this->input('universe_id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required', 'string', 'max:255',
                Rule::unique('entities')->where('universe_id', $universeId),
            ],
            'short_description' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'entity_type_id' => ['required', 'exists:meta_entity_types,id'],
            'entity_status_id' => ['required', 'exists:meta_entity_statuses,id'],
            'metadata' => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'aliases' => ['nullable', 'array'],
            'aliases.*.alias' => ['required_with:aliases', 'string', 'max:255'],
            'aliases.*.context' => ['nullable', 'string', 'max:255'],
        ];
    }
}
