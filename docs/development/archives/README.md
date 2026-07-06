# 失敗・反省・再発防止のアーカイブ

同じ失敗を繰り返さないための記録です。

## 読み方

このディレクトリは、過去に発生した失敗、混乱、設計上の反省、再発防止策を記録するためのアーカイブです。
各ファイルの「今後の方針」や「再発防止チェック」は、記録時点の判断を含みます。

現行の細則と archives の内容が矛盾する場合は、現行の細則を優先してください。
現在の正しい手順は、GitHub 操作なら [GitHub 操作方針](../github-workflow.md)、テストなら [テスト規約](../testing.md)、依存管理なら [開発コマンドと依存管理](../tooling.md) を確認してください。

## 一覧

- [0001: GitHub PR 作成時の認証・コネクタ混乱](0001-github-pr-auth-and-connector.md)
- [0002: テスト fixture を runtime サンプルへ残す](0002-fixture-leakage-into-runtime-samples.md)
- [0003: 変更されうる値のハードコード](0003-hardcoded-changeable-values.md)
- [0004: Cloudflare Workers 初回公開時の設定混乱](0004-cloudflare-workers-deploy-traps.md)
- [0005: Codex sandbox で UI テストを通常実行する](0005-codex-ui-test-sandbox.md)

## 書き方

新しいアーカイブは `NNNN-short-title.md` の形式で追加します。

最低限、以下を記録してください。

- 何が起きたか
- 原因
- アンチパターン
- 今後の方針
- 再発防止チェック
