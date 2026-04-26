# QuestionChoiceController — shallow routes と認可設計

**日付**: 2026-04-26
**会話の概要**: `QuestionChoiceController` の全メソッド（index/store/show/update/destroy）を実装。shallow routes の設計と、メソッドごとの認可権限の使い分けを学んだ。

---

## 今日学んだ概念

### Shallow Nested Routes（浅いネストルート）
- **何か**: 親リソースのIDをURLに含めるのは「作成・一覧」だけにして、「表示・更新・削除」は子リソース単体のURLにする設計
- **なぜ必要か**: `/questions/1/question_choices/5` のような深いURLを避け、URLをシンプルに保つ
- **例え**: 棚（Question）から本（QuestionChoice）を取り出すとき、「棚を経由して本を探す操作（index/store）」と「本を直接手に取る操作（show/update/destroy）」を分けるイメージ

### 親リソースを通じたcreate（関連付け作成）
- **何か**: `$parent->children()->create(...)` で親子関係を自動設定しながらレコード作成
- **なぜ必要か**: 直接 `QuestionChoice::create(...)` だと `question_id` を手動でセットする必要がある。親経由なら自動で紐づく
- **例え**: 「鈴木さんの部署に新入社員を追加」するとき、部署オブジェクト経由で追加すれば部署IDが自動セットされるイメージ

---

## 書いたコード

### QuestionChoiceController::index()

```php
public function index(Request $request, Question $question)
{
    abort_if(
        $request->user()->cannot('view', $question),
        404
    );

    $choices = $question->question_choices()->orderBy('sort_order')->get();

    return Inertia::render('QuestionChoices/Index', [
        'question' => $question,
        'choices' => $choices,
    ]);
}
```

**ポイント解説:**
- `orderBy('sort_order')`: DBから取得するとき `sort_order` カラムで昇順に並べる。これがないと取得順序が保証されない
- 親経由で取得することで、そのQuestionに紐づくChoiceだけ取れる

### QuestionChoiceController::store()

```php
public function store(StoreQuestionChoiceRequest $request, Question $question)
{
    abort_if(
        $request->user()->cannot('view', $question),
        404
    );

    $choice = $question->question_choices()->create($request->validated());

    return redirect()->route('question_choices.show', $choice);
}
```

**ポイント解説:**
- `Question $question`: 引数に親リソースを受け取る。URLに `:question` が含まれ、Laravelが自動でモデルを解決（Route Model Binding）
- `abort_if(...cannot('view', $question), 404)`: 認可チェック。403ではなく404を返すことでリソースの存在自体を隠す
- `$question->question_choices()->create(...)`: 親経由で作成 → `question_id` が自動セット
- `$request->validated()`: バリデーション済みデータだけを取り出す。生の `$request->all()` は使わない

### QuestionChoiceController::show()

```php
public function show(Request $request, QuestionChoice $questionChoice)
{
    abort_if(
        $request->user()->cannot('view', $questionChoice),
        404
    );

    return Inertia::render('QuestionChoices/Show', [
        'choice' => $questionChoice->load('question'),
    ]);
}
```

**ポイント解説:**
- 引数が `QuestionChoice $questionChoice`（親不要）— shallow route の特徴
- `->load('question')` で親の Question も一緒にフロントに渡す

### QuestionChoiceController::update()

```php
public function update(UpdateQuestionChoiceRequest $request, QuestionChoice $questionChoice)
{
    abort_if(
        $request->user()->cannot('update', $questionChoice),
        404
    );

    $questionChoice->update($request->validated());

    return redirect()->route('question_choices.show', $questionChoice);
}
```

**ポイント解説:**
- 認可は `update`（show は `view`）— 操作の種類で権限を使い分ける

### QuestionChoiceController::destroy()

```php
public function destroy(Request $request, QuestionChoice $questionChoice)
{
    $question = $questionChoice->question;

    abort_if(
        $request->user()->cannot('delete', $questionChoice),
        404
    );

    $questionChoice->delete();

    return redirect()->route('questions.question_choices.index', $question);
}
```

**ポイント解説:**
- 削除前に `$question` を取得。削除後は `$questionChoice->question` が使えなくなるため先に保持
- 削除後は親の `index` にリダイレクト

---

## なぜそう書くか（設計の理由）

- **404を返す理由**: 403だと「リソースは存在するがアクセス権がない」とわかってしまう。404にすると他人のリソースの存在すら漏れない
- **認可対象が `$question` な理由**: `QuestionChoice` を作れる = その `Question` にアクセスできる。親に対する `view` 権限があれば子を操作できる、という設計
- **`$question->question_choices()->create()` の理由**: `Question` に `hasMany(QuestionChoice::class)` リレーションがあるため、経由することで `question_id` の手動セットが不要になる
- **`view` / `update` / `delete` を使い分ける理由**: 将来「閲覧はできるが編集はできないユーザー」を作りたいとき、権限が分かれていないと制御できない。今は全部 `return true` でも、Policy に条件を足すときに意味が出てくる
- **削除前に親を取得する理由**: `$questionChoice->delete()` 後はリレーションが消えて `->question` が取れなくなる。削除前に変数に入れておく必要がある

---

## ルート登録

`routes/web.php` に追加:

```php
use App\Http\Controllers\QuestionChoiceController;

Route::resource('questions.question_choices', QuestionChoiceController::class)->shallow();
```

`->shallow()` で自動的に2種類に分かれる:
- 親ID付き URL: `index` / `store`（`questions/{question}/question_choices`）
- 子単体 URL: `show` / `update` / `destroy`（`question_choices/{question_choice}`）

コントローラーは関係ない。`->shallow()` がルートを分けるだけ。

---

## テスト設計

### beforeEach

```php
beforeEach(function () {
    $this->user = User::factory()->create();
    $this->test = Test::factory()->create(['user_id' => $this->user->id]);
    $this->question = Question::factory()->create(['test_id' => $this->test->id]);
    $this->withoutVite();
});
```

- 各 `test()` 実行前に毎回走るセットアップ
- `RefreshDatabase` でDBリセット → `beforeEach` で初期データ投入、のセット

### index テスト（3パターン）

```php
describe('index', function () {
    test('ログインユーザーは選択肢一覧を取得できる', function () {
        QuestionChoice::factory()->count(3)->create(['question_id' => $this->question->id]);

        $response = $this->actingAs($this->user)->get(
            route('questions.question_choices.index', $this->question)
        );

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->get(
            route('questions.question_choices.index', $this->question)
        );

        $response->assertRedirect(route('login'));
    });

    test('他人の問題の選択肢一覧は取得できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->get(
            route('questions.question_choices.index', $otherQuestion)
        );

        $response->assertNotFound();
    });
});
```

### よく使う assert

- `assertOk()` → 200
- `assertRedirect(url)` → 302
- `assertNotFound()` → 404
- `assertDatabaseHas('table', [...])` → レコード存在確認
- `assertDatabaseMissing('table', [...])` → レコード不在確認

---

## デバッグで学んだこと

### use インポート漏れ → `Class "App\Http\Controllers\Request" does not exist`
コントローラーで `Request` / `Question` / `Inertia` を使う場合、ファイル上部に `use` が必要。
名前空間が `App\Http\Controllers` なので、インポートなしだと同じ名前空間内を探してしまう。

### マイグレーションにカラム未定義 → `column "sort_order" does not exist`
マイグレーションファイルにカラムを追加し忘れると、DBにそのカラムが存在しない。
`migrate:fresh` で再作成が必要。

### Factory の `definition()` が空 → `null value in column "choice_text" violates not-null constraint`
Factoryの `definition()` が `return []` のままだとカラムに値が入らない。
テストで `factory()->create()` を使う前に必ず定義する。

```php
// QuestionChoiceFactory.php
public function definition(): array
{
    return [
        'choice_text' => $this->faker->sentence(),
        'is_correct' => false,
        'sort_order' => $this->faker->numberBetween(0, 10),
    ];
}
```

### タイポまとめ（今回発生したもの）
- `cannnot` → `cannot`（n が3つ）
- `nQuestionChoice` → `QuestionChoice`（先頭に n が混入）
- `question_choice()` → `question_choices()`（s 抜け）
- `$response =` の代入忘れ → `Undefined variable $response`

---

## 次回への課題・疑問点

- [x] `index` / `show` / `update` / `destroy` の実装
- [x] ルート登録（shallow nested resource の書き方）
- [ ] `QuestionChoiceControllerTest` の `store` 以降のテスト作成
- [ ] `StoreQuestionChoiceRequest::authorize()` の中身（現在 `return true` のまま）を Policy と連携させるか検討
