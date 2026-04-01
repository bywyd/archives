<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreEntityRelationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_entity_id' => ['required', 'exists:entities,id'],
            'to_entity_id' => ['required', 'exists:entities,id', 'different:from_entity_id'],
            'relation_type_id' => ['required', 'exists:meta_entity_relation_types,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'context' => ['nullable', 'string'],
            'fictional_start' => ['nullable', 'string', 'max:255'],
            'fictional_end' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,former,unknown'],
            'metadata' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
