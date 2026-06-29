# テスト fixture を runtime サンプルへ残す

## 何が起きたか

engine 画面では `workflow` コードブロック内の DSL 本文だけを初期表示する方針に変えた後も、`sampleWorkflowMarkdown` を `src/sample-workflow.js` に残していた。

実際には UI から参照されておらず、Markdown ブロックの parser テスト用 fixture としてだけ使われていた。

## 原因

parser は Markdown 内の `workflow` ブロックを扱えるため、その能力を保つ fixture と engine 画面のサンプルを同じ module に置き続けた。

「将来 VS Code 拡張などで使うかもしれない」という裏側の都合と、現在の engine 画面に必要な runtime サンプルの責務を分けきれていなかった。

## アンチパターン

- 現在の UI 要件から外れたサンプルを、将来用途やテスト都合を理由に runtime module へ残す。
- export されている値を「いつか使うかもしれない API」として温存する。
- テスト fixture の置き場所を作らず、production code のサンプル定義に混ぜる。
- 機能は残すが表示は変える、という変更で「表示から消えた入力形式」がコード上の代表サンプルとして残る。

## 今後の方針

- UI の初期値、runtime サンプル、parser fixture は責務別に置く。
- engine で表示しない入力形式は、engine 用 sample module から export しない。
- Markdown ブロック抽出のような裏側の互換性は、テスト内 fixture または test fixture file で明示する。
- 将来の拡張予定だけを理由に unused export を残さない。必要になった時点で、その surface に合う module とテストを追加する。

## 再発防止チェック

- 変更後に `rg` で新旧 sample 名の参照先を確認する。
- production code の export が UI、core、外部 API のどれに必要か説明できない場合は削除する。
- parser の入力形式を守るテストは、runtime サンプルではなくテスト自身の fixture として読めるか確認する。
