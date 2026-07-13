# PPTX Export

## 方針

PPTX export は、`.pptx` テンプレートファイルを runtime asset として配信しません。
代わりに、正常に開ける1枚スライドの空PPTXを展開し、その内部パーツを [../../src/workflow-pptx-template.js](../../src/workflow-pptx-template.js) の `blankPptxTemplateFiles` として持ちます。

生成時は `blankPptxTemplateFiles` をそのまま使い、ワークフロー固有の内容だけを `ppt/slides/slide1.xml` に差し替えます。
`[Content_Types].xml`、`_rels/.rels`、`ppt/_rels/presentation.xml.rels`、slide layout、slide master、theme、notes、view props、table styles はテンプレート側を維持します。

この形にしている理由は、PowerPoint の修復ダイアログを避けるためです。
PPTX は表示上のスライド内容だけでなく、Office Open XML package の relationship、content type、master/theme/notes 参照の整合が必要です。
周辺構造を手書きで増やすほど不整合を作りやすいため、既知の正常な空PPTX骨格を固定し、差し替え範囲を1ファイルに閉じ込めます。

## テンプレートの再生成

空の1枚スライドPPTXを用意し、次を実行します。

```sh
pnpm run pptx:template -- /path/to/blank.pptx
```

出力先を変える場合は第2引数を渡します。

```sh
pnpm run pptx:template -- /path/to/blank.pptx /tmp/workflow-pptx-template.js
```

このコマンドは `scripts/generate-pptx-template.js` でPPTXを展開し、全パーツをJS文字列マップへ変換します。
`docProps/core.xml` の created / modified は `1980-01-01T00:00:00Z` に固定し、再生成差分が日時だけで揺れないようにします。

## 変更時の契約

- runtime に `.pptx` asset を追加しません。ブラウザだけで生成できるよう、テンプレートはJSに同梱します。
- `createWorkflowPptxFiles()` は `ppt/slides/slide1.xml` だけを差し替えます。
- テンプレートのrelationship IDを変えた場合は、`test/workflow-pptx.test.js` の package / presentation / notes / master relationship テストも更新します。
- 画像化へのフォールバックは入れません。ノードは `p:sp`、線とコネクタは `p:cxnSp` として出力します。
- コネクタ追従を壊さないため、ノード図形を先に書き、コネクタの `a:stCxn` / `a:endCxn` はノードの shape id を参照します。

## 検証

PPTX export を変更したら、最低限次を実行します。

```sh
node --test test/workflow-pptx.test.js
pnpm test
pnpm run build
pnpm run guard:change
git diff --check
```

生成されたPPTXも確認します。

```sh
unzip -t /tmp/workflow.pptx
```

可能なら展開したXMLを `xmllint --noout` で検証し、PowerPointで開いたときに修復ダイアログが出ないことを確認します。
Open XML SDK Validator が使える環境では、その結果もPRへ記録してください。
