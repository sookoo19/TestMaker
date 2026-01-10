<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'subject' => ['nullable', 'string', 'max:25'],
            'difficulty' => ['required', 'in:easy,medium,hard'],
            'status' => ['required', 'in:draft,generating,completed,failed'],
            'output_language' => ['required', 'string', 'max:25'],
        ];
    }
}
