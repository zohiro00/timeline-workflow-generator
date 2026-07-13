# 0007: 既存ブランチ再利用で PR 履歴に過去コミットを混ぜる

## 失敗パターンID

`pr-branch-history-contamination`

## 何が起きたか

エクスポートファイル名の変更 PR を作成する際、既存の作業ブランチをそのまま使ったため、今回の変更とは別の過去コミットと merge commit が PR のコミット履歴に混ざりました。

`git diff --name-status origin/main` では変更ファイルが依頼範囲に見えていたため、その確認だけで draft PR を作成しました。作成後に `git log --oneline origin/main..HEAD` で履歴混入に気づき、`origin/main` から新しいブランチを作成し、今回のコミットだけを cherry-pick した PR に差し替えました。

## 原因

- 差分ファイルの確認と、PR に載るコミット履歴の確認を別物として扱っていなかった。
- 既存ブランチ名が現在の依頼内容と違っていたのに、履歴混入のリスクとして扱わなかった。
- 「同種の失敗は同一セッション内だけで数えない」というルールに対して、archives の確認が不足していた。

## アンチパターン

- `git diff --name-status origin/main` だけを見て、PR の commit list も clean だとみなす。
- 既存作業ブランチを使うときに、`git log --oneline origin/main..HEAD` を確認しない。
- 古いコミットや merge commit が混ざった PR を、差分ファイルが正しいという理由だけでそのままにする。

## 今後の方針

- PR 作成前に、差分ファイルは `git diff --name-status origin/main`、コミット履歴は `git log --oneline origin/main..HEAD` でそれぞれ確認する。
- 既存ブランチに今回の依頼と無関係なコミットが混ざる場合は、`origin/main` から新しいブランチを作り、必要なコミットだけを載せ直す。
- 履歴混入に気づいた場合は、古い PR を閉じるか head を差し替え、レビュー対象が clean な PR へ寄せる。

## 再発防止チェック

- PR 作成前の報告や PR body に、差分ファイルだけでなく `origin/main..HEAD` のコミット範囲も確認済みであることを反映する。
- 既存ブランチ名が依頼内容と一致しない場合は、既存ブランチを使う理由を明確にするか、新しいブランチを作成する。
