# Tests/Create ページの実装（Inertia Form・バリデーション設計）

**日付**: 2026-04-27
**会話の概要**: `Tests/Create.tsx` を新規作成し、Inertia の `Form` コンポーネントを使ったフォームを実装した。あわせて `output_language` のバリデーションをホワイトリスト形式に変更した。

---

## 今日学んだ概念

### Inertia の `Form` コンポーネント（レンダープロップ）
- **何か**: `@inertiajs/react` が提供するフォームコンポーネント。送信状態やバリデーションエラーを管理してくれる
- **なぜ必要か**: `fetch` や `axios` を自分で書かなくても、Laravel のバリデーションエラーをそのままフロントで受け取れる
- **例え**: HTML の `<form>` に「送信中かどうか」「エラーがあるか」を自動で教えてくれるラッパーをかぶせたイメージ

### wayfinder の `store.form()`
- **何か**: wayfinder が自動生成したルートヘルパー。`{ action: '/tests', method: 'post' }` を返す
- **なぜ必要か**: フォームの送信先URLをハードコードしなくて済む。ルートが変わったときに自動追従できる
- **例え**: 郵便の宛先を「住所録」から引いてくる仕組み。住所が変わっても住所録を更新するだけでいい

### バリデーションのホワイトリスト（`in:` ルール）
- **何か**: 受け付ける値を明示的に列挙するバリデーションルール
- **なぜ必要か**: 自由入力（`string`）だと想定外の値が入る。選択肢が決まっているフィールドは `in:` で制限するのが安全
- **例え**: 入口に「メンバーカードを持っている人だけ入れます」というリストを置く感覚

---

## 書いたコード

### Inertia Form の基本構造

```tsx
<Form {...store.form()} className='space-y-4'>
    {({ processing, errors }) => (
        <>
            {/* フィールド群 */}
            <Button type='submit' disabled={processing}>作成</Button>
        </>
    )}
</Form>
```

**ポイント解説:**
- `{...store.form()}`: `{ action: '/tests', method: 'post' }` を展開して Form に渡す
- `{({ processing, errors }) => (...)}`: 子要素を「関数」として書く（レンダープロップパターン）
- `processing`: 送信中は `true` になる。ボタンを `disabled` にしてダブル送信を防ぐ
- `errors`: Laravel のバリデーションエラーが入る。`errors.title` のようにフィールド名でアクセス

### バリデーションエラーの表示

```tsx
{errors.title && (
    <p className='mt-1 text-sm text-destructive'>{errors.title}</p>
)}
```

**ポイント解説:**
- `errors.title` が `undefined`（エラーなし）のときは何も表示しない
- `text-destructive` は shadcn の赤系カラートークン。直接 `text-red-500` と書かない理由はテーマ変更に追従できるから

### hidden フィールドで固定値を送る

```tsx
<input type='hidden' name='status' value='draft' />
```

**ポイント解説:**
- `status` は `StoreTestRequest` で `required` だが、ユーザーが選ぶ必要はない
- 新規作成時は常に `draft` なので、hidden フィールドで固定して送る設計にした

### output_language のホワイトリスト（バックエンド）

```php
// StoreTestRequest / UpdateTestRequest
'output_language' => ['required', 'in:ja,en'],
```

**ポイント解説:**
- `string, max:25` から `in:ja,en` に変更
- フロント側の `<select>` で選択肢を `ja`/`en` に絞り、バックエンドでも同じ値しか受け付けないようにする「多層防御」の考え方

### output_language の select フィールド（フロント）

```tsx
<select
    id='output_language'
    name='output_language'
    defaultValue='ja'
    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
>
    <option value='ja'>日本語</option>
    <option value='en'>English</option>
</select>
```

**ポイント解説:**
- `defaultValue='ja'` で初期値を日本語に設定（`value=` は制御コンポーネント用なので、非制御では `defaultValue` を使う）
- クラス名は shadcn の `Input` と同じスタイルを手動で当てて見た目を統一している

---

## なぜそう書くか（設計の理由）

- **`status` を hidden で固定**: ユーザーが「生成中」や「完了」を自分でセットする必要はない。システムが管理する値をUIに露出させると混乱のもと
- **`in:ja,en` を values として使い、表示名はフロントで持つ**: DBには `ja`/`en` という識別子を保存し、「日本語」「English」という表示はUIの責務とする設計。将来言語を追加するときも選択肢を増やすだけで済む
- **`defaultValue='ja'`**: 日本語話者が主なユーザー想定なので、最も使われる値をデフォルトにする。これにより必須フィールドを空欄で送信するミスを減らせる

---

## 次回への課題・疑問点

- [ ] `Tests/Show.tsx` の実装（テスト詳細・紐づく質問一覧の表示）
- [ ] `Tests/Edit.tsx` の実装（Create と似た構造だが、既存データの初期値をどう扱うか）
- [ ] Inertia の `Form` で `<select>` の初期値を「サーバーから受け取った値」にするにはどうするか？（Edit ページで必要になる）
