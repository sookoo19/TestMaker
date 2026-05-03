<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BatchStoreQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'questions' => ['required', 'array',
                'min:1', 'max:10'],
            'questions.*.question_type' => ['required',
                'in:descriptive,choice,fill_blank,ordering'],
            'questions.*.question_text' => ['required', 'string'],
            'questions.*.correct_answer' => ['required', 'string'],
            'questions.*.explanation' => ['nullable', 'string'],
            'questions.*.difficulty' => ['required',
                'in:easy,medium,hard'],
            'questions.*.sort_order' => ['required', 'integer'],
            'questions.*.choices' => ['sometimes', 'array'],
            'questions.*.choices.*.choice_text' => ['required', 'string',
                'max:255'],
            'questions.*.choices.*.is_correct' => ['required', 'boolean'],
        ];
    }
}
