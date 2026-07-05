# ワークフロー記法仕様

Timeline Workflow Generator は、Markdown内の `workflow` コードブロック、またはMarkdown本文から時系列ワークフロー図を生成します。
ノードの横位置は依存関係から自動計算されるため、座標や余白を手で指定する必要はありません。

## 最小例

```workflow
# 申請ワークフローの時系列図

## lanes
- requester: 申請者
- approver: 承認者

## nodes
- requester
  - a1: 作成
  - a2: 提出
- approver
  - b1: 承認

## workflow
- a1 -> a2 -> b1
```

## Markdownで使う

Markdown文書の中では、`workflow` コードブロックにワークフローを書きます。

````markdown
```workflow
# 申請ワークフローの時系列図

## lanes
- requester: 申請者
- approver: 承認者

## nodes
- requester
  - a1: 作成
- approver
  - b1: 承認

## workflow
- a1 -> b1
```
````

複数の `workflow` コードブロックがある場合、現在は先頭の1件だけをSVG生成に使います。

## タイトル

最初の `# タイトル` を図のタイトルとして扱います。

```workflow
# 障害対応フロー
```

タイトルを省略した場合は、既定のタイトル `時系列ワークフロー` が使われます。

## lanes

`## lanes` セクションで、レーンを上から順に定義します。

```workflow
## lanes
- reception: 受付
- investigation: 調査
- recovery: 復旧
```

形式は `- laneId: laneLabel` です。lane ID に使える文字は、半角英数字、`_`、`-` です。
同じ lane ID を複数回定義することはできません。lane label は空にできません。

## nodes

`## nodes` セクションでノードを定義します。
まず親の lane ID を `- laneId` で書き、その配下に2スペースインデントで `- nodeId: nodeLabel` を書きます。

```workflow
## nodes
- reception
  - a1: 問い合わせ受付
  - a2: 一次確認
- recovery
  - b1: 復旧作業
```

ノードは親の lane ID に所属します。
ノードIDに使える文字は、半角英数字、`_`、`-` です。
同じノードIDを複数回定義することはできません。node label は空にできません。
SVG に描画されるのは `## workflow` の依存関係で参照されたノードだけです。

## workflow

`## workflow` セクションで依存関係をMarkdownリストとして定義します。

```workflow
## workflow
- a1 -> a2
- a2 -.-> b1
- b1 -x- a3
- a3 .x. b2
- a3 ~> a4
```

依存関係は次の矢印で書きます。

| 記法 | 種類 | SVG出力 |
| --- | --- | --- |
| `a -> b` | 実線矢印 | 実線の矢印を描画します |
| `a -.-> b` | 点線矢印 | 点線の矢印を描画します |
| `a -x- b` | ✗付き依存 | 線の終端手前に✗を描画します |
| `a .x. b` | 点線の✗付き依存 | 点線の終端手前に✗を描画します |
| `a ~> b` | 見えない依存 | 線は描画せず、時系列順序の計算だけに使います |

矢印の両端には、定義済みのノードIDを指定します。

## チェーン

連続する依存関係は、1行にまとめて書けます。

```workflow
- a1 -> a2 -> b1 -> b2
```

これは次と同じ意味です。

```workflow
- a1 -> a2
- a2 -> b1
- b1 -> b2
```

## コメント

`%%` 以降はコメントとして扱われます。`#` はMarkdown見出しとして使うため、コメント扱いしません。

```workflow
## lanes
- requester: 申請者 %% 上段のレーン
```

## エラー例

必須セクションがない場合:

```workflow
# 申請ワークフロー
```

レーン名が空の場合:

```workflow
## lanes
- requester:
```

ノードの形式が違う場合:

```workflow
## nodes
- requester
- a1: 作成
```

未定義レーンを使った場合:

```workflow
## lanes
- requester: 申請者

## nodes
- approver
  - a1: 承認
```

未定義ノードへ矢印を引いた場合:

```workflow
## workflow
- a1 -> a2
```

循環依存がある場合:

```workflow
## workflow
- a -> b
- b -> a
```

循環依存があると時系列の横位置を決められないため、DAGになるように矢印を見直してください。

## PowerPointで使う流れ

1. Engineでワークフローを書く
2. プレビューで図を確認する
3. SVGをダウンロードする
4. PowerPointへドラッグ&ドロップする
5. スライド上でサイズを調整する
