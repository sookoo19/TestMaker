# Laravel Sail のテスト実行・Policy による認可設計

**日付**: 2026-04-08
**会話の概要**: TestMaker プロジェクトの進捗確認と、Sail 環境でのテスト実行方法を理解した。また QuestionChoicePolicy の実装方針（リレーションを辿ったオーナーチェック）を学んだ。

---

## 今日学んだ概念

### Laravel Sail（Docker 環境）とホスト環境の違い
- **何か**: Sail は Docker 上で Laravel を動かす仕組み。コンテナ内部に PHP・DB・Redis などが入っている
- **なぜ必要か**: ローカル環境に PHP や PostgreSQL をインストールしなくても開発できる
- **例え**: Sail は「まるごとセットになった調理キット」。ホストMac はキッチンを借りているだけで、食材（DB）はキット内にある

### `pgsql` というホスト名の有効範囲
- **何か**: `pgsql` は Docker ネットワーク内でのみ解決できるホスト名
- **なぜ必要か**: コンテナ同士は名前で通信するが、ホスト（Mac）からは `pgsql` という名前を知らない
- **例え**: 社内ネットワークの「プリンター」という名前は社内でしか繋がらないのと同じ

### Laravel Policy（認可）
- **何か**: 「このユーザーはこの操作をしてよいか？」をクラスで定義する仕組み
- **なぜ必要か**: コントローラーに認可ロジックを書くと散らかるため、Policy に分離する
- **例え**: セキュリティガードのルールブック。「このIDカードの人は入室OK」というルールをまとめたもの

### リレーションを辿ったオーナーチェック
- **何か**: `QuestionChoice` は直接 `user_id` を持たないため、`question → test → user_id` と辿って所有者を確認する
- **なぜ必要か**: データモデルが `User → Test → Question → QuestionChoice` と連鎖しているため、末端モデルは直接ユーザーを知らない
- **例え**: 「この荷物は誰のもの？」→「この棚に入っている」→「この倉庫の」→「このオーナーの」と辿るイメージ

### 404 を返す認可（403 ではなく）
- **何か**: `abort_if($user->cannot(...), 404)` と書き、権限エラーでも 404 を返す
- **なぜ必要か**: 403（Forbidden）を返すと「そのリソースが存在すること」が攻撃者にバレてしまう。404 にすることで存在自体を隠す（セキュリティ設計）
- **例え**: 金庫の場所を教えずに「そんな部屋はありません」と答えるようなもの

---

## 書いたコード

### Sail 経由でテストを実行する

```bash
# NG: ホスト上で直接実行 → pgsql に繋がらない
composer test

# OK: Sail（コンテナ）経由で実行
./vendor/bin/sail composer test
./vendor/bin/sail php artisan test
```

**ポイント解説:**
- `./vendor/bin/sail composer test`: Sail がコンテナ内で `composer test` を実行してくれる
- コンテナ内は `pgsql` というホスト名で DB に繋がれるため正常に動く

---

### QuestionChoicePolicy — リレーションを辿ったオーナーチェック

```php
// app/Policies/QuestionChoicePolicy.php

public function view(User $user, QuestionChoice $questionChoice): bool
{
    return $user->id === $questionChoice->question->test->user_id;
}

public function update(User $user, QuestionChoice $questionChoice): bool
{
    return $user->id === $questionChoice->question->test->user_id;
}

public function delete(User $user, QuestionChoice $questionChoice): bool
{
    return $user->id === $questionChoice->question->test->user_id;
}
```

**ポイント解説:**
- `$questionChoice->question`: QuestionChoice が属する Question を取得（BelongsTo リレーション）
- `->test`: その Question が属する Test を取得
- `->user_id`: Test の所有者ID と ログインユーザーのIDを比較
- QuestionChoice 自体は `user_id` を持っていないため、この「辿り方」が必要

---

## なぜそう書くか（設計の理由）

- **ホスト vs コンテナでの実行**: `pgsql` は Docker ネットワーク内の名前解決に依存しているため、必ず Sail 経由（`./vendor/bin/sail`）でコマンドを実行する必要がある。ホストから直接 `php artisan test` を実行しても DB に繋がらない。

- **404 を返す理由**: Laravel の慣習として、所有していないリソースへのアクセスは 403（権限なし）ではなく 404（存在しない）を返す。これにより、URLを推測して存在確認する攻撃（IDOR）に対してリソースの存在自体を隠せる。

- **Policy でリレーションを辿る**: `QuestionChoice` のオーナーは直接わからないが、Eloquent のリレーションが定義されていれば `->question->test->user_id` のようにチェーンして辿れる。ただし N+1 問題になりうるため、本番では `with()` でのイーガーロードを検討する価値がある。

---

## 次回への課題・疑問点

- [ ] `StoreQuestionChoiceRequest` のバリデーションルール（`choice_text`, `is_correct`, `sort_order` をどう検証するか）→ 実装済み（confirmed）
- [ ] `QuestionChoiceController` の各メソッド実装（`store`, `show`, `update`, `destroy`）
- [ ] Policy でリレーションを辿ると N+1 が発生する可能性がある。`with()` との使い分けをいつ意識すべきか
- [ ] Wayfinder（`php artisan wayfinder:generate`）で型安全なルートを生成する手順

---

# FormRequest の役割・Policy の create メソッド・PHP 自動フォーマット設定（追記）

**日付**: 2026-04-08
**会話の概要**: FormRequest の2つの役割（authorize / rules）を理解した。VS Code で PHP ファイルを Ctrl+S で自動フォーマットする設定を行った。QuestionChoicePolicy の `create` メソッドの修正方針を学んだ。

---

## 今日学んだ概念

### FormRequest の役割
- **何か**: コントローラーに届く前にリクエストを検査するクラス
- **なぜ必要か**: バリデーションをコントローラーから分離することで、コントローラーが「処理だけ」に集中できる
- **例え**: 受付係（FormRequest）が来客（リクエスト）をチェックしてから、担当者（コントローラー）に通すイメージ

### authorize() と rules() の違い
- **authorize()**: 「誰が」リクエストしてよいか（認可）
- **rules()**: 「何を」送ってよいか（バリデーション）

### Policy の `create` メソッドの特性
- **何か**: `create` はまだ存在しないリソースへの操作なので、モデルインスタンスを受け取れない
- **なぜ必要か**: 作成前はIDがないため、「どのリソースの所有者か」を Policy でチェックできない
- **解決策**: `create` は `true` を返して通し、親リソースの所有者チェックはコントローラーに任せる

### VS Code の言語別フォーマッター設定
- **何か**: `[php]` のようなブロックで、言語ごとにフォーマッターを切り替えられる
- **なぜ必要か**: Prettier は PHP に対応していないため、PHP だけ別のフォーマッター（Laravel Pint）を使う必要がある
- **例え**: 書類の種類によって担当部署を変えるようなもの

---

## 書いたコード

### StoreQuestionChoiceRequest — バリデーションルール

```php
// app/Http/Requests/StoreQuestionChoiceRequest.php

public function authorize(): bool
{
    return true; // 認証済みユーザーなら通す。Policy に認可を任せる
}

public function rules(): array
{
    return [
        'choice_text' => ['required', 'string', 'max:255'],
        'is_correct'  => ['required', 'boolean'],
        'sort_order'  => ['required', 'integer', 'min:0'],
    ];
}
```

**ポイント解説:**
- `'required'`: 必須項目。送られてこなければ弾く
- `'boolean'`: `true` / `false`（または `1` / `0`）のみ許可
- `'min:0'`: 0以上の整数のみ許可（並び順がマイナスにならないように）

---

### QuestionChoicePolicy — create メソッドの修正

```php
// app/Policies/QuestionChoicePolicy.php

// 修正前
public function create(User $user): bool
{
    return false; // 誰も作れない（バグ）
}

// 修正後
public function create(User $user): bool
{
    // ログインしていれば作成可能（親 Question の所有者チェックはコントローラーで行う）
    return true;
}
```

**ポイント解説:**
- `create` 時点では QuestionChoice が存在しないため、`$questionChoice` を引数に取れない
- QuestionPolicy の `create` と同じパターン：Policy は通す、コントローラーで親の所有者を確認する

---

### .vscode/settings.json — PHP の自動フォーマット設定

```json
"[php]": {
    "editor.defaultFormatter": "open-southeners.laravel-pint",
    "editor.formatOnSave": true
}
```

**ポイント解説:**
- `[php]`: PHP ファイルにだけ適用されるブロック（他の言語の設定を上書きしない）
- `open-southeners.laravel-pint`: Laravel Pint を VS Code から呼び出す拡張
- `editor.formatOnSave`: Ctrl+S で保存したとき自動でフォーマット実行

---

## なぜそう書くか（設計の理由）

- **FormRequest を分ける理由**: コントローラーにバリデーションを書くことも可能だが、分けることで再利用・テスト・可読性が上がる。Laravel の慣習として FormRequest が標準的。

- **create メソッドを true にする理由**: Policy の `create` は引数にモデルが来ないため、所有者チェックが構造的に不可能。`QuestionPolicy` と同じ設計方針で「Policy は認証済みチェックのみ、所有者チェックはコントローラー」と責務を分離する。

- **PHP に Pint を使う理由**: Prettier は JS/TS/CSS を対象としており PHP のプラグインは別途必要。このプロジェクトでは Laravel Pint（PHP-CS-Fixer ベース）が標準の PHP フォーマッターとして採用されている。

---

## 次回への課題・疑問点

- [ ] `QuestionChoicePolicy::create` の修正を実装する
- [ ] `UpdateQuestionChoiceRequest` の実装（update 用バリデーション）
- [ ] `QuestionChoiceController` の各メソッド実装（`store`, `show`, `update`, `destroy`）
