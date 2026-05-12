<?php

namespace App\Services;

use App\Models\Test;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class LayoutAdvisorService
{
    public function recommend(Test $test, Collection $questions): array
    {
        $total = $questions->count();
        $typeCounts = $questions->groupBy('question_type')->map->count();
        $avgLength = (int) $questions->avg(fn ($q) => mb_strlen($q->question_text ?? ''));

        $prompt = <<<EOT
以下のテスト情報を元に、Word文書のレイアウトをJSON形式で返してください。
フォントサイズ・フォント・カラーは変更しないこと。

問題数: {$total}問
問題形式: {$typeCounts->map(fn ($c, $t) => "{$t} {$c}問")->implode('、')}
問題文の平均文字数: {$avgLength}文字

以下のJSONのみ返してください（説明文は不要）:
{
  "columns": 1,
  "question_spacing": "normal",
  "choice_layout": "vertical",
  "answer_line_height": "single",
  "margin": "normal"
}
columnsは1または2、question_spacingはnarrow/normal/wide、choice_layoutはvertical/horizontal、answer_line_heightはsingle/triple、marginはnormal/wideから選んでください。
EOT;

        $response = Http::timeout(10)->withHeaders([
            'Authorization' => 'Bearer ' . config('services.openai.key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'max_tokens' => 256,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if ($response->failed()) {
            return $this->defaultLayout();
        }

        $text = $response->json('choices.0.message.content', '');
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/\s*```$/m', '', $text);
        $layout = json_decode(trim($text), true);

        return is_array($layout) ? $layout : $this->defaultLayout();
    }

    private function defaultLayout(): array
    {
        return [
            'columns' => 1,
            'question_spacing' => 'normal',
            'choice_layout' => 'vertical',
            'answer_line_height' => 'single',
            'margin' => 'normal',
        ];
    }
}
