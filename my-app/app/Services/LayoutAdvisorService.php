<?php

namespace App\Services;

use App\Models\Test;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class LayoutAdvisorService
{
    private const LAYOUTS = [
        'compact-2col' => [
            'columns' => 2,
            'question_spacing' => 'narrow',
            'answer_line_height' => 'single',
            'margin' => 'normal',
            'description' => '2カラム。問題数が多く短文中心の選択式テスト向け。',
        ],
        'standard-1col' => [
            'columns' => 1,
            'question_spacing' => 'normal',
            'answer_line_height' => 'single',
            'margin' => 'normal',
            'description' => '1カラム。混合形式の標準的なテスト向け。',
        ],
        'spacious-1col' => [
            'columns' => 1,
            'question_spacing' => 'wide',
            'answer_line_height' => 'triple',
            'margin' => 'wide',
            'description' => '1カラム・広めの行間。記述式が多く長文問題中心のテスト向け。',
        ],
        'mixed-1col' => [
            'columns' => 1,
            'question_spacing' => 'normal',
            'answer_line_height' => 'single',
            'margin' => 'normal',
            'description' => '1カラム。選択式と記述式が混在するテスト向け。',
        ],
    ];

    public function recommend(Test $test, Collection $questions): array
    {
        $total = $questions->count();
        $typeCounts = $questions->groupBy('question_type')->map->count();
        $avgLength = (int) $questions->avg(fn ($q) => mb_strlen($q->question_text ?? ''));

        $layoutList = collect(self::LAYOUTS)
            ->map(fn ($v, $k) => "- {$k}: {$v['description']}")
            ->implode("\n");

        $prompt = <<<EOT
以下のテスト情報を元に、最も適切なレイアウトキーを1つだけ返してください。

問題数: {$total}問
問題形式: {$typeCounts->map(fn ($c, $t) => "{$t} {$c}問")->implode('、')}
問題文の平均文字数: {$avgLength}文字

選択肢（キーのみ返してください）:
{$layoutList}

レイアウトキー（1単語のみ）:
EOT;

        $response = Http::timeout(10)->withHeaders([
            'Authorization' => 'Bearer '.config('services.openai.key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'max_tokens' => 32,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        if ($response->failed()) {
            return $this->defaultLayout();
        }

        $key = trim($response->json('choices.0.message.content', ''));

        return self::LAYOUTS[$key] ?? $this->defaultLayout();
    }

    private function defaultLayout(): array
    {
        return self::LAYOUTS['standard-1col'];
    }
}
