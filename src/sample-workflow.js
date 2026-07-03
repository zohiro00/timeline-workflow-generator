export const sampleWorkflowSource = `# 申請ワークフローの時系列図

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
- a2 -> a3 -> a4`;

export const workflowExamples = [
  {
    id: "approval",
    title: "稟議・承認",
    description: "申請から承認、差戻し、発注まで",
    source: `# 稟議・承認ワークフロー

## lanes
- requester: 申請者
- manager: 上長
- finance: 経理
- purchasing: 購買

## nodes
- requester
  - draft: 稟議作成
  - revise: 差戻し対応
  - done: 完了連絡
- manager
  - review: 上長確認
- finance
  - budget: 予算確認
- purchasing
  - order: 発注処理

## workflow
- draft -> review
- review -.-> revise
- review -> budget
- revise -> budget
- budget -> order -> done`,
  },
  {
    id: "hiring",
    title: "採用選考",
    description: "応募受付から面接、内定、入社準備まで",
    source: `# 採用選考ワークフロー

## lanes
- recruiting: 採用担当
- interviewer: 現場面接官
- candidate: 候補者
- hr: 人事労務

## nodes
- recruiting
  - apply: 応募受付
  - screen: 書類選考
  - offer: 内定連絡
- interviewer
  - interview: 一次面接
  - final: 最終面接
- candidate
  - accept: 承諾
- hr
  - onboarding: 入社準備

## workflow
- apply -> screen -> interview -> final -> offer
- offer -> accept -> onboarding`,
  },
  {
    id: "incident",
    title: "障害対応",
    description: "検知から一次対応、復旧、ふりかえりまで",
    source: `# 障害対応ワークフロー

## lanes
- monitoring: 監視
- sre: SRE
- dev: 開発
- support: サポート

## nodes
- monitoring
  - alert: アラート検知
- sre
  - triage: 影響確認
  - workaround: 暫定対応
  - review: ふりかえり
- dev
  - fix: 修正リリース
- support
  - notify: 顧客連絡

## workflow
- alert -> triage
- triage -> workaround -> notify
- triage -> fix -> notify
- notify -> review`,
  },
];
