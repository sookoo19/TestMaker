# QuestionChoice インライン管理の実装

**日付**: 2026-05-01
**会話の概要**: 選択肢（QuestionChoice）の CRUD を別ページではなく Question の Create/Edit ページ内でインライン管理できるように実装した。バックエンドのリダイレクト変更、フロントの動的フォーム、Inertia の `useForm` と `transform` パターンを学んだ。

---

## 今日学んだ概念

### Eager Loading（事前読み込み）と `load()` vs クエリビルダー

- **何か**: リレーション（関連モデル）をまとめて取得することで N+1 問題を防ぐ技法
- **なぜ必要か**: `$question->questionChoices` を forループ内で都度呼ぶと SQL が何度も発行される。まとめて取得すれば 1 回で済む
- **2つの書き方の違い**:
  - `$question->load(['questionChoices' => fn($q) => $q->orderBy('sort_order')])` → すでに手元にあるモデルに「後から」リレーションを追加（遅延 Eager Loading）
  - `$question->questionChoices()->orderBy('sort_order')->get()` → クエリを直接実行
  - **どちらも SQL は 1 回**。書き方の好みや文脈で選ぶ。統一感のため `load()` スタイルに揃えた

### Inertia の `useForm` と `<Form>` の使い分け

- **`<Form>` コンポーネント**: wayfinder の `.form()` が返す `action` と `method` をそのまま HTML フォームに展開する。シンプルな CRUD に向く
- **`useForm` フック**: React の state でフォームデータを管理する。動的な配列（選択肢リストなど）を含む場合はこちらが必要
- **なぜ Create ページを `useForm` に変えたか**: 選択式のとき選択肢リストを React state で管理し、送信時に配列ごとサーバーへ渡す必要があったから

### `transform` — 送信直前にデータを加工する

- **何か**: `useForm` の `post()` が実際に送信する直前に、データを変換できる関数
- **なぜ必要か**: 「送信ボタンを押した瞬間に state を更新してから送る」は React の非同期な state 更新のせいで確実に動かない。`transform` を使うと同期的に変換できる
- **例え**: 封筒（フォームデータ）を郵便局（サーバー）に出す直前に、住所の書き間違いを修正する作業

---

## 書いたコード

### `StoreQuestionRequest` — 選択肢バリデーションの追加

```php
'choices' => ['sometimes', 'array'],
'choices.*.choice_text' => ['required', 'string', 'max:255'],
'choices.*.is_correct' => ['required', 'boolean'],
```

**ポイント解説:**
- `sometimes`: このキー自体がリクエストに含まれていない場合はバリデーションをスキップする。選択式以外の問題では `choices` を送らないため必要
- `choices.*`: 配列の各要素に対するルール。`choices[0]`、`choices[1]`... すべてに適用される

---

### `QuestionController::store()` — 質問＋選択肢を一括保存

```php
$question = $test->questions()->create($request->safe()->except('choices'));

foreach ($request->validated()['choices'] ?? [] as $index => $choice) {
    $question->questionChoices()->create([
        'choice_text' => $choice['choice_text'],
        'is_correct' => $choice['is_correct'],
        'sort_order' => $index,
    ]);
}

return redirect()->route('questions.show', $question);
```

**ポイント解説:**
- `$request->safe()->except('choices')`: バリデーション済みデータから `choices` だけ除いて Question を作成。`choices` は Question モデルに存在しないフィールドなのでそのまま渡すとエラーになる
- `?? []`: `choices` キーが存在しない（選択式以外）場合は空配列を使い、foreach を安全にスキップ
- `sort_order` にループのインデックスを使うことで、入力順が自動的に並び順になる

---

### `QuestionController::edit()` — 選択肢を props に追加

```php
return Inertia::render('Questions/Edit', [
    'question' => new QuestionResource(
        $question->load(['test', 'questionChoices' => fn($q) => $q->orderBy('sort_order')])
    ),
    'choices' => $question->questionChoices,
]);
```

**ポイント解説:**
- `load()` した後は `$question->questionChoices` でコレクションにアクセスできる（クエリは発行されない）
- `choices` を別キーで渡しているのは、`QuestionResource` の中に含まれないためフロントで直接参照できるようにするため

---

### `QuestionChoiceController` — リダイレクト先を統一

```php
// store() — 選択肢追加後
return redirect()->route('questions.edit', $question);

// update() — 正解切り替え後
return redirect()->route('questions.edit', $questionChoice->question);

// destroy() — 選択肢削除後
$question = $questionChoice->question;
$questionChoice->delete();
return redirect()->route('questions.edit', $question);
```

**ポイント解説:**
- すべての操作後に `questions.edit` へ戻すことで、Edit ページが「選択肢管理の中心」になる
- `$questionChoice->question` は `belongsTo` リレーションの遅延読み込み。`question_id` から親の Question を取得する

---

### `Questions/Create.tsx` — `useForm` + 動的選択肢 + `transform`

```tsx
const { data, setData, transform, post, processing, errors } = useForm({
    question_type: '',
    question_text: '',
    correct_answer: '',
    explanation: '',
    difficulty: '',
    sort_order: 1,
    choices: [] as Choice[],
});

// 正解ボタンで1つだけ is_correct: true にする
const toggleCorrect = (index: number) => {
    setData(
        'choices',
        data.choices.map((c, i) => ({ ...c, is_correct: i === index })),
    );
};

// 送信直前に correct_answer を選択肢から自動セット
const submit = (e: React.FormEvent) => {
    e.preventDefault();
    transform((d) => ({
        ...d,
        correct_answer:
            d.question_type === 'choice'
                ? (d.choices.find((c) => c.is_correct)?.choice_text ?? '')
                : d.correct_answer,
    }));
    post(store(test).url);
};
```

**ポイント解説:**
- `transform` は `post()` が実行される直前にデータを加工する。`setData` と違い同期的なので「set してすぐ post」の問題が起きない
- `d.choices.find((c) => c.is_correct)?.choice_text ?? ''`: 正解マークされた選択肢のテキストを取得。`?.` はオプショナルチェーン（見つからない場合 `undefined`）、`?? ''` は `undefined` のとき空文字にするフォールバック

---

### 選択式のとき「答え」フィールドを非表示にする

```tsx
{data.question_type !== 'choice' && (
    <div>
        <Label htmlFor='correct_answer'>答え</Label>
        <textarea ... />
    </div>
)}
```

**ポイント解説:**
- `&&` による条件付きレンダリング。左辺が `false` のとき右辺は描画されない
- 選択式では `correct_answer` は選択肢から自動生成するため、ユーザーが入力する必要がなくなる

---

## なぜそう書くか（設計の理由）

- **別ページではなくインライン管理を選んだ**: 選択肢はあくまで「質問の一部」であり、別ページへ遷移するのはユーザーにとって不自然。Create/Edit ページ内で完結する方が操作の流れが自然
- **Create では `useForm`、Edit では `<Form>` を使い分けた**: Edit は既存データの更新で動的配列が不要なため `<Form>` で十分。Create では選択肢の動的管理が必要なため `useForm` に切り替えた
- **`sort_order` にループインデックスを使う**: ユーザーが並び順を入力する手間を省くため、フォームの順序をそのまま保存順序にした
- **コントローラーのリダイレクト先を `questions.edit` に統一**: 選択肢の追加・更新・削除すべてが Edit ページに戻ることで、操作の軸が一本化される

---

## 次回への課題・疑問点

- [ ] Edit ページでも選択式に変更したとき `correct_answer` の自動同期をどうするか（現状は手動入力のまま）
- [ ] `transform` は毎回 `submit` を呼ぶたびに上書きされるが、複数回送信するケースで副作用はないか
- [ ] 選択肢の並び順をドラッグ&ドロップで変えられるようにするには？（`sort_order` の更新が必要）
