# 0001: GitHub PR 作成時の認証・コネクタ混乱

> [!IMPORTANT]
> この文書の「`pnpm run pr:create` を標準にする」という判断は当時の記録であり、現在は superseded です。
> 現在の正規ルートは [GitHub 操作方針](../github-workflow.md) に従い、ローカル Git で commit・pushした後、GitHub コネクタで draft PR を作成します。`pnpm run pr:create` は fallback です。

## 日付

2026-06-28

## 何が起きたか

開発ルールと change gate を追加する PR を作成する際、GitHub 接続まわりで余計な迂回が発生しました。

- Codex の通常 sandbox 実行で `gh auth status` が invalid token を返した。
- GitHub コネクタで PR 作成を試したところ、`403 Resource not accessible by integration` が返った。
- その後、`gh pr create` で draft PR は作成できた。
- ユーザーの通常ターミナルでは `gh auth status` が成功していた。
- Codex でも権限付きで `gh auth status` を実行すると成功した。

## 原因

- Codex の sandbox 実行から macOS keyring の `gh` 認証情報が見えないことがある。
- GitHub コネクタは、このリポジトリの PR 作成に必要な権限を持っていなかった。
- `gh` と GitHub コネクタの2系統を同時に試したため、失敗理由が混ざって見えた。

## アンチパターン

- sandbox での `gh auth status` 失敗を、即座にユーザーの認証破損として扱う。
- GitHub コネクタが 403 を返したあとも、PR 作成手段として深追いする。
- `gh` と GitHub コネクタをその場の流れで切り替え、標準ルートを決めない。
- 失敗した中間状態を「ユーザー側の問題」に見せてしまう。

## 今後の方針

- PR 作成は `gh` を標準にする。
- PR 作成の入口は `pnpm run pr:create` に固定する。
- Codex では、keyring や GitHub remote 認証に触れる `gh` 操作を権限付きで実行する。
- `gh auth status` が sandbox で失敗した場合は、権限付きで再確認する。
- GitHub コネクタは PR 作成に使わない。
- 失敗時は、どの実行環境で失敗したかを明記する。

## 再発防止チェック

- PR 作成前に [GitHub 操作方針](../github-workflow.md) を確認する。
- PR 作成は `pnpm run pr:create` で実行し、GitHub コネクタや直接の `gh pr create` を使わない。
- `gh auth status` の結果を、sandbox 実行と権限付き実行で混同しない。
- PR 作成で 403 が出た場合は、コネクタではなく `gh pr create --draft` に寄せる。
