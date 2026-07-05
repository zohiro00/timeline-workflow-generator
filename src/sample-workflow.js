export const sampleWorkflowSource = `# 購買申請ワークフロー

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
- revise ~> budget`;

export const starterWorkflowSource = `# ワークフロー名

## lanes
- lane1: レーン1
- lane2: レーン2

## nodes
- lane1
  - node1: ノード1
- lane2
  - node2: ノード2

## workflow
- node1 -> node2`;

export const starterWorkflowCallout = Object.freeze({
  actionLabel: "雛形から始める",
  actionTooltip: "雛形から始める",
  message: "雛形から始める",
  dismissLabel: "案内を閉じる",
});

export const workflowExamples = [
  {
    id: "purchase",
    title: "購買申請",
    description: "申請作成から承認、予算確認、発注まで",
    source: sampleWorkflowSource,
  },
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
