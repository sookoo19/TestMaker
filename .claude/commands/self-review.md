---
description: 手元のコードをreviewerエージェントでセルフレビューし、指摘に基づいて自動修正するループ
argument-hint: [レビュー対象] [reviewer名]
---

以下の手順を順番に実行してください。

## ステップ1: 引数の解釈

$ARGUMENTS を以下のルールで解釈してください：

- 第一引数: レビュー対象（省略時は `diff` = 現在のunstaged changes + untracked files）
- 第二引数: reviewer名（省略時は全reviewerを並列実行）

### レビュー対象の指定方法

- 指定なし / `diff`: `git diff` + `git ls-files --others --exclude-standard` で新規ファイルも取得
- `staged`: `git diff --cached`
- `branch` または `ブランチ`: `git diff origin/main...HEAD`
- `PR #123` または `pr 123`: `gh pr diff 123`
- その他: そのまま渡す

### 利用可能なreviewer名

**エージェント型**（専用エージェントを起動）:

- `reviewer` - Claude自身による詳細レビュー（品質・セキュリティ・パフォーマンス）
- `simplify-reviewer` - 可読性・一貫性・保守性に特化したレビュー

**スキル型**（Vercelガイドラインを読み込んでgeneral-purposeエージェントで実行）:

- `vercel-composition-patterns` - Reactコンポーネント設計パターン。ガイドライン: `.claude/skills/vercel-composition-patterns/AGENTS.md`
- `vercel-react-best-practices` - React / Next.js パフォーマンス最適化。ガイドライン: `.claude/skills/vercel-react-best-practices/AGENTS.md`
- `web-design-guidelines` - コードレビューのお供、初歩的なUXミスを防ぐ。ガイドライン: `.claude/skills/`

**以上三つのスキルは"/Users/suzukikohei/Desktop/tech train/TESTMAKER/.claude/skills"にあります**

reviewer名が上記のいずれにも一致しない場合は、エラーとしてユーザーに利用可能なreviewer名を案内してください。

## ステップ2: レビュー実行

- reviewer名が指定された場合: そのreviewerを以下のルールで起動し、レビュー対象の情報を渡してコードレビューを実行する
- reviewer名が省略された場合: 全reviewerを**同時に並列起動**し、レビュー対象の情報を渡してコードレビューを実行する

### reviewer種別ごとの起動方法

**エージェント型** (`reviewer`, `simplify-reviewer`):

- `subagent_type` にreviewer名をそのまま指定してAgentツールで起動する

**スキル型** ( `vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`):

1. 対応する `AGENTS.md`、`SKILL.md` ファイルを読み込む
2. `subagent_type: general-purpose` で起動し、プロンプトに「AGENTS.md or SKILL.mdのガイドライン全文 + diff」を含める
3. 「このガイドラインに照らしてdiffをレビューし、違反・改善点を日本語で報告してください」と指示する

## ステップ3: レビュー修正

すべてのレビューが完了したら、/fix-review-comments スキルを実行して、レビュー指摘に対応してください。