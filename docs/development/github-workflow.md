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
5. `git log --oneline origin/main..HEAD` で、PR に載るコミット履歴が今回の依頼に必要なものだけであることを確認します。
   既存ブランチに過去作業のコミットや merge commit が混ざる場合は、`origin/main` から新しいブランチを作り、必要なコミットだけを載せ直してから push します。
6. `main` 上にいる場合は、作業前にブランチを作成します。
7. 変更対象だけを stage します。
8. `pnpm run guard:change`、`pnpm test`、必要に応じて `pnpm run build` を実行します。
9. commit します。
10. `git push -u origin <branch>` で作業ブランチを push します。
11. GitHub コネクタで draft PR を作成します。

GitHub コネクタが権限不足などで使えない場合、またはユーザーが CLI での作成を明示した場合は、`pnpm run pr:create -- --title "<PR title>" --body-file <body.md>` を fallback として使います。
`pnpm run pr:create` は、現在ブランチ、保護ブランチ、`gh auth status` を確認し、`git push -u origin <branch>` と `gh pr create --draft` を固定手順で実行します。

## コミット履歴の整理

コミット履歴の整理は、レビュー対象を読みやすくするために使います。`git rebase -i` 自体は禁止しませんが、履歴を書き換える操作なので、使う範囲を明確に制限します。

整理してよい例:

- draft PR の自分だけの作業ブランチで、途中仕様や試行錯誤のコミットを最終意図に合わせてまとめる。
- `fix typo`、`address review`、`use second precision` のような補助コミットを、対応する本体コミットへ squash / fixup する。
- 1つの PR に複数の意味ある変更がある場合に、レビューしやすい単位へ並べ直す。

整理しない例:

- `main`、release branch、他人が作業している共有ブランチの履歴を書き換える。
- ready for review 後、またはレビューコメントが付いた後に、相談なしで大きく履歴を書き換える。
- CI 失敗やレビュー指摘の原因を見えにくくするために、実質的な変更を履歴整理として隠す。

運用ルール:

1. 履歴整理前に `git status -sb` で作業ツリーが clean であることを確認します。
2. `git fetch origin` 後、`git log --oneline origin/main..HEAD` と `git diff --name-status origin/main` で、整理対象のコミットと差分を確認します。
3. 人間が手元で操作する場合は `git rebase -i origin/main` を使ってかまいません。
4. Codex から履歴を整理する場合は、対話操作を避け、`git reset --soft origin/main`、ファイル単位の `git add`、再コミットなどの非対話手順を優先します。
5. すでに push 済みの自分の作業ブランチを書き換えた場合は、`git push --force-with-lease` を使います。`git push --force` は使いません。
6. 履歴整理後は `git log --oneline origin/main..HEAD` で、PR に載るコミットがレビュー意図どおりになったことを確認します。
7. ファイル内容が変わった場合は通常の検証を再実行します。履歴だけを整理し、`origin/main` との差分が同一であることを確認できる場合でも、その確認内容を報告します。

## Codex での注意

- `git fetch`、`git pull`、`git push`、`gh pr create` など、remote や認証に触れる CLI 操作は権限付きで実行します。
- `git switch -c`、`git checkout -b`、`git stash`、`git add`、`git commit`、`git rebase`、`git merge` など、`.git` へ書き込むローカル Git 操作も、Codex では最初から権限付きで実行します。
- `git status`、`git diff`、`git branch --show-current`、`git log` など、`.git` を読むだけの操作は通常 sandbox で実行します。
- PR 作成前の差分説明は、必ず最新化した `origin/main` との比較を根拠にします。古いローカル `main` との比較だけで「差分は安全」と判断しないでください。
- PR 作成前に `git log --oneline origin/main..HEAD` を確認し、差分ファイルだけでなくコミット履歴もレビュー可能な範囲に収まっていることを確認してください。
- `pnpm run pr:create` も remote と認証に触れるため、fallback として使う場合は Codex では権限付きで実行します。
- GitHub コネクタで PR 作成を試して 403 になった場合、repository access と GitHub App 権限を確認します。すぐに進める必要がある場合だけ `pnpm run pr:create` または `gh pr create` に切り替えます。
- `gh auth status` の sandbox 失敗だけを理由に、ユーザーへ再ログインを求めないでください。権限付き確認で成功する可能性があります。

## やってはいけないこと

- `gh` と GitHub コネクタの両方を場当たり的に試し、失敗理由を混ぜないでください。
- `gh auth status` の sandbox 失敗を、認証情報そのものの破損として報告しないでください。
- GitHub コネクタが使える状態で、理由なく `gh pr create` を標準手段として使わないでください。
- ユーザーが `gh pr create` などの手段を明示した場合に、別手段を先に試さないでください。
- `origin/main` を fetch せずに、または古いローカル `main` だけを見て、PR 差分の影響範囲を判断しないでください。
- 既存ブランチの `git diff --name-status origin/main` が依頼範囲に見えるだけで、コミット履歴を確認せずに PR を作成しないでください。
- `git push --force` を使わないでください。履歴整理後の push は `git push --force-with-lease` に限定します。
- `.git` への書き込みが必要だと分かっている操作を通常 sandbox で試し、失敗ログを出してから権限付きで同じ操作を再実行しないでください。
- ユーザー変更の退避を目的に、差分確認なしで `git stash` を使わないでください。まず差分を読み、必要な場合だけ理由を明確にして退避します。
