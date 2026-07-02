# DSL仕様

Timeline Workflow Generator は、Markdown内の `workflow` コードブロック、またはDSL本文から時系列ワークフロー図を生成します。
ノードの横位置は依存関係から自動計算されるため、座標や余白を手で指定する必要はありません。

## 最小例

```workflow
title: 申請ワークフローの時系列図

lane: 申請者
lane: 承認者

node a1: 作成 (lane: 申請者)
node a2: 提出 (lane: 申請者)
node b1: 承認 (lane: 承認者)

a1 -> a2 -> b1
```

## Markdownで使う

Markdown文書の中では、`workflow` コードブロックにDSLを書きます。

````markdown
```workflow
title: 申請ワークフローの時系列図

lane: 申請者
lane: 承認者

node a1: 作成 (lane: 申請者)
node b1: 承認 (lane: 承認者)

a1 -> b1
```
````

複数の `workflow` コードブロックがある場合、現在は先頭の1件だけをSVG生成に使います。

## title

図のタイトルを指定します。

```workflow
title: 障害対応フロー
```

`title:` を省略した場合は、既定のタイトル `時系列ワークフロー` が使われます。

## lane

レーンを上から順に定義します。

```workflow
lane: 受付
lane: 調査
lane: 復旧
```

同じレーン名を複数回定義することはできません。

## node

ノードは、ID、表示名、所属レーンを指定します。

```workflow
node a1: 問い合わせ受付 (lane: 受付)
```

形式は次の通りです。

```workflow
node id: 表示名 (lane: レーン名)
```

ノードIDに使える文字は、半角英数字、`_`、`-` です。

```workflow
node step-1: 作成 (lane: 申請者)
node review_1: 確認 (lane: 承認者)
```

同じノードIDを複数回定義することはできません。ノードが参照するレーンは、先に `lane:` で定義しておく必要があります。

## edge

実線の矢印は `->` で書きます。

```workflow
a1 -> a2
```

点線の矢印は `-.->` で書きます。

```workflow
a2 -.-> a4
```

矢印の両端には、定義済みのノードIDを指定します。

## チェーン

連続する依存関係は、1行にまとめて書けます。

```workflow
a1 -> a2 -> b1 -> b2
```

これは次と同じ意味です。

```workflow
a1 -> a2
a2 -> b1
b1 -> b2
```

## コメント

`#` 以降はコメントとして扱われます。

```workflow
lane: 申請者 # 上段のレーン
node a1: 作成 (lane: 申請者) # 最初の作業
```

## エラー例

レーン名が空の場合:

```workflow
lane:
```

ノードの形式が違う場合:

```workflow
node a1 作成 lane: 申請者
```

未定義レーンを参照した場合:

```workflow
lane: 申請者
node a1: 作成 (lane: 承認者)
```

未定義ノードへ矢印を引いた場合:

```workflow
lane: 申請者
node a1: 作成 (lane: 申請者)
a1 -> a2
```

循環依存がある場合:

```workflow
lane: main
node a: A (lane: main)
node b: B (lane: main)
a -> b
b -> a
```

循環依存があると時系列の横位置を決められないため、DAGになるように矢印を見直してください。

## PowerPointで使う流れ

1. EngineでDSLを書く
2. プレビューで図を確認する
3. SVGをダウンロードする
4. PowerPointへドラッグ&ドロップする
5. スライド上でサイズを調整する
