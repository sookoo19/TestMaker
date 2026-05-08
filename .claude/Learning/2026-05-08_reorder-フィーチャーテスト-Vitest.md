# reorder フィーチャーテスト & Vitest テスト追加

**日付**: 2026-05-08
**会話の概要**: drag & drop 並び替え機能（reorder）のバックエンドフィーチャーテストを追加し、フロントエンドの Generate.test.tsx・Index.test.tsx も整備してブランチを main にマージした。

---

## 今日学んだ概念

### フィーチャーテストで「並び順の更新」を検証する方法

- **何か**: DB に保存された `sort_order` カラムが期待通りに変わったかを `fresh()` で確認するパターン
- **なぜ必要か**: リクエストが成功しても DB が更新されていなければ意味がない。`assertRedirect()` だけでは不十分
- **例え**: 「書類を提出した（リダイレクト成功）」と「書類が棚に正しく並んだ（DB更新確認）」は別の確認

### `array_diff` による認可漏れ対策

- **何か**: 送られてきた question の ID 一覧が、本当にそのテストに属するかをチェックする
- **なぜ必要か**: 認証チェック（`abort_if cannot view`）はテスト自体へのアクセスは守るが、**別テストの question ID を混入させる横断攻撃**は防げない
- **例え**: 「このフロアへの入館証はある（テスト認可OK）」でも「隣の部屋の荷物を動かす権限はない（question の所有権チェック）」

### Vitest で `fetch` をモックする方法

- **何か**: `vi.stubGlobal('fetch', vi.fn())` でブラウザの `fetch` をテスト用の偽関数に差し替える
- **なぜ必要か**: Generate.tsx は `fetch()` で API を直接呼ぶ（Inertia ではなく生の fetch）。実際に API を叩くとテストが外部依存になるため、モックで制御する
- **例え**: 電話のテストをするとき、実際に電話をかけず「電話したら『はい』と返ってくる」と決めてテストするイメージ

### `getByText` と正規表現

- **何か**: テキストが複数の要素に分割されてレンダリングされる場合、完全一致の文字列では見つけられない
- **なぜ必要か**: `Q1. 1+1は？` は `1`、`. `、`1+1は？` と別テキストノードに分かれることがある。`getByText('1+1は？')` は要素全体のテキストと完全一致で比較するため失敗する
- **解決策**: `getByText(/1\+1は？/)` のように正規表現を使う

---

## 書いたコード

### reorder フィーチャーテスト（正常系）

```php
test('ログインユーザーは問題の並び順を更新できる', function () {
    $q1 = Question::factory()->create(['test_id' => $this->test->id, 'sort_order' => 1]);
    $q2 = Question::factory()->create(['test_id' => $this->test->id, 'sort_order' => 2]);
    $q3 = Question::factory()->create(['test_id' => $this->test->id, 'sort_order' => 3]);

    $response = $this->actingAs($this->user)->patch(
        route('tests.questions.reorder', $this->test),
        ['ids' => [$q3->id, $q1->id, $q2->id]]
    );

    $response->assertRedirect();
    expect($q3->fresh()->sort_order)->toBe(1);
    expect($q1->fresh()->sort_order)->toBe(2);
    expect($q2->fresh()->sort_order)->toBe(3);
});
```

**ポイント解説:**
- `['ids' => [$q3->id, $q1->id, $q2->id]]`: q3 を先頭に並び替えたい順序で送る
- `$q3->fresh()->sort_order`: `fresh()` は DB から最新データを再取得するメソッド。`$q3` はリクエスト前のインスタンスなので、DB 更新後の値を読むには必須
- `->toBe(1)`: Pest の `expect()` スタイルのアサーション。`assertEquals` の糖衣構文

### 認可漏れ対策テスト（他テストの question ID 混入）

```php
test('他のテストの問題IDを混入させると422になる', function () {
    $q1 = Question::factory()->create(['test_id' => $this->test->id]);

    $otherTest = Test::factory()->create(['user_id' => $this->user->id]);
    $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

    $response = $this->actingAs($this->user)->patch(
        route('tests.questions.reorder', $this->test),
        ['ids' => [$q1->id, $otherQuestion->id]]
    );

    $response->assertStatus(422);
});
```

**ポイント解説:**
- `$otherTest` は**同じユーザー**が所有する別のテスト。認証は通るが question の所属チェックで弾かれる
- `assertStatus(422)`: コントローラの `abort_if(count(array_diff(...)) > 0, 422)` に対応

### Generate.test.tsx — fetch モックで生成成功を検証

```tsx
it('生成成功後にプレビューフェーズに切り替わる', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
    } as Response);

    render(<Generate test={baseTest} />);
    await userEvent.type(screen.getByLabelText('テーマ'), '算数');
    await userEvent.click(screen.getByRole('button', { name: '生成する' }));

    await waitFor(() => {
        expect(screen.getByText(/1\+1は？/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '保存する' })).toBeInTheDocument();
});
```

**ポイント解説:**
- `vi.mocked(fetch).mockResolvedValueOnce(...)`: `beforeEach` で `vi.stubGlobal('fetch', vi.fn())` した後、このテストだけ「成功レスポンスを返す」と上書きする
- `mockResolvedValueOnce`: 1回だけそのレスポンスを返す。2回目以降は別途設定が必要
- `waitFor(() => ...)`: 非同期処理（fetch）が完了するまで待ってからアサーション
- `getByText(/1\+1は？/)`: 正規表現で部分一致。`+` は正規表現の特殊文字なので `\+` とエスケープ

---

## なぜそう書くか（設計の理由）

- **`fresh()` を使う理由**: Eloquent モデルはインスタンスを作った時点のデータをキャッシュしている。リクエスト後に `$q3->sort_order` を読んでも古い値が返る。`fresh()` で DB から再取得することで「実際に保存されたか」を正確に検証できる

- **`array_diff` チェックを別テストで検証する理由**: このチェックは Laravel の標準バリデーションでは実現できない独自ロジック。テストで明示的に検証しないと、将来誰かがうっかり削除しても気づけない

- **`vi.stubGlobal` を `beforeEach` に置く理由**: 各テストが独立してモックをリセットできるようにするため。`afterEach` で `vi.unstubAllGlobals()` しなくても `beforeEach` で上書きすれば副作用が出ない

---

## 次回への課題・疑問点

- [ ] `QuestionChoiceResource` の実装（API レスポンスの整形）
- [ ] `fresh()` 以外で DB 更新を確認する方法はあるか（`assertDatabaseHas` との使い分け）
- [ ] `vi.stubGlobal` と `vi.fn()` の組み合わせで、呼び出し回数や引数を検証することもできるか
