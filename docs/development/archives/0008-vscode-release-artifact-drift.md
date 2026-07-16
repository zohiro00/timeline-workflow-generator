# 古いコミット由来の VSIX を公開候補に残す

## 日付

2026-07-17

## 失敗パターンID

`vscode-release-artifact-drift`

## 何が起きたか

VS Code拡張のPR作成後、Web版のparser、renderer、DSLへ複数の変更が`main`へ追加されました。拡張は同じ`src/workflow.js`をバンドルするため、PR作成時のVSIXは最新コアを含まない古い公開候補になりました。

また、`dist/`、`.vscode-test/`、VSIXはGitに追跡されないため、別ブランチへ切り替えても作業ディレクトリへ残ります。ファイルが存在することだけでは、現在のコミットから生成された公開物だと判断できません。

Marketplace用READMEの画像はGitHubの`main`を参照するため、PRのマージ前に公開すると画像が一時的に参照できない構成でもありました。

## 原因

- 公開物の存在と、公開物を生成したGitコミットの対応を記録していなかった。
- ignored生成物がブランチ切り替え後も残ることを、公開前確認へ含めていなかった。
- Marketplace、GitHub Release、ローカル確認で別々にVSIXを生成できる余地があった。
- コアを共有する設計では、拡張専用ファイルに差分がなくても再バンドルが必要になることを明文化していなかった。

## アンチパターン

- 作業ディレクトリに残っているVSIXを、生成元コミットを確認せず公開する。
- PRブランチで生成したVSIXを、`main`更新後もそのまま初回リリースへ使う。
- Marketplace用、GitHub Release用、ローカル確認用のVSIXを別々に生成する。
- `git clean -fdX`で、用途を確認せず依存キャッシュやignoredファイルを一括削除する。
- MarketplaceのREADME画像が`main`に存在する前に拡張を公開する。

## 今後の方針

- 拡張PRを先にマージし、最新の`origin/main`からVSIXを1回だけ生成する。
- 生成時のコミットSHAとVSIXのSHA-256を記録する。
- ローカル確認、Marketplace、GitHub Releaseで同じVSIXを使う。
- `src/workflow.js`またはその依存モジュールが変わった場合は、拡張専用ファイルに差分がなくても再ビルド、Extension Hostテスト、VSIX再生成を行う。
- 公開後の削除は候補を先に表示し、再生成可能と確認できた出力へ限定する。
- 現行手順は[VS Code拡張の公開手順](../vscode-extension-release.md)へ集約する。

## 再発防止チェック

- `git rev-parse HEAD`と`git rev-parse origin/main`が一致している。
- `pnpm run vscode:package`を最新mainで実行している。
- VSIXのSHA-256をMarketplaceアップロード前に記録している。
- GitHub Releaseへ同じファイル名とハッシュのVSIXを添付している。
- Marketplace READMEが参照する画像を公開済み`main`から取得できる。
- `git clean -ndX`の結果を確認してから、対象を明示して削除している。
