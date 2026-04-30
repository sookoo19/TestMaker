# Questions/Show・Edit 実装とセルフレビュー

**日付**: 2026-04-30
**会話の概要**: Questions/Show・Edit ページを実装し、Tests/Show のリンク修正、セルフレビュー（5レビュアー並列実行）を行い、指摘された問題を修正した。

---

## 今日学んだ概念

### 交差型（Intersection Type）

- **何か**: 複数の型を `&` で結合して「両方のフィールドを持つ型」を作る TypeScript の機能
- **なぜ必要か**: `QuestionResource` はレスポンスに `test` フィールドを含むが、共通の `Question` 型にはない。そのページだけ拡張したい
- **例え**: 「社員証 & 来客バッジ」のように、両方の情報を一枚のカードで持つイメージ

```tsx
// Question 型には test フィールドがないが、このページだけ拡張する
interface Props {
    question: Question & { test: { id: number; title: string } };
}
```

**ポイント解説:**
- `Question & { test: ... }` : `Question` の全フィールド + `test` フィールドを持つ型
- Tests/Show でも同じパターン: `Test & { questions: Question[] }`
- 共通型 (`types/index.d.ts`) を汚さずに済む

---

### dl / dt / dd（定義リスト）

- **何か**: HTML の「ラベル: 値」ペアを表すタグ群
  - `<dl>` : リスト全体のコンテナ (definition list)
  - `<dt>` : 用語・ラベル (term)
  - `<dd>` : その定義・値 (description)
- **なぜ必要か**: `<ul>/<li>` でも実装できるが、「ラベルと値のペア」には `dl/dt/dd` が意味的に正しい HTML
- **例え**: 辞書の「見出し語 → 意味」の構造そのもの

```tsx
<dl className='space-y-2 text-sm'>
    <div className='flex gap-2'>
        <dt className='w-24 text-muted-foreground'>難易度</dt>
        <dd>{question.difficulty ?? '—'}</dd>
    </div>
</dl>
```

---

### update.form(model) の仕組み（wayfinder）

- **何か**: wayfinder が生成する PUT フォームのヘルパー。`action` と `method` を自動展開する
- **なぜ必要か**: HTML フォームは GET/POST しか送れない。PUT を送るには `_method=PUT` の hidden フィールドが必要で、wayfinder がそれを自動でやってくれる

```tsx
// Edit フォーム
<Form {...update.form(question)} className='space-y-4'>
    {({ processing, errors }) => (
        // ...フォームの中身
    )}
</Form>

// update.form(question) が展開するのは:
// action="/questions/1"  method="post"  _method="PUT"
```

---

### defaultValue で既存データを初期表示

- **何か**: Create（新規作成）と Edit（編集）のフォームの違い
- **Create**: `defaultValue` なし（空欄スタート）
- **Edit**: `defaultValue={question.question_text}` で既存データを初期値にセット

```tsx
// Edit の textarea
<textarea
    id='question_text'
    name='question_text'
    rows={3}
    defaultValue={question.question_text}  // ← ここが Create との違い
    className='mt-1 w-full ...'
/>

// null になりうるフィールドは ?? '' でフォールバック
<textarea
    defaultValue={question.explanation ?? ''}  // null → 空文字
/>
```

---

## 書いたコード

### Questions/Show.tsx（詳細ページ）

```tsx
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { destroy, edit } from '@/routes/questions';
import { show as testShow, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Question } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

interface Props {
    question: Question & { test: { id: number; title: string } };
}

export default function Show({ question }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: question.test.title, href: testShow(question.test).url },
        { title: question.question_text, href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={question.question_text} />
            <div className='max-w-2xl p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>{question.question_text}</h1>
                    <div className='flex gap-2'>
                        <Link href={edit(question).url} ...>編集</Link>
                        <Button onClick={() => {
                            if (confirm('この問題を消去しますか？')) {
                                router.delete(destroy(question).url);
                            }
                        }}>削除</Button>
                    </div>
                </div>
                <dl className='space-y-2 text-sm'>
                    {/* 各フィールドを dt/dd で表示 */}
                </dl>
            </div>
        </AppLayout>
    );
}
```

**ポイント解説:**
- `router.delete(url)` : Inertia の DELETE リクエスト送信
- `destroy(question).url` : wayfinder が `/questions/1` を生成
- `question.test.title` : QuestionResource の `test` フィールドを breadcrumbs で使用

---

### Tests/Show.tsx への「問題を管理する」リンク追加

```tsx
import { index as questionsIndex } from '@/routes/tests/questions';

// 質問一覧の見出しにリンクを追加
<div className='mb-3 flex items-center justify-between'>
    <h2 className='text-lg font-semibold'>質問一覧</h2>
    <Link
        href={questionsIndex(test).url}
        className='text-sm hover:underline'
    >
        問題を管理する
    </Link>
</div>
```

**ポイント解説:**
- `questionsIndex(test).url` : `/tests/1/questions` を生成（shallow nested route）
- Questions/Index への入口がどこにもなかった問題を解消

---

## セルフレビューで発見された問題と修正

### タイポ3件（スタイル未適用）

```
Questions/Index.tsx  : text-muted-foregruond → text-muted-foreground
Questions/Create.tsx : htmlFor='quesiton_text' → htmlFor='question_text'
Tests/Index.tsx      : items-strat → items-start
```

Tailwind のクラス名はタイポしてもエラーが出ない（存在しないクラスとして無視される）。レビューか目視確認が必須。

### breadcrumb の href 誤り

```tsx
// 修正前（1番目が誤ってテスト詳細を指していた）
{ title: 'テスト一覧', href: testShow(test).url },

// 修正後
{ title: 'テスト一覧', href: testsIndex().url },
```

タイトルと href が一致しているか、毎回確認する習慣をつける。

### Edit フォームの select に空オプションがなかった

```tsx
// difficulty が null のデータを編集すると easy が自動選択されてしまう
// → 空オプションを追加して null 状態を保持できるようにする

<select defaultValue={question.difficulty ?? ''}>
    <option value='' disabled>選択してください</option>  {/* ← 追加 */}
    <option value='easy'>Easy</option>
    <option value='medium'>Medium</option>
    <option value='hard'>Hard</option>
</select>
```

`defaultValue=''` に対応する `value=''` の option がないと、ブラウザが先頭を自動選択してしまう。

---

## なぜそう書くか（設計の理由）

- **交差型 vs 共通型に追加**: `Question` 型に `test` を追加すると、`test` が存在しない Index ページでも型に含まれてしまう。交差型でページ単位で拡張する方が安全
- **Tests/Show に Questions/Index リンクを追加した理由**: `Questions/Index` はどこからもリンクされておらず到達不能だった。Tests/Show から「問題を管理する」でアクセスできるようにした
- **質問リストをリンクにしないことにした理由（Tests/Show）**: Tests/Show はテストの概要確認用。個別問題の操作は Questions/Index・Show に委ねる設計にした

---

## 次回への課題・疑問点

- [ ] `question_type` の英語値（`descriptive`, `fill_blank` 等）がそのままUI表示されている。日本語ラベルマップを定義して表示を改善する
- [ ] `confirm()` を shadcn/ui の `AlertDialog` に置き換える（現在はブラウザネイティブダイアログ）
- [ ] `Textarea` / `Select` コンポーネントを shadcn/ui で統一する（現在は素の HTML 要素）
- [ ] `difficulty` / `status` をリテラル型（`'easy' | 'medium' | 'hard'`）に強化する
