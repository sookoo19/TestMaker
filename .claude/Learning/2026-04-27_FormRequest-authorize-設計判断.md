# FormRequest::authorize() と Policy の使い分け

**日付**: 2026-04-27
**会話の概要**: `StoreQuestionChoiceRequest::authorize()` を Policy と連携させるか検討し、`return true` のまま維持する設計判断を学んだ。

---

## 今日学んだ概念

### FormRequest::authorize() の役割
- **何か**: リクエストを処理する前に「このユーザーはこの操作をしてよいか」を判定するメソッド
- **なぜ必要か**: コントローラーに処理が届く前に弾ける
- **落とし穴**: `authorize()` が `false` を返すと **403 Forbidden** が返る（変更不可）

### abort_if との違い

| 方法 | 記述場所 | 失敗時のレスポンス |
|------|----------|-------------------|
| `authorize()` で Policy を呼ぶ | FormRequest | **403** 固定 |
| `abort_if(...cannot(...), 404)` | Controller | **404** を指定できる |

---

## 設計の理由

### なぜ `return true` のまま維持するか

このプロジェクトは「他人のリソースの存在を漏らさない」方針。

- 403 → 「リソースは存在するがアクセス権がない」と伝わってしまう
- 404 → 「そんなリソースは知らない」とリソースの存在自体を隠せる

コントローラーの `abort_if` は 404 を返せるが、`authorize()` は 403 固定で変えられない。
→ 認可チェックはコントローラーに集約し、`authorize()` は `return true` に統一する。

### `authorize()` に Policy を書くとどうなるか（NG例）

```php
// StoreQuestionChoiceRequest.php
public function authorize(): bool
{
    $question = $this->route('question');
    return $this->user()->can('view', $question); // 失敗すると 403 が返る
}
```

→ 他人のリソースにアクセスすると 403 が返り、「リソースが存在すること」がバレる。

### このプロジェクトの正しいパターン

```php
// FormRequest — 認可チェックしない
public function authorize(): bool
{
    return true;
}

// Controller — ここで認可 + 404
public function store(StoreQuestionChoiceRequest $request, Question $question)
{
    abort_if(
        $request->user()->cannot('view', $question),
        404
    );
    // ...
}
```

`Question` 系 FormRequest（`StoreQuestionRequest` / `UpdateQuestionRequest`）も同じ `return true`。プロジェクト全体で統一された設計。

---

## なぜそう書くか（設計の理由）

- **認可を Controller に集約する理由**: `abort_if` でステータスコードを自由に指定できる。FormRequest の `authorize()` は 403 固定なので、404 を返したいこのプロジェクトでは使えない
- **`return true` が「手抜き」ではない理由**: Controller 側で `abort_if` が確実に認可チェックをしている。`authorize()` を `return true` にするのは責務を Controller に寄せた意図的な選択

---

## 次回への課題・疑問点

- [ ] フロントエンドページ作成（Tests/Index から）

---

## 追記: wayfinder と Inertia.js の関係

### wayfinder とは
`routes/web.php` に定義された Laravel ルートを読み取り、TypeScript 関数として自動生成するツール。

```bash
./vendor/bin/sail artisan wayfinder:generate
```

実行すると `resources/js/routes/` 配下にルートファイルが生成される:
- `routes/tests/index.ts` → tests.* ルート
- `routes/questions/index.ts` → questions.* ルート
- `routes/question_choices/index.ts` → question_choices.* ルート

### 役割分担

- **wayfinder** → URL を型安全に生成する（`string` を返すだけ）
- **Inertia.js** → その URL を使ってページ遷移・リクエストを送る

```tsx
import { Link } from '@inertiajs/react';
import { create, show } from '@/routes/tests';

<Link href={create().url}>テスト作成</Link>
<Link href={show(test).url}>詳細</Link>
```

### wayfinder を使わない場合との比較

```tsx
// wayfinder なし — URL をハードコード
<Link href="/tests/create">テスト作成</Link>
<Link href={`/tests/${test.id}`}>詳細</Link>

// wayfinder あり — Laravel のルート定義と同期
<Link href={create().url}>テスト作成</Link>
<Link href={show(test).url}>詳細</Link>
```

wayfinder なしの問題:
- Laravel 側でルートを変更しても TypeScript 側が気づかない
- URL のスペルミスをコンパイル時に検出できない
- 引数の渡し忘れ（`test.id` など）を型で守れない

---

## 追記: Tests/Index ページ作成開始

**会話の概要**: `resources/js/pages/Tests/Index.tsx` の雛形を作成。型定義・import・エラー修正を行った。

### Test 型の追加（types/index.d.ts）

```ts
export interface Test {
    id: number;
    title: string;
    description: string | null;
    subject: string | null;
    difficulty: string | null;
    status: string;
    output_language: string | null;
    created_at: string;
    updated_at: string;
}
```

**ポイント:**
- `TestResource::toArray()` が返すフィールドと一致させる
- `null` 許容は DB カラムが nullable なフィールドのため

### Tests/Index.tsx の雛形

```tsx
import AppLayout from '@/layouts/app-layout';
import { index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'テスト一覧',
        href: testsIndex().url,
    },
];

interface Props {
    tests: Test[];
}

export default function Index({ tests }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="テスト一覧" />
            <div className="p-6">{/* ここに中身を追加していく */}</div>
        </AppLayout>
    );
}
```

### 発生したエラーと原因

**エラー1: `href: testsIndex` → 型エラー**
- 原因: wayfinder の関数はオブジェクトを返す。URL 文字列を取り出すには `.url` が必要
- 修正: `href: testsIndex().url`

**エラー2: `名前 'Test' が見つかりません`**
- 原因: `Test` 型を import していなかった
- 修正: `import { type BreadcrumbItem, type Test } from '@/types'`

**エラー3: `'tests' is defined but never used`**
- 原因: まだカード実装前で `tests` を使っていない
- 対応: カード実装時に自然に解消する

### Prettier が未使用 import を自動削除する理由

`prettier-plugin-organize-imports` が有効になっているため、保存時に未使用 import が自動削除される。
→ import はそのステップで実際に使うコードと一緒に書く。

### Prettier が動かなかった原因と修正

`.vscode/settings.json` の `prettier.configPath` が存在しないファイルを指していた。

```json
// 修正前（ファイルが存在しない）
"prettier.configPath": "./my-app/prettier.config.js",

// 修正後（実際に存在するファイル）
"prettier.configPath": "./my-app/.prettierrc",
```

---

## 次回への課題・疑問点

- [x] Tests/Index にヘッダー行（タイトル + 作成ボタン）を追加
- [x] テストカード一覧を実装
- [x] 空状態メッセージを追加
- [ ] Tests/Create（テスト作成フォーム）
- [ ] Tests/Show（テスト詳細）

---

## 追記: Laravel API Resource と Inertia のデータフロー

### API Resource（app/Http/Resources/TestResource.php）の役割

「モデルを JSON に変換するフィルター」。

```php
public function toArray(): array
{
    return [
        'id' => $this->id,
        'title' => $this->title,
        // user_id など不要なフィールドは含めない
    ];
}
```

- モデルの全フィールドをそのまま返さず、フロントに必要なフィールドだけ選んで返す
- 不要フィールドの隠蔽・フォーマット変換・関連モデルの整形が主な用途

### `data` ラップの正しい理解

`TestResource::collection($tests)` が `{ data: [...] }` にラップする理由は **Inertia とは無関係**。Laravel API Resource 自体の仕様。

目的: ページネーションのメタ情報を一緒に返せる構造にするため。

```json
{
  "data": [...],
  "meta": { "total": 100, "per_page": 15 }
}
```

`data` キーがなければメタ情報を追加する場所がない。

### Inertia のデータフロー

Inertia は文字列だけでなく、配列・オブジェクト・数値・真偽値すべて渡せる。

```php
// コントローラー（PHP）
Inertia::render('Tests/Index', [
    'tests' => TestResource::collection($tests),  // PHP オブジェクト
]);
```

内部フロー:
```
PHP オブジェクト → JSON シリアライズ（Inertia が自動） → JS オブジェクトとして props に渡る
```

フロント側では普通の JS オブジェクト・配列として扱える。

### ファイルの場所まとめ

| ファイル | 役割 |
|----------|------|
| `app/Http/Resources/TestResource.php` | モデル → JSON 変換フィルター |
| `app/Http/Controllers/TestController.php` | Resource を使って Inertia に渡す |
| `resources/js/pages/Tests/Index.tsx` | `tests.data` として受け取る |

---

## 追記: Tests/Index 完成

### 完成したコード

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { create, show, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'テスト一覧', href: testsIndex().url },
];

interface Props {
    tests: { data: Test[] };
}

export default function Index({ tests }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="テスト一覧" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">テスト一覧</h1>
                    <Link
                        href={create().url}
                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                        テスト作成
                    </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tests.data.map((test) => (
                        <Link key={test.id} href={show(test).url}>
                            <Card className="transition-colors hover:bg-muted/50">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">{test.title}</CardTitle>
                                        <Badge variant="outline">{test.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>{test.subject}・難易度: {test.difficulty}</p>
                                    <p className="mt-1">{test.created_at.slice(0, 10)}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
                {tests.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        テストがまだありません。「テスト作成」から作成してください。
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
```

### ハマったポイントと原因

**`tests.map is not a function`**
- 原因: `TestResource::collection()` は `{ data: [...] }` でラップして返す
- 修正: Props を `tests: { data: Test[] }` にして `tests.data.map()` を使う

**空状態メッセージが表示されない**
- 原因: 空状態チェックを `map` の内側（`Link` の中）に書いていた。`tests.data` が空のとき `map` は何も実行しないので表示されない
- 修正: `map` と `grid` の外側、`p-6` の `div` の直下に移動

**`Badge` が Lucide アイコンとして解釈される**
- 原因: Prettier の organize-imports が `Badge` を `lucide-react` から import していた（lucide-react にも `Badge` アイコンが存在する）
- 修正: `import { Badge } from '@/components/ui/badge'` と明示的に指定

**グリッドが `p-6` の外に出ていた**
- 原因: `</div>` の位置がずれてカードグリッドがヘッダー div の外に出ていた
- 修正: すべてを `p-6` の div で包む構造に統一

### 設計ポイント

- `index as testsIndex` とリネーム → `index` は JS の予約語ではないが、関数名として曖昧になるのを避けるため
- `test.created_at.slice(0, 10)` → `"2024-04-27 12:00:00"` から日付だけ取り出す
- `show(test).url` → wayfinder に `{ id: number }` を持つオブジェクトを渡せば自動的に `/tests/1` を生成
- 空状態は `tests.data.length === 0` で判定。`map` の外側に置くのが正しい位置
