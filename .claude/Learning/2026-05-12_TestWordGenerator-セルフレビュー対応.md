# TestWordGenerator 実装 + セルフレビュー対応

**日付**: 2026-05-12
**会話の概要**: Word出力機能の `TestWordGenerator` クラスを完成させ、`/self-review` でコードレビューを実施。指摘に基づいてリファクタリングを行った。

---

## 今日学んだ概念

### `$this->` プロパティ vs メソッド引数

- **何か**: クラスの中でデータを「どこから参照できるか」を決める仕組み
- **なぜ必要か**: メソッドの引数はそのメソッド内でしか使えない。`$this->` に保存すると同じクラスの全メソッドから参照できる
- **例え**: 引数はメモ用紙（そのミーティングだけ）、`$this->` はホワイトボード（会議室全員が見られる）

```php
// $layout はこのメソッドの中だけ
public function generate(..., array $layout): PhpWord
{
    $this->layout = $layout;  // ← ホワイトボードに書く
    $this->addExamSection();  // ← 別メソッドから $this->layout を参照できる
}
```

---

### `match` 式によるマッピング

- **何か**: 値に応じて別の値を返す PHP 8.0 以降の構文。`switch` の進化版
- **なぜ必要か**: `switch` より短く書けて、結果を直接変数に代入できる
- **例え**: 信号機の色 → 行動のルール表

```php
$spacing = match ($this->layout['question_spacing'] ?? 'normal') {
    'narrow' => 60,
    'wide'   => 240,
    default  => 120,
};
// ?? 'normal' は配列にキーがない場合のフォールバック（デフォルト値）
```

---

### Eloquent のリレーション名とプロパティ名の一致

- **何か**: Laravel の Eloquent（データベース操作ライブラリ）は、モデルに定義されたリレーション名でしか関連データを取得できない
- **なぜ必要か**: 名前が違うと `null` や空コレクションが返り、バグの原因になる
- **例え**: 辞書の見出し語が違うと意味が引けないのと同じ

```php
// Question モデルの定義
public function questionChoices(): HasMany { ... }

// NG: choices は定義されていない → 空になる
$question->choices

// OK: 定義名と一致させる
$question->questionChoices
```

---

### `defaultLayout()` private メソッドによるDRY原則

- **何か**: DRY（Don't Repeat Yourself）= 同じ内容を2箇所に書かない原則
- **なぜ必要か**: デフォルト値が2箇所にあると、変更時に片方を直し忘れるリスクがある
- **例え**: 会社の住所を書類に毎回手書きするより、スタンプ1本にまとめる

```php
// Before: 同じ配列が2箇所に分散
return is_array($layout) ? $layout : [
    'columns' => 1,
    'question_spacing' => 'normal',
    ...
];

// After: private メソッドに集約
return is_array($layout) ? $layout : $this->defaultLayout();

private function defaultLayout(): array
{
    return ['columns' => 1, 'question_spacing' => 'normal', ...];
}
```

---

### HTTP エラーハンドリング

- **何か**: 外部 API（今回は Claude API）が失敗したときの処理
- **なぜ必要か**: ネットワーク障害・タイムアウト・APIキー不正など、外部サービスはいつでも失敗しうる。握りつぶさず、安全なデフォルト値を返す
- **例え**: 天気予報 API が落ちても「取得できませんでした」と表示するだけで、アプリ全体がクラッシュしない

```php
$response = Http::timeout(10)->withHeaders([...])->post(...);

if ($response->failed()) {
    return $this->defaultLayout();  // API失敗 → デフォルトレイアウトで継続
}
```

- `Http::timeout(10)`: 10秒で諦める。未設定だと Laravel デフォルト（30秒）まで待ち続ける
- `$response->failed()`: HTTP 4xx / 5xx やネットワーク障害を検知

---

## 書いたコード

### TestWordGenerator — 全体構成

```php
class TestWordGenerator
{
    private array $layout;

    public function generate(Test $test, Collection $questions, array $layout): PhpWord
    {
        $this->layout = $layout;
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('MS明朝');
        $phpWord->setDefaultFontSize(12);

        $this->addExamSection($phpWord, $test, $questions);       // テスト用紙
        $this->addAnswerSheetSection($phpWord, $test, $questions); // 解答用紙
        $this->addAnswerKeySection($phpWord, $test, $questions);   // 答え

        return $phpWord;
    }
}
```

**ポイント解説:**
- `addSection()` を3回呼ぶことで Word ファイル内に3セクション（ページ群）を生成
- `setDefaultFontName` / `setDefaultFontSize` でドキュメント全体のフォントを固定

---

### addExamSection — テスト用紙

```php
private function addExamSection(PhpWord $phpWord, Test $test, Collection $questions): void
{
    $spacing = match ($this->layout['question_spacing'] ?? 'normal') {
        'narrow' => 60, 'wide' => 240, default => 120,
    };

    $section = $phpWord->addSection();
    $section->addText($test->title, ['size' => 16, 'bold' => true], ['alignment' => Jc::CENTER]);

    foreach ($questions as $i => $question) {
        $section->addTextBreak(1);
        $section->addText(($i + 1).'．'.$question->question_text, ['size' => 12], ['spaceAfter' => $spacing]);

        if ($question->question_type === 'choice') {
            foreach ($question->questionChoices as $j => $choice) {
                $label = ['ア', 'イ', 'ウ', 'エ'][$j] ?? ($j + 1);
                $section->addText('　'.$label.'．'.$choice->choice_text, ['size' => 11]);
            }
        }
    }
}
```

**ポイント解説:**
- `addTextBreak(1)`: 空行1つ挿入
- `spaceAfter`: 段落後の余白（ポイント単位）。`$spacing` で AI レイアウト指示を反映
- `['ア','イ','ウ','エ'][$j] ?? ($j + 1)`: 配列の $j 番目を取得。5個目以降は数字にフォールバック

---

### LayoutAdvisorService — リファクタリング後

```php
public function recommend(Test $test, Collection $questions): array
{
    $avgLength = (int) $questions->avg(fn ($q) => mb_strlen($q->question_text ?? ''));
    // ...
    $response = Http::timeout(10)->withHeaders([...])->post(...);

    if ($response->failed()) {
        return $this->defaultLayout();
    }

    $layout = json_decode(trim($text), true);
    return is_array($layout) ? $layout : $this->defaultLayout();
}

private function defaultLayout(): array
{
    return ['columns' => 1, 'question_spacing' => 'normal', ...];
}
```

**ポイント解説:**
- `(int)`: `avg()` は小数（float）を返すため、整数にキャストしてプロンプトを自然にする
- `$response->failed()` を `json_decode` より前に置く → 失敗レスポンスに対してパースを試みない

---

## なぜそう書くか（設計の理由）

- **3セクション構成**: テスト用紙・解答用紙・答えを1ファイルにまとめる。教師が1ダウンロードで揃い、印刷時にページ選択で使い分けられる
- **API 失敗時にデフォルト値を返す**: `LayoutAdvisorService` が落ちても Word 出力自体は止まらない設計。「レイアウトは最悪デフォルトでも動く」が正しい
- **未使用変数を作らない**: `$title = $section->addText(...)` のように戻り値を使わない変数代入は、読む人に「なぜ代入している？」と疑問を持たせる。使わないなら代入しない

---

## 次回への課題・疑問点

- [ ] `TestController::word()` の実装（ルートへの接続）
- [ ] `.env` に `ANTHROPIC_API_KEY` を追加する（Word 出力機能を実際に動かすとき）
- [ ] `columns: 2` のとき phpoffice でどうカラムレイアウトを実現するか未確認
- [ ] `addSection()` を3回呼ぶと実際に改ページされるか動作確認
