<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // ルートモデルバインディングで渡される 'test' パラメータを取得
        $test = $this->route('test');

        // ユーザーがログインしていて、テストの所有者であれば許可
        return $this->user() !== null && $test !== null && $this->user()->id === $test->user_id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * 部分更新に対応するために `sometimes` を使っています。
     * PUT/PATCH のどちらを使っても動作するように設計してください。
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:25'],
            'difficulty' => ['sometimes', 'required', 'in:easy,medium,hard'],
            'status' => ['sometimes', 'required', 'in:draft,generating,completed,failed'],
            'output_language' => ['sometimes', 'required', 'string', 'max:25'],
        ];
    }
}
