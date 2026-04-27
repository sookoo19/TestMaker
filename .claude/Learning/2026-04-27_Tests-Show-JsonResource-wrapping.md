# Tests/Show ページの実装（JsonResource・data ラッパー問題）

**日付**: 2026-04-27
**会話の概要**: `Tests/Show.tsx` を実装する過程で、Laravel JsonResource の `data` ラッパーによるバグを発見・修正した。あわせて `Question` 型の追加・`TestResource` への questions 追加・Prettier の JSX クォート設定も行った。

---

## 今日学んだ概念

### Laravel JsonResource の `data` ラッパー
- **何か**: Laravel の API Resource は JSON レスポンスを `{ "data": { ... } }` の形でラップする仕組み
- **なぜ存在するか**: REST API として使うとき、メタ情報（ページネーションなど）と本体データを分離できる設計のため
- **Inertia では不要**: Inertia はブラウザ向けに props を渡すだけで REST API ではないため、`data` ラッパーは邪魔になる
- **症状**: `test.id` が `undefined` になり `Cannot read properties of undefined (reading 'toString')` エラーが発生した

### `JsonResource::withoutWrapping()`
- **何か**: Laravel の全 JsonResource に対して `data` ラッパーを無効化するクラスメソッド
- **どこに書くか**: `AppServiceProvider::boot()` に書くことでアプリ起動時に一度だけ設定される
- **例え**: 「すべての荷物は袋に入れなくていい」というルールを工場全体に適用する感覚

### `whenLoaded()` による条件付きリレーション
- **何か**: リレーションがロード済みのときだけレスポンスに含めるメソッド
- **なぜ必要か**: `index()` では questions を読み込まないが `show()` では読み込む。`whenLoaded` を使わないと全アクションで N+1 クエリが発生する可能性がある
- **例え**: 「注文書に備考欄があるときだけ備考を印刷する」設計

### Prettier の `jsxSingleQuote` オプション
- **何か**: JSX 属性のクォートをシングルにするための Prettier 設定
- **なぜ `singleQuote` だけでは足りないか**: `singleQuote` は JS/TS 文字列のみに効く。JSX 属性（`className='...'` など）には `jsxSingleQuote` が必要
- **設定場所**: `.prettierrc` に `"jsxSingleQuote": true` を追加

---

## 書いたコード

### AppServiceProvider に withoutWrapping を追加

```php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

**ポイント解説:**
- `boot()` はアプリ起動時に一度だけ実行される
- これ以降、`new TestResource($test)` は `{ id: 1, ... }` として届く（`data` なし）
- `TestResource::collection()` も同様に `[...]` の配列として届く

### TestResource に questions を追加（whenLoaded）

```php
use App\Http\Resources\QuestionResource; // ← 同じ namespace なので不要（Pint が削除する）

'questions' => QuestionResource::collection($this->whenLoaded('questions')),
```

**ポイント解説:**
- `QuestionResource` は `App\Http\Resources` namespace に属するため、`TestResource` と同じ namespace → `use` 不要
- `$this->whenLoaded('questions')` はリレーションがロード済みのときだけ値を返す

### Tests/Show.tsx の Props 型

```tsx
interface Props {
    test: Test & { questions: Question[] };
}
```

**ポイント解説:**
- `Test & { questions: Question[] }` は TypeScript の「交差型」
- `Test` 型を拡張して questions フィールドを追加している
- Show ページだけ questions が渡されるため、基本の `Test` 型には含めず交差型で対応

### Tests/Index.tsx の修正（withoutWrapping 対応）

```tsx
// 修正前
interface Props { tests: { data: Test[] }; }
tests.data.map(...)
tests.data.length

// 修正後
interface Props { tests: Test[]; }
tests.map(...)
tests.length
```

**ポイント解説:**
- `withoutWrapping()` 適用後はコレクションも配列直接になる
- `tests.data` へのアクセスは全て `tests` に変更が必要

---

## なぜそう書くか（設計の理由）

- **`withoutWrapping()` をグローバルに設定**: Inertia アプリ全体で `data` ラッパーが不要なため、個別に外すより一括設定が保守しやすい
- **`edit(test.id)` で明示的に id を渡す**: wayfinder のオブジェクト自動検出より、数値を直接渡す方が確実。型が複雑なオブジェクトを渡すと予期せぬ動作になる場合がある

---

## 次回への課題・疑問点

- [ ] `Tests/Edit.tsx` の実装（フォームに既存データの初期値をどう設定するか）
- [ ] `withoutWrapping()` を設定すると既存の API テスト（`assertJson(['data' => ...])` 形式）が壊れる可能性 → テストを確認する
- [ ] `Question` 型の `test` フィールド（`QuestionResource` は `test: { id, title }` を含む）は今後必要になるか
