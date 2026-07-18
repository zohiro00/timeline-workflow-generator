# PR 正規ルートの前に CLI 認証を確認する

## 日付

2026-07-18

## 失敗パターンID

pr-standard-route-cli-auth-preflight

## 何が起きたか

ドラフト PR 作成依頼に対し、正規ルートである GitHub コネクタを使う前に、通常 sandbox で `gh auth status` を実行しました。

macOS keyring を参照できない sandbox では invalid token と表示されたため、ユーザーへ `gh auth login` による再認証を依頼しました。しかし、権限付きで確認すると既存の認証は正常で、再ログインは不要でした。

同種の keyring 誤判定は [0001](0001-github-pr-auth-and-connector.md) でも発生しており、既知事象の再発です。

## 原因

- GitHub コネクタを使う正規ルートと、`gh` を使う CLI fallback の前提条件を混同した。
- 正規ルートには不要な `gh auth status` を preflight として実行した。
- macOS keyring に触れるコマンドを通常 sandbox で実行した。
- sandbox の invalid token 表示を、実際の GitHub 認証切れと誤判定した。
- リポジトリの [GitHub 操作方針](../github-workflow.md) に既にあった権限ルールを守らなかった。

## アンチパターン

- PR 作成依頼を受けたら、利用する経路を決める前に `gh auth status` を実行する。
- GitHub コネクタを試していないのに、GitHub CLI の認証結果を理由として正規ルートを止める。
- sandbox の keyring 参照失敗をユーザー側の認証問題として扱う。
- 正規ルートと fallback を同時に preflight し、片方の失敗を全経路の blocker にする。

## 今後の方針

- PR 作成は、ローカル Git で commit・pushし、GitHub コネクタで draft PR を作成する経路を正規ルートとする。
- 正規ルートでは `gh auth status` を実行しない。
- GitHub コネクタが利用不能、権限不足、またはユーザーが CLI を明示した場合だけ fallback を選ぶ。
- fallback を選んだ後に限り、`gh auth status` を最初から権限付きで実行する。
- `pnpm run pr:create` は fallback として残し、正規ルートより先には使わない。

## 再発防止チェック

- PR 作成前に、正規ルートか fallback かを明示的に決めたか。
- 正規ルートの preflight に `gh` の存在確認や認証確認を混ぜていないか。
- `gh auth status` を実行する場合、fallback を選んだ理由があるか。
- `gh auth status` を通常 sandbox ではなく権限付きで実行しているか。
- sandbox の認証エラーだけでユーザーへ再ログインを求めていないか。
