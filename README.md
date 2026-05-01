# TestMaker
開発環境
- Docker起動 + npm run dev を自動実行
sail up -d

- php watcher
sail composer watch

- db接続
sail artisan db

- REPLの起動
sail artisan tinker

フロントエンドテスト（my-app/ で実行）
- ウォッチモード（ファイル変更で自動再実行）
npm test

- 1回だけ実行
npm run test:run

バックエンドテスト（my-app/ で実行）
- 全テスト実行
composer test

- ウォッチモード
composer watch

- 特定ファイルのみ
php artisan test --filter=TestControllerTest