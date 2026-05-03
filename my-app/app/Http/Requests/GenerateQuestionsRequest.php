<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'input_type'    => ['required', 'in:text,image'],
            'topic'         => ['required_if:input_type,text', 'nullable', 'string', 'max:200'],
            'images'        => ['required_if:input_type,image', 'nullable', 'array', 'min:1', 'max:10'],
            'images.*'      => ['file', 'mimes:jpeg,png', 'max:10240'],
            'count'         => ['required', 'integer', 'min:1', 'max:10'],
            'difficulty'    => ['required', 'in:easy,medium,hard'],
            'question_type' => ['required', 'in:descriptive,choice,fill_blank,ordering'],
        ];
    }
}
