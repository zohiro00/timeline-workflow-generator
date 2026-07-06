# GitHub 操作方針

## 基本方針

- GitHub の参照や PR 作成は、Codex の GitHub コネクタを標準にします。
- `git fetch`、branch 作成、stage、commit、push などローカル checkout と git ref に触れる操作は、ローカル `git` を使います。
- `gh` と `pnpm run pr:create` は、GitHub コネクタが使えない場合、またはユーザーが明示した場合の fallback とします。
- Codex から `gh` を使う場合、macOS keyring へのアクセスが必要な操作は権限付きで実行します。
- `gh auth status` が通常の sandbox 実行で失敗しても、すぐに「認証が壊れている」と判断しません。まず keyring へのアクセス差を疑い、権限付きで確認します。
- GitHub コネクタの repository access が不足している場合は、GitHub App の対象 repository に `zohiro00/timeline-workflow-generator` を追加してから再確認します。

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
2. `git fetch origin` で `origin/main` を最新化します。ローカル `main` だけを最新の基準として扱ってはいけません。
3. 作業ブランチが古い場合は、未コミット変更を保護したうえで `origin/main` に追いつかせ、作業差分を載せ直します。
4. `git diff --name-status origin/main` で、依頼と無関係な削除・巻き戻し・依存更新が混ざっていないことを確認します。
5. `main` 上にいる場合は、作業前にブランチを作成します。
6. 変更対象だけを stage します。
7. `pnpm run guard:change`、`pnpm test`、必要に応じて `pnpm run build` を実行します。
8. commit します。
9. `git push -u origin <branch>` で作業ブランチを push します。
10. GitHub コネクタで draft PR を作成します。

GitHub コネクタが権限不足などで使えない場合、またはユーザーが CLI での作成を明示した場合は、`pnpm run pr:create -- --title "<PR title>" --body-file <body.md>` を fallback として使います。
`pnpm run pr:create` は、現在ブランチ、保護ブランチ、`gh auth status` を確認し、`git push -u origin <branch>` と `gh pr create --draft` を固定手順で実行します。

## Codex での注意

- `git fetch`、`git pull`、`git push`、`gh pr create` など、remote や認証に触れる CLI 操作は権限付きで実行します。
- PR 作成前の差分説明は、必ず最新化した `origin/main` との比較を根拠にします。古いローカル `main` との比較だけで「差分は安全」と判断しないでください。
- `pnpm run pr:create` も remote と認証に触れるため、fallback として使う場合は Codex では権限付きで実行します。
- GitHub コネクタで PR 作成を試して 403 になった場合、repository access と GitHub App 権限を確認します。すぐに進める必要がある場合だけ `pnpm run pr:create` または `gh pr create` に切り替えます。
- `gh auth status` の sandbox 失敗だけを理由に、ユーザーへ再ログインを求めないでください。権限付き確認で成功する可能性があります。

## やってはいけないこと

- `gh` と GitHub コネクタの両方を場当たり的に試し、失敗理由を混ぜないでください。
- `gh auth status` の sandbox 失敗を、認証情報そのものの破損として報告しないでください。
- GitHub コネクタが使える状態で、理由なく `gh pr create` を標準手段として使わないでください。
- ユーザーが `gh pr create` などの手段を明示した場合に、別手段を先に試さないでください。
- `origin/main` を fetch せずに、または古いローカル `main` だけを見て、PR 差分の影響範囲を判断しないでください。
