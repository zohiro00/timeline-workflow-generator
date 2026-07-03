# 時系列ワークフロー図ジェネレーター

依存関係ベースでレーン型タイムラインSVGを生成するWebアプリです。Markdown内の `workflow` コードブロック、またはMarkdown本文を入力すると、ノードの依存関係から時間軸の `gridX` を自動計算してSVGを描画します。

ExcelやPowerPointで図形を並べる代わりに、作業、レーン、依存関係をテキストで書いて、資料に貼りやすいSVGを生成できます。稟議、申請、発注、障害対応、開発工程など、順序と担当レーンがある業務フローの下書きに向いています。

![Engine画面のスクリーンショット](docs/assets/engine-desktop.png)

## Features

- `## lanes`、`## nodes`、`## workflow` を使うMarkdownワークフロー記法
- Markdown内の `workflow` コードブロック抽出
- DAGの最長経路法による時系列グリッド計算
- レーンと時間軸を固定したSVGレンダリング
- 同一レーンは直線、レーン跨ぎや逆行はCubic Bezierで描画
- Viteによるローカルプレビュー

## Getting Started

```bash
pnpm install
pnpm run dev
```

テスト:

```bash
pnpm test
```

ビルド:

```bash
pnpm run build
```

## Usage

1. Engineを開く
2. Markdownワークフローを書く、またはMarkdown内の `workflow` コードブロックを貼り付ける
3. プレビューでレーン、時系列、依存関係を確認する
4. SVGをダウンロードする
5. PowerPointへドラッグ&ドロップする

## Workflow Example

````markdown
```workflow
# 申請ワークフローの時系列図

## lanes
- a: a申請
- b: b申請
- c: c申請

## nodes
- a
  - a1: 作成
  - a2: 承認
  - a3: 保留
  - a4: 取消
- b
  - b1: 作成
  - b2: 承認

## workflow
- a1 -> a2
- a2 -> b1
- b1 -> b2
- b1 -.-> a4
- a2 -> a3 -> a4
```
````

ワークフロー記法の詳しい仕様、エラー例、PowerPointでの使い方は [docs/dsl.md](docs/dsl.md) を参照してください。

## Project Structure

- `src/workflow.js`: parser, DAG layout engine, SVG renderer
- `src/main.js`: browser UI
- `test/workflow.test.js`: parser/layout/rendering tests

## Later

VS Code拡張化を見据えて、コア処理はDOMに依存しない純粋なJavaScriptモジュールとして分離しています。

## Cloudflare Workers への公開

このリポジトリは、GitHub Actions から Cloudflare Workers Assets へ `dist/` をデプロイします。
詳しい手順とトラブルシュートは [docs/development/cloudflare-workers-deploy.md](docs/development/cloudflare-workers-deploy.md) を参照してください。

### 初回セットアップ

1. Cloudflare ダッシュボードで API トークンを発行する
   - テンプレートは `Edit Cloudflare Workers`、または Workers の編集権限を付与
2. Cloudflare ダッシュボードで Account ID を確認する
3. GitHub リポジトリの `Settings` → `Secrets and variables` → `Actions` に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を追加する
4. Cloudflare Workers 側で `timeline-workflow-generator` の custom domain を設定する

### デプロイ

`main` ブランチへマージされると、`.github/workflows/deploy-workers.yml` が以下を実行して公開します。

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

Actions タブから `Deploy to Cloudflare Workers` を手動実行することもできます。
