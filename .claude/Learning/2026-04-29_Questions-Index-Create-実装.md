# Questions/Index・Create ページの実装

**日付**: 2026-04-29
**会話の概要**: Questions の Index・Create ページを実装した。Tests との wayfinder ルートの使い分け、sort_order の設計判断、select の defaultValue の意味を学んだ。

---

## 今日学んだ概念

### wayfinder の shallow routes（浅いルート）
- **何か**: URL に親リソースの id を含むルートと含まないルートを使い分ける仕組み
- **なぜ必要か**: `index` / `create` / `store` は「どのテストの質問か」が必要なので `tests/questions` のルートを使う。`show` / `edit` / `update` / `destroy` は question の id だけで特定できるので `questions` のルートを使う
- **例え**: 「田中さんの部署の社員一覧」は部署が必要だが、「社員 ID:123 の詳細」は部署なしでも特定できるのと同じ

### select の defaultValue='' の意味
- **何か**: `<select>` の初期選択状態を明示的に指定する props
- **なぜ必要か**: `defaultValue=''` がないと React がどのオプションを初期選択にするか判断できず、プレースホルダー（「選択してください」）が確実に表示されない場合がある
- **例え**: 「何も選んでいない状態」を明示するための印

### sort_order の設計判断
- **何か**: 質問の表示順を管理する整数フィールド
- **なぜ必要か**: DB から取得する順序は保証されないため、並び順を明示的に管理する必要がある
- **今回の判断**: ユーザーに触らせず `hidden` で `1` 固定にした。将来ドラッグ&ドロップ等の並び替え UI を実装するときに対応する

---

## 書いたコード

### Questions/Index — wayfinder の使い分け

```tsx
import { show as testShow } from '@/routes/tests';
import { create, index as questionsIndex } from '@/routes/tests/questions';
import { show } from '@/routes/questions';
```

**ポイント解説:**
- `tests/questions` の `create` / `index`: URL に test_id が必要なルート（`/tests/{id}/questions`）
- `questions` の `show`: question_id だけで特定できるルート（`/questions/{id}`）
- `testShow`: Tests のルートから import し、パンくずのリンクに使う

### Questions/Index — 質問リスト

```tsx
{questions.length === 0 ? (
    <p className='text-sm text-muted-foreground'>
        質問がまだありません。
    </p>
) : (
    <ul className='space-y-2'>
        {questions.map((question, index) => (
            <li key={question.id} className='rounded-md border p-4 text-sm'>
                <Link
                    href={show(question).url}
                    className='font-medium hover:underline'
                >
                    Q{index + 1}. {question.question_text}
                </Link>
                <p className='mt-1 text-muted-foreground'>
                    {question.question_type}・難易度: {question.difficulty ?? '—'}
                </p>
            </li>
        ))}
    </ul>
)}
```

**ポイント解説:**
- Tests/Show の質問一覧と似た構造だが、こちらは質問タイトルが `Link` になっていてクリックで Show ページへ遷移できる

### Questions/Create — store.form(test) でフォームアクション

```tsx
<Form {...store.form(test)} className='space-y-4'>
```

**ポイント解説:**
- `store.form(test)` が `action="/tests/{id}/questions"` + `method="post"` を展開する
- `test` を渡すことで URL に test の id が自動で埋め込まれる

### Questions/Create — sort_order を hidden で固定

```tsx
<input type='hidden' name='sort_order' value='1' />
```

**ポイント解説:**
- ユーザーには見せず、バリデーション（`required, integer`）だけ通す最小限の実装
- 将来並び替え UI を作るときにここを変更する

---

## なぜそう書くか（設計の理由）

- **sort_order を hidden にした理由**: 現時点で並び替え UI はないため、ユーザーに意識させない。`1` 固定でも質問追加・表示はできるので後回しにしてよい
- **質問タイトルをリンクにした理由**: Index は一覧なので詳細は Show ページに委ねる。Tests/Show の質問一覧（クリック不可）との使い分け

---

## 次回への課題・疑問点

- [ ] Questions/Show の実装（作成後のリダイレクト先なので次が急務）
- [ ] Questions/Edit の実装
- [ ] sort_order の自動採番（既存の質問数 + 1 をデフォルト値にする）
- [ ] 将来的な並び替え UI（ドラッグ&ドロップ）の実装
