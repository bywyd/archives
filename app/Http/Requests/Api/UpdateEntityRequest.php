<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEntityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $entity = $this->route('entity');
        $universeId = $this->route('universe')?->id ?? $entity?->universe_id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('entities')->where('universe_id', $universeId)->ignore($entity),
            ],
            'short_description' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'entity_type_id' => ['sometimes', 'exists:meta_entity_types,id'],
            'entity_status_id' => ['sometimes', 'exists:meta_entity_statuses,id'],
            'metadata' => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'aliases' => ['sometimes', 'array'],
            'aliases.*.alias' => ['required', 'string', 'max:255'],
            'aliases.*.context' => ['nullable', 'string', 'max:255'],
        ];
    }
}
