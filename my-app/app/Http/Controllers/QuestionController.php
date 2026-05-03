<?php

namespace App\Http\Controllers;

use App\Http\Requests\BatchStoreQuestionsRequest;
use App\Http\Requests\GenerateQuestionsRequest;
use App\Http\Requests\StoreQuestionRequest;
use App\Http\Requests\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Models\Test;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class QuestionController extends Controller
{
    /**
     * Display a listing of the resource.
     * 特定のテストに紐づく質問一覧を表示
     */
    public function index(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $questions = $test->questions()->orderBy('sort_order')->get();

        return Inertia::render('Questions/Index', [
            'test' => $test,
            'questions' => QuestionResource::collection($questions),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * 特定のテストに紐づく質問作成画面を表示
     */
    public function create(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        return Inertia::render('Questions/Create', [
            'test' => $test,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * 特定のテストに紐づく質問を作成
     */
    public function store(StoreQuestionRequest $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $question = $test->questions()->create($request->safe()->except('choices'));

        foreach ($request->validated()['choices'] ?? [] as $index => $choice) {
            $question->questionChoices()->create([
                'choice_text' => $choice['choice_text'],
                'is_correct' => $choice['is_correct'],
                'sort_order' => $index,
            ]);
        }

        return redirect()->route('questions.show', $question);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('view', $question),
            404
        );

        return Inertia::render('Questions/Show', [
            'question' => new QuestionResource(
                $question->load(['test', 'questionChoices' => fn ($q) => $q->orderBy('sort_order')])
            ),
            'choices' => $question->questionChoices,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('update', $question),
            404
        );

        return Inertia::render('Questions/Edit', [
            'question' => new QuestionResource(
                $question->load(['test', 'questionChoices' => fn ($q) => $q->orderBy('sort_order')])
            ),
            'choices' => $question->questionChoices,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateQuestionRequest $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('update', $question),
            404
        );

        $question->update($request->validated());

        return redirect()->route('questions.show', $question);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Question $question)
    {
        $test = $question->test;

        abort_if(
            $request->user()->cannot('delete', $question),
            404
        );

        $question->delete();

        return redirect()->route('tests.show', $test);
    }

    public function generate(GenerateQuestionsRequest $request, Test $test): JsonResponse
    {
        // 他人のテストへのアクセスを404で弾く
        abort_if($request->user()->cannot('view', $test), 404);

        // バリデーション済みデータを取り出す
        $validated = $request->validated();
        $count = $validated['count'];
        $difficulty = $validated['difficulty'];
        $questionType = $validated['question_type'];

        // 難易度を日本語に変換（AIへのプロンプト用）
        $difficultyJa = match ($difficulty) {
            'easy' => '易しい',
            'medium' => '普通',
            'hard' => '難しい',
        };

        // 問題形式を日本語の指示文に変換
        $questionTypeJa = match ($questionType) {
            'descriptive' => '記述式（question_textに問い、correct_answerに模範解答）',
            'choice' => '選択式（choicesに4つの選択肢、うち1つis_correct:true）',
            'fill_blank' => '穴埋め（question_textに___で空白、correct_answerに答え）',
            'ordering' => '並び替え（choicesに並び替え要素、correct_answerに正しい順序）',
        };

        // AIに渡す指示書（どんなJSONを返すか定義）
        $instructionText = <<<EOT
        以下の条件で問題を{$count}問作成してください。
        難易度: {$difficultyJa}
        問題形式: {$questionTypeJa}

        必ずJSON配列のみで返答してください。JSONの前後に説明文は不要です。
        各問題オブジェクトのフィールド:
        - question_type: "{$questionType}"
        - question_text: 問題文（文字列）
        - correct_answer: 正解（文字列）
        - explanation: 解説（文字列）
        - difficulty: "{$difficulty}"
        - sort_order: 1始まりの連番（整数）
        - choices: 選択式・並び替えの場合のみ配列。各要素は {"choice_text": "...", "is_correct": true/false}
        EOT;

        // テキストモードと画像モードでOpenAIへ渡すメッセージ形式が異なる
        if ($validated['input_type'] === 'text') {
            // テキストモード: テーマ文字列 + 指示書をそのまま送る
            $messages = [[
                'role' => 'user',
                'content' => "テーマ: {$validated['topic']}\n\n{$instructionText}",
            ]];
        } else {
            // 画像モード: 画像をbase64に変換してOpenAIに送る
            $contentParts = [];

            foreach ($request->file('images') as $file) {
                // ディスクI/Oを避けるためメモリ上で直接base64エンコード
                $base64 = base64_encode(file_get_contents($file->getRealPath()));
                $mimeType = $file->getMimeType();

                // OpenAIの画像フォーマット: data:image/jpeg;base64,xxxxx
                $contentParts[] = [
                    'type' => 'image_url',
                    'image_url' => ['url' => "data:{$mimeType};base64,{$base64}"],
                ];
            }

            // 画像の後ろに指示書テキストを追加
            $contentParts[] = ['type' => 'text', 'text' => "この教科書の内容から\n\n{$instructionText}"];

            $messages = [['role' => 'user', 'content' => $contentParts]];
        }

        // OpenAI APIを呼び出す
        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.config('services.openai.key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => $messages,
        ]);

        // API呼び出し失敗時はエラーを返す
        if ($response->failed()) {
            return response()->json(['error' => 'AI APIの呼び出しに失敗しました'], 500);
        }

        // レスポンスからAIの返答テキストを取り出す
        $text = $response->json('choices.0.message.content', '');

        // AIが ```json ... ``` のコードフェンスをつけて返すことがあるので除去
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/\s*```$/m', '', $text);

        // JSON文字列をPHP配列に変換
        $questions = json_decode(trim($text), true);

        // パース失敗時はエラーを返す
        if (! is_array($questions)) {
            return response()->json(['error' => 'AIの返答を解析できませんでした'], 500);
        }

        // DBには保存せずフロントにそのまま返す（プレビュー用）
        return response()->json(['questions' => $questions]);
    }

    /**
     * AI生成問題を一括でDBに保存する
     */
    public function batchStore(BatchStoreQuestionsRequest $request, Test $test): RedirectResponse
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        // 既存問題のsort_orderの最大値を取得（末尾に追加するため）
        $existingMax = $test->questions()->max('sort_order') ?? 0;
        $questions   = $request->validated()['questions'];

        // 途中で例外が発生しても中途半端な状態にならないようトランザクションで保護
        DB::transaction(function () use ($test, $questions, $existingMax) {
            foreach ($questions as $index => $questionData) {
                $question = $test->questions()->create([
                    'question_type'  => $questionData['question_type'],
                    'question_text'  => $questionData['question_text'],
                    'correct_answer' => $questionData['correct_answer'],
                    'explanation'    => $questionData['explanation'] ?? null,
                    'difficulty'     => $questionData['difficulty'],
                    'sort_order'     => $existingMax + $index + 1,
                ]);

                foreach ($questionData['choices'] ?? [] as $choiceIndex => $choice) {
                    $question->questionChoices()->create([
                        'choice_text' => $choice['choice_text'],
                        'is_correct'  => $choice['is_correct'],
                        'sort_order'  => $choiceIndex,
                    ]);
                }
            }
        });

        return redirect()->route('tests.show', $test);
    }
}
