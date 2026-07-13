# 開発コマンドと依存管理

## コマンド

- 依存関係の管理は `pnpm` を使います。`packageManager` は `pnpm@11.7.0` で、ロックファイルは [../../pnpm-lock.yaml](../../pnpm-lock.yaml) です。
- `pnpm` が使えない環境では、作業前に `corepack enable pnpm` と `corepack prepare pnpm@11.7.0 --activate` で使える状態にしてください。
- 開発サーバー: `pnpm run dev`
- UI画像キャプチャ: `pnpm run capture:engine`
- PPTXテンプレート再生成: `pnpm run pptx:template -- <blank.pptx>`
- テスト: `pnpm test`
- ビルド: `pnpm run build`
- 変更ゲート: `pnpm run guard:change`
- Draft PR 作成の CLI fallback: `pnpm run pr:create -- --title "<PR title>" --body-file <body.md>`
- Git hook 有効化: `pnpm run install:hooks`

Codex から `pnpm test` を実行する場合は、Playwright UI テストが Vite dev server を起動するため権限付きで実行してください。通常 sandbox では `listen EPERM` で失敗することがあります。

## UI画像キャプチャ

- `pnpm run capture:engine` は、スマホなど開発サーバーを直接確認しにくい環境向けの補助コマンドです。
- 初回または Playwright 更新後に Chromium がない場合は、`pnpm exec playwright install chromium` を実行してください。
- 現時点では `/engine` の desktop 正常表示だけを `docs/assets/engine-desktop.png` に保存します。
- この画像は README から参照される tracked asset です。UI を変えた場合は、キャプチャ結果も同じ差分に含めてください。
- 通常の品質ゲートではありません。UI変更の確認が必要なときだけ実行してください。

## 依存管理

- 依存追加やロックファイル更新は必ず `pnpm` で行ってください。
- 依存追加、ロックファイル更新、設定変更は、それ自体を目的とする変更か、実装に不可欠な場合だけ行ってください。
- `package-lock.json` など、採用していないパッケージマネージャーのロックファイルを作らないでください。
