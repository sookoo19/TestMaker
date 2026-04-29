# Tests/Edit ページの実装

**日付**: 2026-04-29
**会話の概要**: Laravel + Inertia.js の Tests/Edit ページを実装した。Create との違いを理解しながら、既存値の表示・PUT リクエスト・編集不可フィールドの設計判断を行った。

---

## 今日学んだ概念

### defaultValue vs value（React フォーム）
- **何か**: フォーム要素の初期値を設定する props
- **なぜ必要か**: Edit ページでは既存データをフォームに表示する必要がある。`value` だと React が管理する「制御コンポーネント」になり state が必要になる。`defaultValue` は「非制御コンポーネント」として初期値だけ渡せる
- **例え**: `defaultValue` は「最初から書いてある下書き」。ユーザーが消したり書き換えたりしても React が追いかけない

### null の `defaultValue` 問題
- **何か**: TypeScript で `string | null` の値を `defaultValue` に渡すと型エラーになる
- **なぜ必要か**: HTML の `defaultValue` は `null` を受け付けない（`string | number | readonly string[] | undefined` のみ）
- **例え**: `defaultValue={null}` は「何も書いてない」ではなく「不正な値」として怒られる

### システム管理フィールドはユーザーに触らせない
- **何か**: 設計上ユーザーが変更すべきでないフィールドは UI に出さない
- **なぜ必要か**: `status`（draft / generating / completed / failed）は PDF 生成フローが自動で更新する値。ユーザーが手動変更すると不整合が生じる
- **例え**: 注文ステータス（発送中・配達完了）をユーザーが自分で変えられたら困るのと同じ

---

## 書いたコード

### Props と breadcrumbs

```tsx
interface Props {
    test: Test;
}

export default function Edit({ test }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: test.title, href: show(test).url },
        { title: '編集', href: '' },
    ];
```

**ポイント解説:**
- `show(test)`: wayfinder が `test.id` を使って `/tests/{id}` の URL を生成してくれる。Show ページへのリンクをパンくずの中間に挟む
- Create は 2 段（一覧 → 作成）だが、Edit は 3 段（一覧 → タイトル → 編集）になる

### update.form でフォームアクションを設定

```tsx
<Form {...update.form(test)} className='space-y-4'>
```

**ポイント解説:**
- `update.form(test)` は `action="/tests/{id}"` と `_method=PUT` の hidden input を展開する
- Create の `store.form()` との違いはここだけ。Laravel は `_method=PUT` を見て PUT リクエストとして処理する

### null を ?? '' で変換

```tsx
<textarea
    name='description'
    defaultValue={test.description ?? ''}
/>

<Input
    name='subject'
    defaultValue={test.subject ?? ''}
/>

<select name='difficulty' defaultValue={test.difficulty ?? ''}>
<select name='output_language' defaultValue={test.output_language ?? ''}>
```

**ポイント解説:**
- `?? ''`（Null 合体演算子）: 左辺が `null` または `undefined` のとき右辺の値を返す
- nullable なフィールドには必ずこれをつける

### status フィールドは削除

Create では `<input type='hidden' name='status' value='draft' />` として固定していたが、Edit では**完全に削除**。

---

## なぜそう書くか（設計の理由）

- **status を編集不可にした理由**: `status` は `draft / generating / completed / failed` の4値で、PDF 生成フローがシステム的に書き換える値。ユーザーが任意に変更できると生成中なのに `draft` に戻すなど不整合が起きるため、Edit フォームから除外した
- **Create と Edit でフォームを分けた理由**: 初期値の有無・送信メソッド（POST vs PUT）・フィールド構成（status の扱い）が異なるため、共通コンポーネント化より個別ファイルのほうがシンプルで見通しが良い

---

## 次回への課題・疑問点

- [ ] Questions ページ（Index / Create / Show / Edit）の実装
- [ ] フォームを制御コンポーネント（`useState` + `value`）にする場合との使い分けを深掘りしたい
