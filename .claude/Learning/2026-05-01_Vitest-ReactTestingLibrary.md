# Vitest + React Testing Library によるフロントエンドテスト

**日付**: 2026-05-01  
**会話の概要**: Vitest と React Testing Library をセットアップし、TestMaker の全8ページ（Tests・Questions の Index/Show/Create/Edit）に対してコンポーネントテストを実装した。

---

## 今日学んだ概念

### Vitest
- **何か**: Vite ベースのテストランナー。Jest の代替として使われる
- **なぜ必要か**: コンポーネントが「正しく表示されているか」「ボタンを押したとき正しく動くか」を自動で検証できる
- **例え**: 料理のレシピを作るたびに「これ本当に美味しいか？」を毎回確認してくれる人がいるイメージ

### jsdom
- **何か**: Node.js 上でブラウザの DOM（HTMLの木構造）を再現するライブラリ
- **なぜ必要か**: テストは Node.js で動くため、本物のブラウザがない。jsdom が「偽のブラウザ環境」を提供する
- **例え**: 本物の舞台がなくても稽古できる「稽古場」のようなもの

### React Testing Library (RTL)
- **何か**: Reactコンポーネントをレンダリングして DOM を検索・操作するユーティリティ
- **なぜ必要か**: ユーザーが実際にどう操作するか（テキストを見る・ボタンをクリックする）の視点でテストを書ける
- **例え**: 「このボタンは存在するか？」ではなく「ユーザーはこのボタンを見つけてクリックできるか？」という視点

### vi.mock()
- **何か**: 特定のモジュールを偽物に差し替える機能
- **なぜ必要か**: Inertia.js や wayfinder は Laravel サーバーに依存しているため、テスト環境では動かない。偽物に差し替えることで独立してテストできる
- **例え**: 本番の飛行機の代わりにシミュレーターで訓練するようなもの

### レンダープロップパターン
- **何か**: コンポーネントの `children` に関数を渡し、その関数が JSX を返す設計パターン
- **なぜ必要か**: Inertia の `<Form>` は `{ processing, errors }` をコンポーネント内部から渡す必要があるため、この設計になっている
- **例え**: 「材料（processing/errors）は私が用意するから、料理（JSX）はあなたが作って」という役割分担

---

## 書いたコード

### セットアップ

```bash
npm install -D vitest jsdom "@testing-library/react" "@testing-library/jest-dom" "@testing-library/user-event"
```

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config'; // vite ではなく vitest/config から import

export default defineConfig({
    // ...既存の plugins 設定...
    test: {
        environment: 'jsdom',     // ブラウザ相当の DOM 環境
        globals: true,            // describe/it/expect を import なしで使える
        setupFiles: ['./resources/js/test/setup.ts'],
    },
});
```

```ts
// resources/js/test/setup.ts
import '@testing-library/jest-dom';
// テスト実行前に toBeInTheDocument() などの DOM マッチャーを登録する
```

**ポイント解説:**
- `vitest/config` から import: `test` フィールドの型補完が効くようになる
- `globals: true`: `describe`/`it`/`expect` を毎回 import しなくてよくなる（明示的に import してもOK）
- `setupFiles`: 全テストの実行前に必ず読み込むファイルを指定する

---

### テストの基本構造

```tsx
import Index from '@/pages/Tests/Index';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Tests/Index', () => {
    it('テスト一覧を表示する', () => {
        render(<Index tests={[baseTest]} />);
        expect(screen.getByText('サンプルテスト')).toBeInTheDocument();
    });

    it('テストが空のとき案内文を表示する', () => {
        render(<Index tests={[]} />);
        expect(screen.getByText(/テストがまだありません/)).toBeInTheDocument();
    });
});
```

**ポイント解説:**
- `describe('Tests/Index', ...)`: テストをグループ化するブロック。コンポーネント名を入れるのが慣習
- `it('〜のとき〜する', ...)`: 1つのテストケース。仕様を日本語で表す
- `render(...)`: コンポーネントを jsdom 上でレンダリングする
- `screen.getByText(...)`: レンダリングされた DOM からテキストで要素を探す
- `.toBeInTheDocument()`: その要素が DOM に存在することを検証する（jest-dom のマッチャー）
- `/テストがまだありません/`: 正規表現で部分一致検索もできる

---

### vi.mock() でモジュールを差し替える

```tsx
vi.mock('@inertiajs/react', () => ({
    Head: () => null,                    // Head は何もレンダリングしない
    Link: ({ href, children }) => (
        <a href={href}>{children}</a>    // Link は素の <a> タグで代替
    ),
    router: { delete: vi.fn() },         // router.delete は空の関数で代替
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }) => <>{children}</>,  // AppLayout は子要素をそのまま描画
}));

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    create: () => ({ url: '/tests/create' }),
    show: (test) => ({ url: `/tests/${test.id}` }),
}));
```

**ポイント解説:**
- `vi.fn()`: 何も実行しない「スパイ可能な空の関数」を作る。後で「呼ばれたか？」を検証できる
- wayfinder（`@/routes/tests` 等）は Laravel のルート情報が必要なため、固定 URL を返す関数で代替する

---

### hoisting の罠と解決策

```tsx
// NG パターン（実際にハマったエラー）
const mockDelete = vi.fn();
vi.mock('@inertiajs/react', () => ({
    router: { delete: mockDelete }, // ReferenceError: Cannot access 'mockDelete' before initialization
}));

// OK パターン: vi.fn() をインラインで書く
vi.mock('@inertiajs/react', () => ({
    router: { delete: vi.fn() },
}));

// モックした関数を検証したいときは dynamic import で取り出す
it('router.delete を呼ぶ', async () => {
    const { router } = await import('@inertiajs/react');
    expect(router.delete).toHaveBeenCalledWith('/tests/1');
});
```

**ポイント解説:**
- `vi.mock()` は Vitest によってファイルの先頭に自動的に移動される（hoisting = 巻き上げ）
- そのため、`vi.mock()` の factory 関数の中でファイル内の変数を参照するとエラーになる
- 解決策: `vi.fn()` をインラインで書き、検証時は `await import(...)` で取り出す

---

### Inertia Form コンポーネントのモック

```tsx
// Inertia の Form はレンダープロップパターン
// children が ({ processing, errors }) => JSX という関数になっている
vi.mock('@inertiajs/react', () => ({
    Form: ({ children }) => (
        <form>
            {children({ processing: false, errors: {} })}
        </form>
    ),
}));
```

**ポイント解説:**
- 本物の `<Form>` はサーバーへの送信処理を持つが、テストでは不要
- モック側で `children({ processing: false, errors: {} })` を呼ぶことで、フォームの中身（フィールド群）が描画される
- `errors` にデータを入れればバリデーションエラー表示もテストできる

---

### screen のクエリ使い分け

```tsx
// テキストで取得（最もよく使う）
screen.getByText('サンプルテスト')
screen.getByText(/テストがまだ/)  // 正規表現で部分一致

// label と input の紐付けで取得（htmlFor と id が一致している必要がある）
screen.getByLabelText('タイトル')

// input の現在値で取得（defaultValue や value に入った既存値の検証に使う）
screen.getByDisplayValue('サンプルテスト')
```

- `getBy〜`: 見つからないとエラー → テスト失敗
- `queryBy〜`: 見つからないと null → 「存在しないこと」の検証に使う
- `findBy〜`: 非同期で待つ → データフェッチ後の表示検証に使う

---

### userEvent でユーザー操作をシミュレート

```tsx
import userEvent from '@testing-library/user-event';

it('削除ボタンをクリックすると router.delete を呼ぶ', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true); // confirm() で「OK」を押した状態を再現
    render(<Show test={baseTest} />);
    await userEvent.click(screen.getByText('削除'));   // ボタンをクリック
    expect(router.delete).toHaveBeenCalledWith('/tests/1');
});
```

**ポイント解説:**
- `userEvent.click()` は非同期なので `await` が必要
- `vi.spyOn(window, 'confirm').mockReturnValue(true)`: ブラウザの confirm ダイアログを「OK を押した」状態にする
- `toHaveBeenCalledWith('/tests/1')`: 指定した引数で関数が呼ばれたことを検証する

---

### フィクスチャ（テストデータ）の作り方

```tsx
// TypeScript の型に合わせてすべてのフィールドを揃える必要がある
const baseTest = {
    id: 1,
    title: 'サンプルテスト',
    status: 'draft',
    subject: '数学',
    difficulty: 'easy',
    description: null,        // nullable フィールドは null を入れる
    output_language: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
};

// 特定のテストで一部だけ変えたい場合はスプレッドで上書き
const testWithQuestions = {
    ...baseTest,
    questions: [baseQuestion],
};
```

**ポイント解説:**
- 型エラーが出たら `resources/js/types/index.d.ts` で interface を確認する
- `null` と `undefined` は違う。nullable フィールドは `null` を入れる

---

## なぜそう書くか（設計の理由）

- **モックの粒度**: `AppLayout` を丸ごとモックするのは、ナビゲーション等はテスト対象外だから。テストは「そのコンポーネントが担う責務」だけを検証する
- **getByText より getByLabelText**: `getByLabelText` はアクセシビリティ的に正しいマークアップ（`htmlFor` と `id` の紐付け）を確認できる。ラベルとフォームが正しく紐付いているかを同時に検証できる
- **vi.fn() インライン**: hoisting の制約により、vi.mock() の factory 外で宣言した変数は参照できない。インラインで書くのが最もシンプルな解決策

---

## 次回への課題・疑問点

- [ ] `queryBy〜` と `findBy〜` を使うテストケースも書いてみる
- [ ] `userEvent.type()` でテキスト入力のテストを書いてみる
- [ ] `processing: true` のとき送信ボタンが disabled になることをテストする
- [ ] テストファイルが増えたとき、モックの共通化（`__mocks__` ディレクトリ）をどうするか調べる
