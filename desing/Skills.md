## バックエンド（API）
- フレームワーク：Laravel
- OCR：google vision api (月1000回無料)
- AI問題生成：GPT-5 mini(入力：$0.250 / 100万トークン,キャッシュされた入力：$0.025 / 100万トークン,出力：$2.000 / 100万トークン)
- PDF生成：Laravel Snappy
- Word生成：PHPWord

## フロントエンド
- フレームワーク：React + TypeScript + Vite
- CSS：Tailwind CSS
- UIコンポーネント：shadcn/ui
- フォーム管理：Inertia Form Component
- ルーティング：Inertia Router + Laravel Wayfinder

## インフラ / デプロイ
- ホスティング：Vercel（Laravel + React モノリシック構成）
- DB：Supabase（PostgreSQL）
- ストレージ：Supabase Storage
