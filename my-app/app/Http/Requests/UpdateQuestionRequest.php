<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
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
            'question_type' => ['sometimes', 'required', 'in:descriptive,choice,fill_blank,ordering'],
            'question_text' => ['sometimes', 'required', 'string'],
            'correct_answer' => ['sometimes', 'required', 'string'],
            'explanation' => ['sometimes', 'nullable', 'string'],
            'difficulty' => ['sometimes', 'required', 'in:easy,medium,hard'],
            'sort_order' => ['sometimes', 'required', 'integer'],
        ];
    }
}
