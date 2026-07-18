# Timeline Workflow Preview

[English](README.md) | 日本語

Markdownの `workflow` コードブロックから、時系列ワークフロー図をVS Code内でライブプレビューする拡張機能です。

Markdownを編集したときや、別のMarkdownファイルへ切り替えたときにプレビューが自動更新されます。表示文言はVS Codeの表示言語に合わせて日本語または英語になります。

## 使い方

1. Markdownファイルを開きます。
2. `workflow` コードブロックを追加します。
3. コマンドパレットから **Timeline Workflow: プレビューを開く** を実行するか、エディタータイトルのプレビューアイコンを選びます。
4. Markdownを編集し、横に表示されるライブプレビューを確認します。

## 記述例

````markdown
```workflow
# 購買申請

## lanes
- requester: 申請者
- manager: 上長
- finance: 経理

## nodes
- requester
  - draft: 申請作成
- manager
  - review: 承認
- finance
  - budget: 予算確認

## workflow
- draft -> review -> budget
```
````

## 現在の制約

- アクティブなMarkdown内の先頭の `workflow` ブロックだけを表示します。
- ExportはWebアプリで利用できます。拡張機能からは利用できません。
- シンタックスハイライトと入力補完は含まれません。
- バージョン0.2.0ではVS Code for the Webをサポートしません。

PPTX、SVG、PNG、画像コピーには[Webアプリ](https://timeline-workflow-generator.tomokiku0998.workers.dev/)を利用してください。
