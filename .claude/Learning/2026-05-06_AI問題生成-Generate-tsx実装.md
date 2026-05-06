# AI問題生成ページ（Generate.tsx）実装

**日付**: 2026-05-06
**会話の概要**: Laravel + React (Inertia.js) アプリに AI 問題生成ページを追加した。バックエンドは完成済みで、フロントエンドの `Generate.tsx` を段階的に実装した。

---

## 今日学んだ概念

### `useState<T>` — ジェネリクスで型を明示する

- **何か**: React の state に「取れる値の型」を TypeScript で指定する書き方
- **なぜ必要か**: 初期値だけでは型が推論できない場合や、取れる値を限定したい場合に使う
- **例え**: 「この引き出しには "form" か "preview" しか入れられない」と鍵をかけるイメージ

```tsx
// 型指定なし → string と推論される → typo も通ってしまう
const [phase, setPhase] = useState('form');

// 型指定あり → 'form' | 'preview' 以外はコンパイルエラー
const [phase, setPhase] = useState<'form' | 'preview'>('form');

// 初期値から自明な場合は不要
const [count, setCount] = useState(3); // number と推論される

// 初期値が [] だけでは何の配列か不明 → 明示が必要
const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
```

---

### `useForm` vs `useState` — Inertia のフォームと素の state の使い分け

- **何か**: Inertia の `useForm` は Inertia リクエスト専用。`fetch` を使うなら `useState` で状態を自己管理する
- **なぜ必要か**: `generate` エンドポイントは `JsonResponse` を返すため、Inertia の `router.post` が使えない
- **例え**: 宅配便（Inertia）と手渡し（fetch）は荷物の渡し方が違う。手渡しなら自分で袋を用意する必要がある

```tsx
// Inertia useForm → Inertia リクエスト専用
const { post, processing, errors } = useForm({ ... });
post(url); // Inertia がページ遷移まで処理

// fetch を使う場合 → 状態を自分で管理
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

---

### `router.post` vs `fetch` — 使い分け

- **`router.post`**: バックエンドが `RedirectResponse` を返す場合。Inertia がページ遷移を処理してくれる
- **`fetch`**: バックエンドが `JsonResponse` を返す場合。レスポンスを自分で受け取り処理する

```
generate  → JsonResponse  → fetch を使う
batchStore → RedirectResponse → router.post を使う
```

---

### `FormData` — ファイルを含むデータの送信

- **何か**: ブラウザ組み込みのクラス。フォームデータを `multipart/form-data` 形式でまとめられる
- **なぜ必要か**: JSON はバイナリ（画像ファイル）を送れない。`FormData` なら画像もテキストも同じ形式で送れる
- **例え**: 段ボール箱に色々なものを詰めて宅配する感覚

```tsx
const formData = new FormData();
formData.append('input_type', inputType);
formData.append('topic', topic);
formData.append('count', String(count)); // 数値は文字列に変換が必要

// ファイルの場合
images.forEach((img) => formData.append('images[]', img));

// fetch に渡すと Content-Type: multipart/form-data が自動でセットされる
await fetch(url, { method: 'POST', body: formData });
```

---

### CSRF トークン — `fetch` で手動付与する理由

- **何か**: 悪意あるサイトからの偽リクエストを弾くための仕組み
- **なぜ必要か**: Inertia の `router.post` は自動で処理してくれるが、`fetch` は素の API なので自分で付ける必要がある
- **仕組み**: Laravel が `XSRF-TOKEN` Cookie を自動セット → JS で読み取って `X-XSRF-TOKEN` ヘッダに載せる → Laravel が照合

```tsx
function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
    // decodeURIComponent: Cookie が URL エンコードされているため必要
}

await fetch(url, {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': getCsrfToken() },
    body: formData,
});
```

---

### `fetch` のエラーハンドリング

- **注意点**: `fetch` は HTTP 500 などのエラーステータスでも例外を投げない。`res.ok` で自分でチェックが必要

```tsx
const res = await fetch(url, { ... });
const json = await res.json();

// res.ok が false = HTTP 4xx/5xx
if (!res.ok) throw new Error(json.error ?? 'エラーが発生しました');
```

---

## 書いたコード

### Generate.tsx の全体構造

```tsx
export default function Generate({ test }: Props) {
    // フェーズ管理（フォーム or プレビュー）
    const [phase, setPhase] = useState<'form' | 'preview'>('form');
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // フォーム入力値
    const [inputType, setInputType] = useState<'text' | 'image'>('text');
    const [topic, setTopic] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [count, setCount] = useState(3);
    const [difficulty, setDifficulty] = useState('medium');
    const [questionType, setQuestionType] = useState('choice');

    // AI 呼び出し（fetch）
    const handleGenerate = async (e: React.FormEvent) => { ... };

    // DB 保存（Inertia router.post）
    const handleBatchStore = () => {
        router.post(batchStore(test).url, { questions } as any);
    };

    return phase === 'form' ? <フォームUI /> : <プレビューUI />;
}
```

**ポイント解説:**
- `phase` で UI を切り替える。`useState` の初期値は `'form'`
- `handleGenerate` が成功したら `setPhase('preview')` と `setQuestions(...)` を呼ぶ
- `handleBatchStore` は `questions` をそのまま `batchStore` に渡す

---

### handleGenerate — AI 呼び出し

```tsx
const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('input_type', inputType);
    if (inputType === 'text') {
        formData.append('topic', topic);
    } else {
        images.forEach((img) => formData.append('images[]', img));
    }
    formData.append('count', String(count));
    formData.append('difficulty', difficulty);
    formData.append('question_type', questionType);

    try {
        const res = await fetch(generate(test).url, {
            method: 'POST',
            headers: { 'X-XSRF-TOKEN': getCsrfToken() },
            body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'エラーが発生しました');
        setQuestions(json.questions);
        setPhase('preview');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
        setLoading(false); // 成功・失敗どちらでも必ず実行
    }
};
```

**ポイント解説:**
- `finally`: try/catch の結果に関わらず必ず実行される。`setLoading(false)` はここに書く
- `err instanceof Error`: catch した値が必ず Error 型とは限らないため型チェックが必要

---

### バックエンドとの接続

```
GET  /tests/{test}/questions/generate → showGenerate() → Inertia::render('Questions/Generate')
POST /tests/{test}/questions/generate → generate()     → JsonResponse（AI結果）
POST /tests/{test}/questions/batch    → batchStore()   → RedirectResponse
```

- GET ルートを追加して `showGenerate` メソッドを新設した
- wayfinder で `showGenerate` が `actions/` に生成される → `import { showGenerate } from '@/actions/App/Http/Controllers/QuestionController'`

---

### Inertia の型制約を回避する

```tsx
// GeneratedQuestion[] は Inertia の FormDataConvertible 型を満たさない
// → as any でキャスト（実行時は正しく動く）
router.post(batchStore(test).url, { questions } as any);
```

---

## なぜそう書くか（設計の理由）

- **2フェーズ構成（フォーム → プレビュー）**: AI 生成には時間とコストがかかる。ユーザーが結果を確認してから保存できるようにするため
- **`generate` は `JsonResponse`**: DB に保存せずフロントでプレビューさせる設計。`batchStore` で一括保存を分離している
- **wayfinder の `actions/` と `routes/` の違い**: `routes/` は GET ルート、`actions/` は POST/PUT/DELETE などミューテーション系。`showGenerate`（GET）は `actions/` に入った

---

## 次回への課題・疑問点

- [ ] 画像モードの動作確認（テキストモードのみ確認済み）
- [ ] `JSON.parse(JSON.stringify(...))` を使わずに Inertia の型制約を正しく回避する方法
- [ ] 選択肢プレビューのアクセシビリティ改善（正解をスクリーンリーダーに伝える）

---

---

# セルフレビューと修正（/self-review）

**追記日**: 2026-05-06
**概要**: 実装完了後に4種類のレビューエージェントを並列起動してコードレビューを行い、指摘を精査して修正した。

---

## 今日学んだ概念

### セルフレビューの流れ

- **何か**: 実装が終わったコードを複数の観点でレビューして品質を上げる作業
- **なぜ必要か**: 自分では気づきにくいバグ・アクセシビリティ問題・設計の一貫性崩れを発見できる
- **この会話での流れ**: `git diff` を取得 → 4エージェント並列起動 → 結果をまとめて妥当性評価 → 修正

### 早期リターン（ガード節）

- **何か**: 関数の先頭でエラー条件を先に弾いて `return` する書き方
- **なぜ必要か**: 無駄な処理（API 呼び出しなど）を防げる。バリデーションの意図も明確になる

```tsx
// 悪い例: バリデーションなしに API 呼び出しが走る
const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true); // topic が空でも実行される

    // ... API 呼び出し
};

// 良い例: 先に条件チェック → 問題なければ進む
const handleGenerate = async (e) => {
    e.preventDefault();

    if (inputType === 'text' && !topic.trim()) {
        setError('テーマを入力してください');
        return; // ここで終了。API 呼び出しなし
    }
    if (inputType === 'image' && images.length === 0) {
        setError('画像を1枚以上選択してください');
        return;
    }

    setLoading(true); // バリデーション通過後だけ実行
    // ...
};
```

### アクセシビリティ属性

- **何か**: スクリーンリーダー（目が見えない人が使う読み上げソフト）などの支援技術に情報を伝えるための HTML 属性
- **なぜ必要か**: 見た目だけ整えても、支援技術ユーザーには伝わらない

#### `aria-live='polite'`

```tsx
// 動的に表示されるエラーをスクリーンリーダーに通知する
<p aria-live='polite' className='text-sm text-destructive'>{error}</p>
```

- `aria-live='polite'`: この要素の内容が変わったとき、スクリーンリーダーが読み上げる
- `polite` = 現在読み上げ中の内容が終わってから読む（`assertive` は即座に割り込む）

#### `htmlFor` と `id` の紐付け

```tsx
// ラベルとフォームコントロールを紐付ける
<Label htmlFor='input_type'>入力方法</Label>
<select id='input_type' ...>
```

- `htmlFor` と `id` が一致することで、ラベルをクリックすると対応する input にフォーカスが移る
- スクリーンリーダーも「このコントロールは何か」を正しく読み上げられる

#### `inputMode='numeric'`

```tsx
<input type='number' inputMode='numeric' ... />
```

- モバイルで表示されるキーボードの種類を指定する
- `numeric` = 数字キーボードを出す

### `...` と `…` の違い（タイポグラフィ）

- `...` → ASCII の ピリオド3つ。フォントによって間隔がバラバラに見える
- `…` → Unicode の三点リーダー（U+2026）。フォントが適切に処理する正式な文字

```tsx
// 悪い
{loading ? '生成中...' : '生成する'}

// 良い
{loading ? '生成中…' : '生成する'}
```

---

## 修正したコード

### パンくずリストの修正

```tsx
// 修正前: テスト一覧と書きながらリンク先がテスト詳細
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'テスト一覧', href: testShow(test).url }, // ← 間違い
    { title: test.title, href: testShow(test).url },
    { title: 'AI問題生成', href: '' },
];

// 修正後: タイトルとリンク先が一致、問題一覧も追加
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'テスト一覧', href: testsIndex().url },       // テスト一覧ページへ
    { title: test.title, href: testShow(test).url },        // テスト詳細へ
    { title: '問題一覧', href: questionsIndex(test).url },  // 問題一覧へ
    { title: 'AI問題生成', href: '' },
];
```

### エラーメッセージの改善

```tsx
// 修正前: Laravel の 422 バリデーションエラーは json.error がなく空になる
if (!res.ok) throw new Error(json.error ?? 'エラーが発生しました');

// 修正後: json.message も参照（Laravel バリデーションエラーの形式に対応）
if (!res.ok) throw new Error(json.error ?? json.message ?? 'エラーが発生しました');
```

**なぜ**: Laravel のバリデーション失敗レスポンスは `{ message: "...", errors: {...} }` 形式。`json.error` は存在しないので `json.message` も確認が必要。

---

## レビューで対応しなかった指摘と理由

- **axios への統一**: `package.json` に axios がないためインストールが必要。`fetch` + CSRF Cookie 読み取りは正常に動作しており対応不要と判断
- **`key={i}` のインデックスキー**: プレビュー専用で並び替え・削除がないため実害なし
- **`autocomplete` / `name` 属性**: FormData を JS で手動構築するため不要

レビュー指摘を全部対応するのが正解ではない。**プロジェクトの状況・実害の有無・トレードオフ**を考えて取捨選択することが重要。

---

---

# 問題の並び替え（drag & drop）実装

**日付**: 2026-05-06
**会話の概要**: `@dnd-kit` を使って問題一覧ページにドラッグ&ドロップ並び替えを実装し、バックエンドに `reorder` エンドポイントを追加した。セルフレビューで認可漏れ・二重送信・アクセシビリティの問題を発見して修正した。

---

## 今日学んだ概念

### `@dnd-kit` — React の drag & drop ライブラリ

- **何か**: React 向けの drag & drop 実装ライブラリ。`react-beautiful-dnd` の後継として広く使われている
- **なぜ必要か**: ブラウザのネイティブ drag & drop API は細かい制御が難しく、アクセシビリティ対応も自前で書く必要がある。`@dnd-kit` はそれをまとめて提供してくれる
- **例え**: ドラッグのルール（どこまで動けるか、どこにドロップできるか）をゲームのルールブックとして定義する感覚

```
@dnd-kit/core      — ドラッグの基盤（センサー・コンテキスト）
@dnd-kit/sortable  — リストの並び替えに特化したユーティリティ
@dnd-kit/utilities — CSS 変換などのヘルパー
```

---

### `DndContext` と `SortableContext` — 2 層のラッパー

- **何か**: `DndContext` が「この範囲でドラッグが起きる」を宣言し、`SortableContext` が「この配列を並び替え対象にする」を宣言する
- **なぜ必要か**: ドラッグの範囲と並び替え対象を分けることで、複数リストのドラッグ移動なども対応できる柔軟な設計になっている

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <ul>
            {items.map((q, i) => <SortableItem key={q.id} question={q} index={i} />)}
        </ul>
    </SortableContext>
</DndContext>
```

- `collisionDetection={closestCenter}` — ドロップ先の判定方法。「一番近い要素の中心」でドロップ先を決める
- `strategy={verticalListSortingStrategy}` — 縦方向のリストに最適化された並び替え計算

---

### `useSortable` — アイテムに drag 機能を付けるフック

- **何か**: 各リストアイテムに対して呼び出すフック。ドラッグに必要な ref・スタイル・イベントハンドラをまとめて返してくれる
- **なぜ必要か**: DOM 要素のどこをつかんで動かすか、どのくらいずれたか、などの計算を自動でやってくれる

```tsx
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });

const style = {
    transform: CSS.Transform.toString(transform), // ドラッグ中の移動量をCSS文字列に変換
    transition,                                    // ドロップ後のアニメーション
};

return (
    <li ref={setNodeRef} style={style}>
        {/* ハンドル部分だけに listeners を付ける（リンクのクリックと干渉しないため） */}
        <span {...attributes} {...listeners} aria-label='ドラッグして並び替え'>
            <span aria-hidden='true'>⠿</span>
        </span>
    </li>
);
```

- `setNodeRef` — dnd-kit が DOM 要素を追跡するための ref
- `attributes` — `role="button"`, `tabIndex` など、アクセシビリティ属性
- `listeners` — ポインタ・キーボードイベントのハンドラ
- `transform` — ドラッグ中の要素の移動量（x, y の数値）

---

### `arrayMove` — 配列の並び替えユーティリティ

- **何か**: 配列の要素を「古いインデックスから新しいインデックス」へ移動した新しい配列を返す関数
- **なぜ必要か**: `splice` や手動での配列操作は副作用があるが、`arrayMove` はイミュータブルに新しい配列を返す

```tsx
const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return; // 同じ位置なら何もしない

    setItems((prev) => {
        const oldIndex = prev.findIndex((q) => q.id === active.id);
        const newIndex = prev.findIndex((q) => q.id === over.id);
        return arrayMove(prev, oldIndex, newIndex); // 新しい配列を返す
    });
    setIsDirty(true);
};
```

---

### `isDirty` フラグ — 未保存の変更を追跡するパターン

- **何か**: 「まだ保存されていない変更がある」かどうかを管理する boolean の state
- **なぜ必要か**: ドラッグするたびに自動保存するとリクエストが大量に飛ぶ。ユーザーが意図的に「保存する」を押したときだけ保存する設計にするため

```tsx
const [isDirty, setIsDirty] = useState(false);

// ドラッグ完了 → isDirty を true に
const handleDragEnd = (...) => {
    ...
    setIsDirty(true);
};

// 保存ボタンは isDirty のときだけ表示
{isDirty && <Button onClick={handleReorder}>順番を保存</Button>}
```

---

### `router.patch` のコールバック — Inertia の非同期制御

- **何か**: Inertia の `router.patch` は第3引数にコールバックオブジェクトを渡せる
- **なぜ必要か**: `setIsDirty(false)` をリクエスト送信直後に呼ぶと、通信失敗してもボタンが消える。`onSuccess` 内で呼ぶことで「保存が成功したとき」だけ状態をリセットできる

```tsx
const [isSaving, setIsSaving] = useState(false);

const handleReorder = () => {
    setIsSaving(true);
    router.patch(
        reorder(test).url,
        { ids: items.map((q) => q.id) },
        {
            onSuccess: () => setIsDirty(false),  // 成功時のみ dirty をリセット
            onFinish:  () => setIsSaving(false), // 成功・失敗どちらでも saving を解除
        },
    );
};
```

- `onSuccess` — HTTP 200 系レスポンス時に実行
- `onFinish` — 成功・失敗問わず必ず実行（`try/finally` に相当）

---

### `KeyboardSensor` — キーボードでのドラッグ対応

- **何か**: dnd-kit でキーボード操作によるドラッグを有効にするセンサー
- **なぜ必要か**: マウスが使えないユーザーや、キーボード派のユーザーが並び替えできないとアクセシビリティ違反になる
- `sortableKeyboardCoordinates` — キーボード操作時の移動量を計算するヘルパー。矢印キーで上下に移動できるようになる

```tsx
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

---

## 書いたコード

### バックエンド — `reorder` メソッド（認可漏れ対策含む）

```php
public function reorder(Request $request, Test $test): RedirectResponse
{
    abort_if($request->user()->cannot('view', $test), 404);

    $validated = $request->validate([
        'ids'   => ['required', 'array'],
        'ids.*' => ['integer', 'exists:questions,id'],
    ]);
    $ids = $validated['ids'];

    // 渡された IDs が全てこのテストの問題か検証
    $validIds = $test->questions()->pluck('id')->all();
    abort_if(count(array_diff($ids, $validIds)) > 0, 422);

    foreach ($ids as $order => $id) {
        $test->questions()->where('id', $id)->update(['sort_order' => $order + 1]);
    }

    return redirect()->back();
}
```

**ポイント解説:**
- `exists:questions,id` — DB に存在しない ID を早期に弾くバリデーション
- `array_diff($ids, $validIds)` — 「渡されたIDのうち、このテストに属さないものの数」。これが 0 より大きければ不正なリクエスト
- なぜこの検証が必要か: `$test->questions()->where('id', $id)` のクエリは `test_id` で絞っているため、他テストの ID を送ってもエラーなく素通りしてしまう（単にヒットしないだけ）。明示的に検証して 422 を返す必要がある

---

### `PATCH` — 部分更新に使う HTTP メソッド

- **何か**: 「リソースの一部だけを更新する」HTTP メソッド
- **`PUT` との違い**: `PUT` はリソース全体を置き換える。`PATCH` は一部のフィールドだけ更新する。今回は `sort_order` だけ変えるので `PATCH` が適切

---

## なぜそう書くか（設計の理由）

- **`isDirty` + 保存ボタン方式**: ドラッグのたびに `router.patch` するのではなく、明示的な保存操作を設けることで不必要なリクエストを減らし、ユーザーが誤操作しても保存前にやり直せる
- **認可を2段階にする**: (1) テストの所有者か（`abort_if cannot('view')`）、(2) IDs がこのテストに属するか（`array_diff` チェック）。1段階目だけでは不十分で、他テストのIDを混入されるリスクがある
- **`onSuccess` で `setIsDirty(false)`**: リクエスト送信直後にリセットすると通信失敗時に状態が狂う。「保存が成功した」ことを確認してからリセットするのが正しい

---

## 次回への課題・疑問点

- [ ] `reorder` の N+1 クエリ解消（`upsert` や `CASE WHEN` を使った一括 UPDATE）
- [ ] `reorder` のフィーチャーテスト追加（正常系・認可・バリデーション）
- [ ] `prefers-reduced-motion` への対応（モーション軽減設定ユーザー向け）
