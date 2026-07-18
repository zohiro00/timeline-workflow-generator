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

export const sampleWorkflowSourceEn = `# Purchase Request Workflow

## lanes
- requester: Requester
- manager: Manager
- finance: Finance
- purchasing: Purchasing

## nodes
- requester
  - draft: Create request
  - revise: Revise request
  - received: Confirm delivery
- manager
  - review: Manager review
  - rejected: Rejected
- finance
  - budget: Check budget
  - over_budget: Over budget
- purchasing
  - order: Place order

## workflow
- draft -> review
- review -.-> revise
- review -x- rejected
- review -> budget -> order -> received
- budget .x. over_budget
- revise ~> budget`;

export const starterWorkflowSourceEn = `# Workflow name

## lanes
- lane1: Lane 1
- lane2: Lane 2

## nodes
- lane1
  - node1: Node 1
- lane2
  - node2: Node 2

## workflow
- node1 -> node2`;

const workflowExamplesEn = [
  {
    id: "purchase",
    title: "Purchase request",
    description: "From request creation through approval, budget review, and ordering",
    source: sampleWorkflowSourceEn,
  },
  {
    id: "approval",
    title: "Approval flow",
    description: "From request through approval, revision, and ordering",
    source: `# Approval Workflow

## lanes
- requester: Requester
- manager: Manager
- finance: Finance
- purchasing: Purchasing

## nodes
- requester
  - draft: Create request
  - revise: Revise request
  - done: Completion notice
- manager
  - review: Manager review
- finance
  - budget: Check budget
- purchasing
  - order: Place order

## workflow
- draft -> review
- review -.-> revise
- review -> budget
- revise -> budget
- budget -> order -> done`,
  },
  {
    id: "hiring",
    title: "Hiring process",
    description: "From application through interviews, offer, and onboarding",
    source: `# Hiring Workflow

## lanes
- recruiting: Recruiting
- interviewer: Interviewer
- candidate: Candidate
- hr: HR

## nodes
- recruiting
  - apply: Receive application
  - screen: Screen application
  - offer: Send offer
- interviewer
  - interview: First interview
  - final: Final interview
- candidate
  - accept: Accept offer
- hr
  - onboarding: Prepare onboarding

## workflow
- apply -> screen -> interview -> final -> offer
- offer -> accept -> onboarding`,
  },
  {
    id: "incident",
    title: "Incident response",
    description: "From detection through response, recovery, and review",
    source: `# Incident Response Workflow

## lanes
- monitoring: Monitoring
- sre: SRE
- dev: Development
- support: Support

## nodes
- monitoring
  - alert: Detect alert
- sre
  - triage: Assess impact
  - workaround: Apply workaround
  - review: Retrospective
- dev
  - fix: Release fix
- support
  - notify: Notify customers

## workflow
- alert -> triage
- triage -> workaround -> notify
- triage -> fix -> notify
- notify -> review`,
  },
];

const starterWorkflowCalloutEn = Object.freeze({
  actionLabel: "Start from template",
  actionTooltip: "Start from template",
  message: "Start from template",
  dismissLabel: "Dismiss hint",
});

export function getSampleWorkflowSource(locale) {
  return locale === "ja" ? sampleWorkflowSource : sampleWorkflowSourceEn;
}

export function getStarterWorkflowSource(locale) {
  return locale === "ja" ? starterWorkflowSource : starterWorkflowSourceEn;
}

export function getStarterWorkflowCallout(locale) {
  return locale === "ja" ? starterWorkflowCallout : starterWorkflowCalloutEn;
}

export function getWorkflowExamples(locale) {
  return locale === "ja" ? workflowExamples : workflowExamplesEn;
}
