# 戻り線の利用例

[English](annotation-examples.en.md) | 日本語

`### annotations` は、通常の依存関係で決まる時系列を変えずに、失敗、差戻し、再試行などの戻りを重ねて表示します。

## 1. コードレビュー

```workflow
# コードレビュー

## lanes
- development: 開発
- review: レビュー
- delivery: 納品

## nodes
- development
  - generate: コード生成
- review
  - inspect: レビュー
- delivery
  - deliver: 納品

## workflow
- generate -> inspect -> deliver

### annotations
- generate <- inspect
```

## 2. 申請の差戻し

```workflow
# 申請の差戻し

## lanes
- applicant: 申請者
- approver: 承認者

## nodes
- applicant
  - draft: 申請作成
  - complete: 完了確認
- approver
  - review: 申請確認

## workflow
- draft -> review -> complete

### annotations
- draft <- review
```

## 3. テスト失敗時の再実装

```workflow
# テストと再実装

## lanes
- development: 開発
- qa: QA
- operations: 運用

## nodes
- development
  - implement: 実装
- qa
  - test: テスト
- operations
  - release: リリース

## workflow
- implement -> test -> release

### annotations
- implement <- test
```

## 4. バッチ検証の再試行

```workflow
# バッチ処理

## lanes
- system: システム
- operator: 運用担当

## nodes
- system
  - prepare: データ準備
  - process: バッチ実行
  - finish: 完了
- operator
  - validate: 結果確認

## workflow
- prepare -> process -> validate -> finish

### annotations
- process <- validate
```

## 5. 複数段階の修正

```workflow
# コンテンツ公開

## lanes
- author: 執筆
- editor: 編集
- legal: 法務
- web: Web

## nodes
- author
  - write: 原稿作成
- editor
  - edit: 編集確認
- legal
  - legal_review: 法務確認
- web
  - publish: 公開

## workflow
- write -> edit -> legal_review -> publish

### annotations
- write <- edit
- edit <- legal_review
```
