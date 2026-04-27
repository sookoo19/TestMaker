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
