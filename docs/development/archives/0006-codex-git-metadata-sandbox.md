# Codex sandbox で Git メタデータ更新を通常実行する

## 日付

2026-07-11

## 失敗パターンID

codex-sandbox-known-permission-retry

## 何が起きたか

Codex で `git stash` やブランチ作成を通常 sandbox で実行し、`.git` への書き込み制限で失敗した。

その後、同じ操作を権限付きで再実行して最終的には成功したが、途中に不要な失敗ログが残った。

## 原因

Codex の通常 sandbox では、`.git` は読めても書き込みが制限されることがある。

`git status`、`git diff`、`git branch --show-current` のような読み取り操作は通常 sandbox で足りる。一方、`git stash`、ブランチ作成、stage、commit、rebase、merge は Git メタデータを更新するため、通常 sandbox では失敗しやすい。

## アンチパターン

- `.git` への書き込みが必要だと分かっている Git 操作を通常 sandbox で試し、失敗してから権限付きで再実行する。
- sandbox の権限不足による失敗を、Git や作業ツリーの異常として扱う。
- ユーザーの未コミット変更を十分に確認せず、保護目的で反射的に `git stash` を使う。
- ブランチ作成や commit など、作業に必要な Git メタデータ更新を「まず通常実行して様子を見る」手順にする。

## 今後の方針

- `.git` 読み取りだけの操作は通常 sandbox で実行する。
- `.git` へ書き込む操作は、Codex では最初から権限付きで実行する。
- `git stash` は最小限にし、まず `git status` と `git diff` で既存差分を確認する。
- 権限付き実行が必要な理由は、Git メタデータ更新、remote アクセス、認証アクセスなど具体的に説明する。

## 再発防止チェック

- Git 操作の前に、その操作が `.git` を読むだけか、`.git` へ書き込むかを判定する。
- `git switch -c`、`git checkout -b`、`git stash`、`git add`、`git commit`、`git rebase`、`git merge` は通常 sandbox で試さない。
- 失敗ログが出た場合は、同じ種類の操作を以後の手順で通常 sandbox 実行し続けない。
- ユーザーへ報告する際は、未実行、失敗、権限付き再実行の有無を隠さず区別する。
