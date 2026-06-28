# GitHub 操作方針

## 基本方針

- GitHub 操作は `gh` を標準にします。
- PR 作成は必ず `pnpm run pr:create` を入口にします。Codex は GitHub コネクタや直接の `gh pr create` を使わず、このスクリプト経由で作成してください。
- PR 作成には GitHub コネクタを使いません。過去に PR 作成で `403 Resource not accessible by integration` が発生しており、権限境界が読みづらいためです。
- Codex から `gh` を使う場合、macOS keyring へのアクセスが必要な操作は権限付きで実行します。
- `gh auth status` が通常の sandbox 実行で失敗しても、すぐに「認証が壊れている」と判断しません。まず keyring へのアクセス差を疑い、権限付きで確認します。

## 認証確認

ユーザーの通常ターミナルで以下が成功していれば、GitHub 認証は正常とみなします。

```bash
gh auth status
```

Codex 側で確認する場合は、keyring 参照が必要になるため、必要に応じて権限付きで実行します。

期待する状態:

- `github.com` に `zohiro00` としてログイン済み
- `keyring` 経由で認証
- token scopes に `repo` が含まれる

## PR 作成手順

1. `git status -sb` で作業ツリーと現在ブランチを確認します。
2. `main` 上にいる場合は、作業前にブランチを作成します。
3. 変更対象だけを stage します。
4. `pnpm run guard:change`、`pnpm test`、必要に応じて `pnpm run build` を実行します。
5. commit します。
6. `pnpm run pr:create -- --title "<PR title>" --body-file <body.md>` で push と draft PR 作成を実行します。

`pnpm run pr:create` は、現在ブランチ、保護ブランチ、`gh auth status` を確認し、`git push -u origin <branch>` と `gh pr create --draft` を固定手順で実行します。

## Codex での注意

- `git fetch`、`git pull`、`git push`、`gh pr create` など、remote や認証に触れる操作は権限付きで実行します。
- `pnpm run pr:create` も remote と認証に触れるため、Codex では権限付きで実行します。
- GitHub コネクタで PR 作成を試して 403 になった場合、深追いせず `gh pr create` に切り替えます。
- `gh auth status` の sandbox 失敗だけを理由に、ユーザーへ再ログインを求めないでください。権限付き確認で成功する可能性があります。

## やってはいけないこと

- `gh` と GitHub コネクタの両方を場当たり的に試し、失敗理由を混ぜないでください。
- `gh auth status` の sandbox 失敗を、認証情報そのものの破損として報告しないでください。
- PR 作成に GitHub コネクタを標準利用しないでください。
- `pnpm run pr:create` を迂回して、PR 作成手順を個別コマンドに分解しないでください。
