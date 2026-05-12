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

- [x] `TestController::word()` の実装（ルートへの接続）← 完了
- [ ] `columns: 2` のとき phpoffice でどうカラムレイアウトを実現するか未確認
- [ ] `addSection()` を3回呼ぶと実際に改ページされるか動作確認

---

# TestController::word() 実装 + ルート・フロント接続

**追記日**: 2026-05-12
**会話の概要**: `word()` アクションの実装、ルート登録、wayfinder 再生成、`Show.tsx` にダウンロードボタン追加。セルフレビューで一時ファイル管理・サニタイズ・API プロバイダー誤りを修正。

---

## 追加で学んだ概念

### `<a>` vs `<Link>`（Inertia）でのファイルダウンロード

- **何か**: Inertia の `<Link>` は SPA ナビゲーション専用。ファイルダウンロードには通常の `<a href>` を使う
- **なぜ必要か**: `<Link>` はページ遷移をインターセプトするため、ファイルダウンロードが正常に動作しない
- **例え**: 社内の内線電話（Link）vs 外線電話（a タグ）。外部に繋ぐときは外線を使う

```tsx
{/* ファイルダウンロードのため a タグを使用 */}
<a href={word(test).url} className="...">Word出力</a>
```

---

### `tempnam` の落とし穴

- **何か**: PHP の `tempnam()` は一時ファイルを生成してそのパスを返す関数
- **なぜ必要か**: Word ファイルを一時的にサーバーに保存してからダウンロードさせる必要がある
- **落とし穴**: `tempnam()` は拡張子なしでファイルを作成する。`.docx` を付け足した別パスに保存すると、元のファイルが孤立して残り続ける

```php
// NG: 元ファイルが残る
$tempPath = tempnam(sys_get_temp_dir(), 'word') . '.docx';

// OK: 元ファイルを明示的に削除
$tempBase = tempnam(sys_get_temp_dir(), 'word');
$tempPath = $tempBase . '.docx';
@unlink($tempBase);  // ← 元ファイルを削除
```

- `@unlink(...)`: ファイルを削除する関数。`@` は失敗しても警告を出さないエラー抑制演算子

---

### `try/catch` による例外時のリソース後処理

- **何か**: 例外（エラー）が発生したときでも確実にリソースを解放する書き方
- **なぜ必要か**: `deleteFileAfterSend(true)` はダウンロード成功時のみ動く。途中で例外が起きると一時ファイルが残る
- **例え**: お弁当箱を借りたとき、食べ終わっても食べられなくても必ず返す

```php
$writer->save($tempPath);

try {
    return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
} catch (\Throwable $e) {
    @unlink($tempPath);  // 例外時も一時ファイルを削除
    throw $e;            // 例外を再送出して呼び出し元に伝える
}
```

- `\Throwable`: PHP の全エラー・例外の基底インターフェース。`Exception` より広い範囲を捕まえる
- `throw $e`: 捕まえた例外をそのまま再スローする。ログや後処理のためだけに catch する典型パターン

---

### ファイル名のサニタイズ

- **何か**: ユーザー入力をそのままファイル名に使うと危険なため、安全な文字だけに変換する処理
- **なぜ必要か**: `/` `\` `*` `?` などはファイルシステムで特殊な意味を持ち、意図しない動作を引き起こす可能性がある
- **例え**: 「2/3問目」というタイトルをそのままファイル名にすると `/` がパス区切りになってしまう

```php
$safeTitle = preg_replace('/[\/\\\:*?"<>|]/', '_', $test->title);
$filename = $safeTitle . '.docx';
```

- `preg_replace(パターン, 置換文字, 対象)`: 正規表現にマッチした部分を置換する
- `\/\\\:*?"<>|` が危険文字のリスト。すべて `_` に置き換える

---

### wayfinder の再生成

- **何か**: Laravel Wayfinder はバックエンドのルートを TypeScript の型安全な関数として自動生成するツール
- **なぜ必要か**: 新しいルートを追加したときに再生成しないと、フロントエンドからそのルートを型安全に参照できない
- **コマンド**: `php artisan wayfinder:generate`

```bash
# ルートを追加したら必ず実行
php artisan wayfinder:generate
```

---

## 追加で書いたコード

### TestController::word() — Word ダウンロードアクション

```php
public function word(Request $request, Test $test)
{
    abort_if(
        $request->user()->cannot('view', $test),
        404
    );

    $questions = $test->questions()->orderBy('sort_order')->with('questionChoices')->get();

    $layout = (new LayoutAdvisorService)->recommend($test, $questions);
    $phpWord = (new TestWordGenerator)->generate($test, $questions, $layout);

    $safeTitle = preg_replace('/[\/\\\:*?"<>|]/', '_', $test->title);
    $filename = $safeTitle . '.docx';
    $tempBase = tempnam(sys_get_temp_dir(), 'word');
    $tempPath = $tempBase . '.docx';
    @unlink($tempBase);

    $writer = IOFactory::createWriter($phpWord, 'Word2007');
    $writer->save($tempPath);

    try {
        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    } catch (\Throwable $e) {
        @unlink($tempPath);
        throw $e;
    }
}
```

**ポイント解説:**
- `with('questionChoices')`: Eager Load（N+1問題対策）。問題数分クエリが走らない
- `IOFactory::createWriter($phpWord, 'Word2007')`: PhpWord の .docx 書き出し指示
- `response()->download($tempPath, $filename)`: ブラウザにダウンロードを指示するレスポンス

---

### routes/web.php — ルート追加

```php
Route::get('tests/{test}/word', [TestController::class, 'word'])->name('tests.word');
```

**ポイント解説:**
- `->name('tests.word')`: ルートに名前をつける。wayfinder が自動で TypeScript 関数を生成する

---

### Show.tsx — ダウンロードボタン

```tsx
import { destroy, edit, index as testsIndex, word } from '@/routes/tests';

// ...

<a
    href={word(test).url}
    className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
>
    Word出力
</a>
```

---

## なぜそう書くか（設計の理由）

- **OpenAI を使う**: このプロジェクトは OpenAI を採用している（`QuestionController` で実績あり）。`LayoutAdvisorService` を誤って Anthropic API で実装していたため修正。API ごとに認証ヘッダーとレスポンス構造が異なる
- **同期 API 呼び出しの妥当性**: OpenAI 呼び出しは最大10秒待つが、現時点ではシンプルな同期処理で十分。問題が大きくなったときにジョブキューに移行する

---

## 次回への課題・疑問点

- [x] 実際にブラウザで Word ダウンロードを確認する ← 完了
- [ ] `columns: 2` のとき phpoffice でどうカラムレイアウトを実現するか未確認
- [ ] `addSection()` を3回呼ぶと実際に改ページされるか動作確認

---

# Word プレビュー機能 + タブ切り替え + セルフレビュー対応

**追記日**: 2026-05-12  
**会話の概要**: LibreOffice 依存の 500 エラーを解消し PHPWord HTML Writer に切り替え。タブ UI でセクション（テスト用紙・解答用紙・解答）を切り替えられるように実装。セルフレビューで ARIA・useTransition・定数化などを対応した。

---

## 追加で学んだ概念

### LibreOffice 依存をやめて PHPWord HTML Writer に切り替えた理由

- **何か**: PHPWord は DOCX だけでなく HTML 形式でも書き出せる
- **なぜ必要か**: LibreOffice（`soffice`）が Docker 環境で `Error: source file could not be loaded` を返し続けた。外部コマンド依存は環境差異で壊れやすい
- **例え**: Word ファイルを紙に印刷しようとしたがプリンターが壊れていた → ブラウザで直接開いて見せる方針に切り替えた

```php
// Before: LibreOffice で DOCX → PNG 変換（失敗し続けた）
exec('/usr/bin/soffice --headless --convert-to png ...');

// After: PHPWord の HTML ライターで直接 HTML を返す
/** @var \PhpOffice\PhpWord\Writer\HTML $writer */
$writer = IOFactory::createWriter($phpWord, 'HTML');
return response($writer->getContent(), 200)
    ->header('Content-Type', 'text/html; charset=utf-8');
```

- `getContent()`: HTML 文字列を直接取得できるメソッド。一時ファイルを経由しない

---

### `<img>` vs `<iframe>` — 何を表示するかで使い分ける

- **何か**: `<img>` は画像ファイル（PNG/JPG）を表示する。`<iframe>` は HTML ページを埋め込む
- **なぜ必要か**: エンドポイントが返す内容を `text/html` に変えたため、`<img>` では表示できなくなった
- **例え**: 写真を貼るか（img）、別ウィンドウを埋め込むか（iframe）の違い

```tsx
// Before: 画像として表示
<img src={wordImage(test).url} alt='Word プレビュー' className='w-full' />

// After: HTML ページとして埋め込む
<iframe
    src={wordImage(test).url}
    title='Word プレビュー'
    className='w-full h-[600px] border-0'
/>
```

---

### モデルのフィールド名を必ず確認する

- **何か**: Eloquent モデルの `$fillable` に定義された名前が実際のカラム名
- **なぜ必要か**: 存在しないフィールドにアクセスすると `null` が返り、`??` のフォールバックで「解答未設定」が表示されてしまう

```php
// Question モデルの定義
protected $fillable = [
    'question_type',
    'question_text',
    'correct_answer',  // ← 正しいフィールド名
    ...
];

// NG: answer_text は存在しない → 常に null → '（解答未設定）'
$answer = $question->answer_text ?? '（解答未設定）';

// OK
$answer = $question->correct_answer ?? '（解答未設定）';
```

---

### `VALID_SECTIONS` 定数 — 単一ソース（Single Source of Truth）

- **何か**: 有効な値のリストをクラス定数として1箇所に定義する
- **なぜ必要か**: 同じリストをコントローラとサービスの両方に書くと、値を追加したとき片方を直し忘れるリスクがある
- **例え**: 会社の電話番号を全社員のデスクに紙で配るより、イントラネットに1か所だけ書く

```php
// TestWordGenerator.php
class TestWordGenerator
{
    public const VALID_SECTIONS = ['exam', 'answer_sheet', 'answer_key'];
    ...
}

// TestController.php — 定数を参照するだけ
$section = in_array($request->query('section'), TestWordGenerator::VALID_SECTIONS)
    ? $request->query('section')
    : 'exam';
```

---

### private メソッドで重複クエリを排除

- **何か**: 同じ処理を複数のメソッドに繰り返し書かず、private メソッドに切り出す
- **なぜ必要か**: `wordPreview` / `wordImage` / `word` の3メソッドが全く同じ DB クエリを持っていた。変更が必要になったとき3箇所直す必要があった
- **例え**: 毎朝同じメールを3人に個別に書くより、テンプレート1つを使いまわす

```php
// Before: 3メソッドに同じ2行が重複
$questions = $test->questions()->orderBy('sort_order')->with('questionChoices')->get();

// After: private メソッドに集約
private function loadQuestions(Test $test): \Illuminate\Support\Collection
{
    return $test->questions()->orderBy('sort_order')->with('questionChoices')->get();
}

// 各メソッドはこれだけ
$questions = $this->loadQuestions($test);
```

---

### `try/catch` の範囲は「失敗する可能性があるすべての処理」を含める

- **何か**: `try` ブロックは例外が起きうる処理をすべて囲む必要がある
- **なぜ必要か**: `$writer->save($tempPath)` が `try` の外にあると、save 失敗時に一時ファイルが削除されず `/tmp` に溜まり続ける

```php
// Before: save が例外を投げるとファイルが残る
$writer->save($tempPath);           // ← try の外
try {
    return response()->download(...);
} catch (\Throwable $e) {
    @unlink($tempPath);
    throw $e;
}

// After: save も try に含める
try {
    $writer->save($tempPath);       // ← try の中に移動
    return response()->download(...)->deleteFileAfterSend(true);
} catch (\Throwable $e) {
    @unlink($tempPath);
    throw $e;
}
```

---

### `useTransition` — 重くない更新を「後回しに」できる React フック

- **何か**: タブ切り替えなど「急がなくていい UI 更新」を非緊急として扱い、React が優先度を調整できるようにする
- **なぜ必要か**: `useState` のみだと state 更新が即時実行される。`useTransition` を使うと更新中を `isPending` で検知でき、ローディング表示ができる
- **例え**: レジに「急ぎ客を先に通す」レーンを作る。iframe の読み込み中に薄く表示できる

```tsx
const [activeSection, setActiveSection] = useState<Section>('exam');
const [isPending, startTransition] = useTransition();

// クリック時に startTransition でラップ
onClick={() => startTransition(() => setActiveSection(tab.id))}

// isPending 中は iframe を半透明にして「切り替え中」を伝える
<iframe
    className={`... motion-safe:transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
/>
```

---

### ARIA ロール — スクリーンリーダーにタブと伝える

- **何か**: `role` 属性でその要素が何であるかをブラウザ・スクリーンリーダーに伝える
- **なぜ必要か**: 見た目はタブでも、HTML 的には `<div>` と `<button>` の集まりに過ぎない。ARIA がないとキーボード操作や読み上げソフトでタブとして機能しない
- **例え**: ビルの入口の点字ブロックのようなもの。目で見える人には不要だが、見えない人にとっては必須の案内

```tsx
// タブコンテナ
<div role='tablist'>
    {TABS.map((tab) => (
        // 各タブボタン
        <button
            role='tab'
            aria-selected={activeSection === tab.id}  // 選択中かどうかを伝える
            ...
        >
            {tab.label}
        </button>
    ))}
</div>
```

---

### `focus-visible:ring-*` — キーボード操作時のみフォーカスリングを表示

- **何か**: キーボードでフォーカスしたときだけ視覚的な枠（リング）を表示する Tailwind クラス
- **なぜ必要か**: マウス操作ではフォーカスリングは邪魔だが、キーボード操作では「今どこにいるか」がわからないとアクセシビリティ違反になる
- **例え**: エレベーターのボタンは触った人にだけ光る（マウス = 光らない、キーボード = 光る）

```tsx
className='... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
```

- `focus-visible:outline-none`: デフォルトのブラウザ枠を消す（代わりに ring を使う）
- `focus-visible:ring-2`: 2px の枠線
- `focus-visible:ring-offset-1`: ボタンと枠線の間に1px の隙間

---

### `motion-safe:transition-*` — アニメーション削減設定を尊重する

- **何か**: OS の「視差効果を減らす」設定（`prefers-reduced-motion: reduce`）を尊重するクラス
- **なぜ必要か**: アニメーションが原因で頭痛や目眩を起こすユーザーがいる。強制的にアニメーションを表示するのはアクセシビリティ違反
- **例え**: 映画館の字幕オプションのようなもの。必要な人だけオフにできる

```tsx
// Before: 常にアニメーションが動く
className='... transition-colors'

// After: 「アニメーションOK」な設定のときだけ動く
className='... motion-safe:transition-colors'
```

---

## 追加で書いたコード

### WordPreview.tsx — タブ付きプレビュー UI

```tsx
type Section = 'exam' | 'answer_sheet' | 'answer_key';

const TABS: { id: Section; label: string }[] = [
    { id: 'exam', label: 'テスト用紙' },
    { id: 'answer_sheet', label: '解答用紙' },
    { id: 'answer_key', label: '解答' },
];

export default function WordPreview({ test, layout }: Props) {
    const [activeSection, setActiveSection] = useState<Section>('exam');
    const [isPending, startTransition] = useTransition();

    return (
        <div role='tablist' className='flex border-b bg-muted/40'>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    role='tab'
                    aria-selected={activeSection === tab.id}
                    onClick={() => startTransition(() => setActiveSection(tab.id))}
                    className={`... motion-safe:transition-colors focus-visible:ring-2 ... ${
                        activeSection === tab.id ? 'border-primary ...' : 'border-transparent ...'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        <iframe
            src={`${wordImage(test).url}?section=${activeSection}`}
            className={`... motion-safe:transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
        />
    );
}
```

**ポイント解説:**
- `?section=${activeSection}`: クエリパラメータでどのセクションを返すかバックエンドに伝える
- `type Section = '...' | '...'`: TypeScript のユニオン型。3つの文字列しか入れないことを型で保証

---

### TestWordGenerator::generate() — セクション指定に対応

```php
public const VALID_SECTIONS = ['exam', 'answer_sheet', 'answer_key'];

public function generate(Test $test, Collection $questions, array $layout, string $section = 'all'): PhpWord
{
    // ... 初期化 ...

    if ($section === 'exam' || $section === 'all') {
        $this->addExamSection($phpWord, $test, $questions);
    }
    if ($section === 'answer_sheet' || $section === 'all') {
        $this->addAnswerSheetSection($phpWord, $test, $questions);
    }
    if ($section === 'answer_key' || $section === 'all') {
        $this->addAnswerKeySection($phpWord, $test, $questions);
    }

    return $phpWord;
}
```

**ポイント解説:**
- デフォルト `'all'` にすることで、DOCX ダウンロード用の `word()` メソッドは引数なしのまま呼べる（後方互換）
- `VALID_SECTIONS` 定数でコントローラと一元管理

---

## なぜそう書くか（設計の理由）

- **iframe でプレビュー**: LibreOffice による PNG 変換は Docker 環境で動かなかった。PHPWord HTML Writer は外部依存なしで動作し、日本語テキストもブラウザが正しくレンダリングする
- **`section` クエリパラメータ**: タブを切り替えるたびに新しい HTTP リクエストが飛ぶ設計。「1リクエスト = 1セクション」でシンプルに保てる
- **ARIA の重要性**: 見た目が正しくても、ARIA がないとスクリーンリーダーや検査ツールに「タブ」として認識されない。アクセシビリティは後付けより最初から

---

## 次回への課題・疑問点

- [ ] `columns: 2` のとき phpoffice でカラムレイアウトを実現できるか確認
- [ ] `useTransition` の `isPending` は iframe の読み込み完了まで `true` になる？（React の管理外では？）
- [ ] `wordImage` がタブ切り替えのたびに OpenAI API を呼んでいる問題 → キャッシュ戦略を検討
