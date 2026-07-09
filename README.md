# 時系列ワークフロー図ジェネレーター

依存関係ベースでレーン型タイムラインSVGを生成するWebアプリです。Markdown内の `workflow` コードブロック、またはMarkdown本文を入力すると、ノードの依存関係から時間軸の `gridX` を自動計算してSVGを描画します。

ExcelやPowerPointで図形を並べる代わりに、作業、レーン、依存関係をテキストで書いて、資料に貼りやすいSVGを生成できます。稟議、申請、発注、障害対応、開発工程など、順序と担当レーンがある業務フローの下書きに向いています。

![Engine画面のスクリーンショット](docs/assets/engine-desktop.png)

## Features

- `## lanes`、`## nodes`、`## workflow` を使うMarkdownワークフロー記法
- Markdown内の `workflow` コードブロック抽出
- DAGの最長経路法による時系列グリッド計算
- レーンと時間軸を固定したSVGレンダリング
- 実線、点線、中止マーク、見えない依存によるワークフロー表現
- 配色プリセット、ノード幅、レーン間隔、プレビュー倍率の調整
- SVG / PNG ダウンロードと画像コピー
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
4. ExportからSVG / PNGをダウンロードする、または画像としてコピーする
5. PowerPointなどの資料へ貼り付ける

## Workflow Example

````markdown
```workflow
# 購買申請ワークフロー

## lanes
- requester: 申請者
- manager: 上長
- finance: 経理
- purchasing: 購買

## nodes
- requester
  - draft: 申請作成
  - revise: 差戻し対応
  - received: 納品確認
- manager
  - review: 上長承認
  - rejected: 却下
- finance
  - budget: 予算確認
  - over_budget: 予算NG
- purchasing
  - order: 発注処理

## workflow
- draft -> review
- review -.-> revise
- review -x- rejected
- review -> budget -> order -> received
- budget .x. over_budget
- revise ~> budget
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
