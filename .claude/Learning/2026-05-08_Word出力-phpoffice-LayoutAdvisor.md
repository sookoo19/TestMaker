# Word出力機能 — phpoffice/phpword & LayoutAdvisorService

**日付**: 2026-05-08
**会話の概要**: フェーズ5（Word出力）の実装を開始。`phpoffice/phpword` のインストール、AI がレイアウトを判断する `LayoutAdvisorService`、Word文書を生成する `TestWordGenerator` の設計・実装を進めた。

---

## 今日学んだ概念

### サービスクラス（Services）

- **何か**: コントローラから「処理のロジック」を切り出して専用クラスに置く設計パターン
- **なぜ必要か**: コントローラが太りすぎると読みにくくなる。「API 呼び出し」「Word 生成」などの責務を分離することで、テストや変更がしやすくなる
- **例え**: レストランで例えると、コントローラは「ウェイター（注文を受けて渡す）」、サービスクラスは「シェフ（実際に料理を作る）」

### PHP ヒアドキュメント（`<<<EOT`）

- **何か**: 長い文字列を複数行で書くための PHP 構文
- **なぜ必要か**: プロンプト文のような長いテキストを変数に入れるとき、文字列連結より読みやすい
- **重要なルール**: 終端の `EOT;` は**必ず行頭（インデントなし）**で書く。スペースが1つでも入るとエラーになる

```php
// 正しい
$prompt = <<<EOT
ここに文章
EOT;

// NG — EOT の前にスペースがある
$prompt = <<<EOT
ここに文章
    EOT;  // ← エラー
```

### `mb_strlen` vs `strlen`

- **何か**: 文字列の「文字数」を返す関数
- **違い**: `strlen` はバイト数（日本語1文字 = 3バイト）、`mb_strlen` は文字数（日本語1文字 = 1）
- **なぜ必要か**: 日本語の問題文の長さを正確に計るには `mb_strlen` が必須

### Collection の `groupBy` + `map->count()`

- **何か**: コレクション（配列のようなもの）をキーでグループ化して、各グループの件数を数える
- **なぜ必要か**: 「選択式3問、記述式2問」のような集計を1行で書ける

```php
$typeCounts = $questions->groupBy('question_type')->map->count();
// 結果: ['choice' => 3, 'descriptive' => 2]
```

### `match` 式

- **何か**: PHP 8.0 以降の `switch` の進化版。値に応じて返す値を切り替える
- **なぜ必要か**: `switch` より短く書けて、戻り値を直接変数に代入できる

```php
$spacing = match($this->layout['question_spacing']) {
    'narrow' => 60,
    'wide'   => 240,
    default  => 120,
};
```

---

## 書いたコード

### LayoutAdvisorService — Claude API でレイアウトを取得

```php
public function recommend(Test $test, Collection $questions): array
{
    $total = $questions->count();
    $typeCounts = $questions->groupBy('question_type')->map->count();
    $avgLength = $questions->avg(fn ($q) => mb_strlen($q->question_text ?? ''));

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
  ...
}
EOT;

    $response = Http::withHeaders([
        'x-api-key' => config('services.anthropic.key'),
        'anthropic-version' => '2023-06-01',
        'content-type' => 'application/json',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 256,
        'messages' => [['role' => 'user', 'content' => $prompt]],
    ]);

    $text = $response->json('content.0.text', '');
    $layout = json_decode(trim($text), true);

    return is_array($layout) ? $layout : [/* デフォルト値 */];
}
```

**ポイント解説:**
- `config('services.anthropic.key')`: `.env` の `ANTHROPIC_API_KEY` を読む（`config/services.php` に登録が必要）
- `'anthropic-version' => '2023-06-01'`: 現時点での最新バージョン（2026-05-08 確認済み）
- `is_array($layout) ? $layout : [...]`: API が失敗してもデフォルト値でクラッシュを防ぐフォールバック

### TestWordGenerator — phpoffice/phpword で .docx 生成（設計）

```php
public function generate(Test $test, Collection $questions, array $layout): PhpWord
{
    $this->layout = $layout;
    $phpWord = new PhpWord();

    $this->addExamSection($phpWord, $test, $questions);      // テスト用紙
    $this->addAnswerSheetSection($phpWord, $test, $questions); // 解答用紙
    $this->addAnswerKeySection($phpWord, $test, $questions);   // 答え

    return $phpWord;
}
```

**ポイント解説:**
- `addSection()` を3回呼ぶことで3ページ分（3セクション）を生成
- `$this->layout` にレイアウト設定を持たせて各メソッドで参照
- フォントは固定（`MS明朝` / 16pt・12pt・11pt）

---

## なぜそう書くか（設計の理由）

- **Services ディレクトリを新規作成**: Laravel に標準の置き場所はないが、慣習として `app/Services/` に置く。コントローラが「何をするか」だけ知っていればよく、「どうやるか」はサービスクラスが持つ
- **API 失敗時にデフォルト値を返す**: `LayoutAdvisorService` が落ちても Word 出力自体は止まらないようにする。レイアウトは「最悪デフォルトでも動く」が正しい設計
- **3セクション構成**: テスト用紙・解答用紙・答えを1ファイルにまとめることで、教師が1ダウンロードで全部入手できる。印刷時にページ選択で使い分ける

---

## 次回への課題・疑問点

- [ ] `TestWordGenerator` の写経と動作確認
- [ ] `TestController::word()` の実装（ルートへの接続）
- [ ] `.env` に `ANTHROPIC_API_KEY` を追加する
- [ ] `config/services.php` に anthropic キーを登録する
- [ ] phpoffice/phpword の `addSection` で実際にページが分かれるか確認したい
- [ ] `columns: 2` のとき phpoffice でどうカラムレイアウトを実現するか未確認
