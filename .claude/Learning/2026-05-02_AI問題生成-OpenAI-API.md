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

- [ ] Step 6: `batchStore` メソッドの実装
- [ ] Step 7: `routes/web.php` にルートを追加
- [ ] Step 8: フロントエンド `AiGenerateDialog` コンポーネントの実装
- [ ] Step 9: `Tests/Show.tsx` に「AI生成」ボタンを追加
- [ ] `gpt-4o-mini` の画像認識はどの程度正確か？実際に教科書写真で試してみる
- [ ] `json_decode` が失敗したとき（AIが想定外の返答をしたとき）のハンドリングをもっと詳しく知りたい
