# AI問題生成機能 — OpenAI API 連携

**日付**: 2026-05-02
**会話の概要**: テキスト入力または教科書写真から AI が問題を自動生成する機能を設計し、バックエンドの FormRequest・Controller メソッドを実装した。レビューで発見したバグも修正した。

---

## 今日学んだ概念

### config() を使った外部APIキーの管理
- **何か**: `.env` の値を `config/services.php` 経由で参照する Laravel の規約
- **なぜ必要か**: コードに直接 API キーを書くと Git に漏れるリスクがある。`config()` を使えば環境ごとに値を差し替えられる
- **例え**: `.env` は「金庫」、`config/services.php` は「金庫の目次」。コードは目次を通じてしか金庫に触れない

### FormRequest の条件付きバリデーション（required_if）
- **何か**: 別のフィールドの値によってバリデーションルールを切り替える仕組み
- **なぜ必要か**: 「テキスト入力モードのときは `topic` 必須、画像モードのときは `images` 必須」のような条件分岐をバリデーション層で表現できる
- **例え**: 「支払い方法がカードなら、カード番号を必須にする」のと同じ発想

### base64 エンコード
- **何か**: バイナリデータ（画像など）をテキスト文字列に変換する方式
- **なぜ必要か**: HTTP の JSON では画像ファイルをそのまま送れない。テキスト化することで JSON の文字列フィールドに埋め込める
- **例え**: 画像を「暗号文字列」に変換して送り、受け取った側が元に戻すイメージ

### ヒアドキュメント（<<<EOT）
- **何か**: PHP で複数行の文字列を書くための構文
- **なぜ必要か**: AI へのプロンプトのような長い文字列を、文字列連結なしに読みやすく書ける
- **例え**: 普通の文字列が「1行メモ」なら、ヒアドキュメントは「複数行の手紙」

### match 式
- **何か**: PHP 8 の `switch` をより厳密・簡潔にした構文
- **なぜ必要か**: `switch` は型の緩い比較（`==`）をするが `match` は厳密比較（`===`）。また各ケースは式として値を返せる
- **例え**: 「easy → 易しい」のような変換表として使う

---

## 書いたコード

### GenerateQuestionsRequest — 条件付きバリデーション

```php
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
```

**ポイント解説:**
- `'in:text,image'`: 値が `text` か `image` のどちらかでなければバリデーションエラー（**スペースを入れてはいけない**。`'in:text, image'` だと ` image` と比較されてしまう）
- `'required_if:input_type,text'`: `input_type` が `text` のときだけ必須になる
- `'images.*'`: 配列の各要素へのバリデーション。`*` はワイルドカード
- `'mimes:jpeg,png'`: PDF は OpenAI Vision API の `image_url` 形式では送れないため除外

---

### QuestionController::generate() — OpenAI API 呼び出し

```php
// config/services.php 経由でAPIキーを取得（直書き禁止）
$response = Http::withHeaders([
    'Authorization' => 'Bearer '.config('services.openai.key'),
    'Content-Type'  => 'application/json',
])->post('https://api.openai.com/v1/chat/completions', [
    'model'    => 'gpt-4o-mini',
    'messages' => $messages,
]);
```

**ポイント解説:**
- `Http::` は Laravel の HTTP クライアント（`curl` の便利なラッパー）
- `'Bearer '.config(...)` は OpenAI の認証形式。`Bearer` の後にスペース必須
- `gpt-4o-mini` は速くて安いモデル。テスト生成に最適

---

### 画像の base64 変換（ディスクI/O なし）

```php
foreach ($request->file('images') as $file) {
    // アップロードされたファイルはメモリ上にあるので直接読み込める
    $base64   = base64_encode(file_get_contents($file->getRealPath()));
    $mimeType = $file->getMimeType();

    $contentParts[] = [
        'type'      => 'image_url',
        'image_url' => ['url' => "data:{$mimeType};base64,{$base64}"],
    ];
}
```

**ポイント解説:**
- `$file->getRealPath()` でアップロードされた一時ファイルのパスを取得
- `file_get_contents()` でファイルをメモリに読み込み、`base64_encode()` で文字列化
- `data:image/jpeg;base64,xxxxx` が OpenAI に画像を渡すフォーマット
- **当初は `storeAs()` → `Storage::get()` で一度ディスクに保存していたが、不要なディスクI/Oだったので削除**

---

### AIレスポンスのパース

```php
$text = $response->json('choices.0.message.content', '');

// AIが ```json ... ``` のコードフェンスをつけて返すことがあるので除去
$text = preg_replace('/^```(?:json)?\s*/m', '', $text);
$text = preg_replace('/\s*```$/m', '', $text);

$questions = json_decode(trim($text), true);
```

**ポイント解説:**
- `choices.0.message.content` は OpenAI レスポンスの JSON パス（`choices` 配列の0番目の `message.content`）
- `preg_replace` で正規表現を使いコードフェンスを除去。AI は律儀に ` ```json ` で囲んで返すことがある
- `json_decode($text, true)` の第2引数 `true` を付けると PHP 連想配列として返ってくる（省略するとオブジェクト）

---

## なぜそう書くか（設計の理由）

- **generate はDBに保存しない**: フロントでプレビューを見せてから保存させるUXのため。生成 → 確認 → 保存 の2段階にすることでユーザーが内容を確認できる
- **PDF を除外した理由**: OpenAI Vision API の `image_url` 形式はラスタ画像（JPEG/PNG）のみ対応。PDF は別途ページを画像に変換する処理が必要なため現フェーズでは対象外
- **`use Illuminate\Http\JsonResponse` で戻り値型を短縮**: `\Illuminate\Http\JsonResponse` と完全修飾名を書くより、`use` でインポートして `JsonResponse` と書く方がすっきりする。他のメソッドとの一貫性も保てる
- **`required_if` のスペースは入れない**: `'in:text, image'` と書くと値 `image` が ` image`（先頭スペースあり）として比較されてしまい、バリデーションが通らなくなる。Laravel のバリデーションルールのカンマ区切りにスペースは不要

---

## レビューで見つけたバグ（重要）

今回 `/self-review` でコードレビューを実施し、**実行するまで気づけないバグ**が複数見つかった。

| バグ | 内容 |
|------|------|
| タイポ: `imgaes` | `images` のスペルミス。バリデーションが機能しなかった |
| タイポ: `imput_type` | `input_type` のスペルミス。`required_if` が効かなかった |
| `in:text, image` | スペースが混入し ` image` と比較されていた |
| `use` 宣言漏れ | `Str::uuid()` と `Http::` の `use` がなく実行時エラーになった |

**教訓**: 写経ミスはすぐには気づけない。定期的に `/self-review` でレビューする習慣をつける。

---

## 次回への課題・疑問点

- [ ] ~~Step 6: `batchStore` メソッドの実装~~ ✅
- [ ] ~~Step 7: `routes/web.php` にルートを追加~~ ✅
- [ ] Step 8: フロントエンド `AiGenerateDialog` コンポーネントの実装
- [ ] Step 9: `Tests/Show.tsx` に「AI生成」ボタンを追加
- [ ] `gpt-4o-mini` の画像認識はどの程度正確か？実際に教科書写真で試してみる
- [ ] `json_decode` が失敗したとき（AIが想定外の返答をしたとき）のハンドリングをもっと詳しく知りたい

---

## 追記: batchStore・ルーティング・Gitブランチ操作（同日）

---

## 今日学んだ概念（追記）

### DB::transaction() — データベーストランザクション
- **何か**: 複数のDB操作をひとまとまりにして「全部成功 or 全部なかったこと」にする仕組み
- **なぜ必要か**: ループ途中で例外が発生すると一部の問題だけ保存された中途半端な状態になる。トランザクションで包めば途中失敗時に自動ロールバック
- **例え**: 銀行振込と同じ。「送金側の残高を減らす」と「受取側の残高を増やす」はセットで成功するか、両方なかったことにならなければいけない

### ルートの順序（Laravel のマッチング）
- **何か**: Laravel はルートを上から順にマッチする。先に書いたルートが優先される
- **なぜ必要か**: `/tests/{test}/questions/generate` を `Route::resource` の後に書くと、`generate` が `{question}` パラメータとして解釈されてしまう
- **例え**: 宅配の振り分けルール。「東京都渋谷区」を先に処理しないと「東京都」の汎用ルールに吸い込まれてしまう

### feature ブランチを作り忘れた時の対処
- **何か**: コミット後にブランチを作り、main を1つ前に戻す操作
- **なぜ必要か**: main に直接コミットしてしまったが、個人開発の規約では `feature/*` ブランチで作業する

---

## 書いたコード（追記）

### batchStore — AI生成問題の一括保存

```php
/**
 * AI生成問題を一括でDBに保存する
 */
public function batchStore(BatchStoreQuestionsRequest $request, Test $test): RedirectResponse
{
    abort_if(
        $request->user()->cannot('view', $test),
        404
    );

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
```

**ポイント解説:**
- `$existingMax + $index + 1`: 既存問題の末尾に連番で追加。テストに既に3問あれば AI 生成問題は 4, 5, 6 番になる
- `DB::transaction(function () use (...) { })`: クロージャ（無名関数）の中で DB 操作をまとめる。`use` で外側の変数を取り込む
- `$questionData['choices'] ?? []`: choices が null や未定義のとき空配列にフォールバック（選択式以外は choices がない）

---

### routes/web.php — カスタムルートをリソースルートの前に追加

```php
// ★ resource より前に書く（後だと {question} にマッチしてしまう）
Route::post('tests/{test}/questions/generate', [QuestionController::class, 'generate'])->name('tests.questions.generate');
Route::post('tests/{test}/questions/batch', [QuestionController::class, 'batchStore'])->name('tests.questions.batch');

Route::resource('tests.questions', QuestionController::class)->shallow();
```

**ポイント解説:**
- `->name('tests.questions.generate')`: ルートに名前をつける。コードから `route('tests.questions.generate')` で URL を生成できる
- `->shallow()`: 子リソースの show/edit/update/destroy は親IDなしの URL にする（`questions/{question}` で済む）

---

### feature ブランチを後から作る操作

```bash
# 1. 現在のコミットから feature ブランチを作成
git checkout -b feature/ai-question-generation

# 2. main を1コミット前に戻す（ローカルのみ、push 前なら安全）
git checkout main
git reset --hard HEAD~1

# 3. feature ブランチに戻る
git checkout feature/ai-question-generation
```

**ポイント解説:**
- `git checkout -b`: ブランチを新規作成して同時に切り替え
- `git reset --hard HEAD~1`: HEAD（最新コミット）から1つ前に戻す。`--hard` はワーキングツリーも変更される
- push 済みのコミットに `reset --hard` すると他の人のリポジトリと履歴がずれるので **push 前限定の操作**

---

## なぜそう書くか（設計の理由）（追記）

- **DB::transaction で包む理由**: 10問生成して5問目の途中でサーバーエラーが起きると、5問だけ保存された不完全なテストが残る。トランザクションなら「全部保存 or 何も保存しない」が保証される
- **ルート順序**: Laravel のルーターは上から順にマッチするため、`/generate` や `/batch` を `Route::resource` より後に書くと `{question}` パラメータとして解釈されて意図しないコントローラアクションが呼ばれる
- **N+1 を許容した理由**: 最大10問×4択 = 50クエリ。バルクインサートに書き換えると `created_at`/`updated_at` を手動で設定する必要があり複雑になる。学習プロジェクトのこの規模では過剰な最適化
