# Codex sandbox で UI テストを通常実行する

## 日付

2026-07-04

## 何が起きたか

Codex から `pnpm test` を通常 sandbox で実行したところ、Playwright UI テストの準備で Vite dev server が `127.0.0.1:5183` を `listen` できず、`EPERM` で失敗した。

その後、同じ `pnpm test` を権限付きで再実行すると全テストが成功した。

## 原因

`pnpm test` にはブラウザ UI テストが含まれており、テスト内で必要に応じて Vite dev server を起動する。

Codex の通常 sandbox はローカルポートの `listen` を制限するため、テスト内容に関係なくサーバー起動前に失敗することがある。

## アンチパターン

- Codex で `pnpm test` を通常 sandbox 実行し、毎回 `listen EPERM` を見てから権限付きで再実行する。
- `listen EPERM` をアプリやテスト実装の失敗として扱う。
- UI テストを含むことを忘れ、権限が必要なコマンドとして扱わない。

## 今後の方針

- Codex から `pnpm test` を実行する場合は、最初から権限付きで実行する。
- `listen EPERM` が出た場合は、実行環境の権限不足として扱い、同じコマンドを権限付きで再実行する。
- `pnpm test` の代替コマンドで完了扱いにしない。

## 再発防止チェック

- Codex で検証する前に、`pnpm test` が Playwright UI テストを含むことを確認する。
- `pnpm test` 実行時の権限設定に、ローカル dev server の `listen` が必要であることを反映する。
- 検証結果の報告では、通常 sandbox で一度失敗させた場合、その失敗も隠さず明記する。
