# 開発コマンドと依存管理

## コマンド

- 依存関係の管理は `pnpm` を使います。`packageManager` は `pnpm@11.7.0` で、ロックファイルは [../../pnpm-lock.yaml](../../pnpm-lock.yaml) です。
- `pnpm` が使えない環境では、作業前に `corepack enable pnpm` と `corepack prepare pnpm@11.7.0 --activate` で使える状態にしてください。
- 開発サーバー: `pnpm run dev`
- テスト: `pnpm test`
- ビルド: `pnpm run build`
- 変更ゲート: `pnpm run guard:change`
- Git hook 有効化: `pnpm run install:hooks`

## 依存管理

- 依存追加やロックファイル更新は必ず `pnpm` で行ってください。
- 依存追加、ロックファイル更新、設定変更は、それ自体を目的とする変更か、実装に不可欠な場合だけ行ってください。
- `package-lock.json` など、採用していないパッケージマネージャーのロックファイルを作らないでください。
