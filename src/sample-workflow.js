export const sampleWorkflowSource = `title: 申請ワークフローの時系列図

lane: a申請
lane: b申請
lane: c申請

node a1: 作成 (lane: a申請)
node a2: 承認 (lane: a申請)
node a3: 保留 (lane: a申請)
node a4: 取消 (lane: a申請)
node b1: 作成 (lane: b申請)
node b2: 承認 (lane: b申請)

a1 -> a2
a2 -> b1
b1 -> b2
b1 -.-> a4
a2 -> a3 -> a4`;

export const workflowExamples = [
  {
    id: "approval",
    title: "稟議・承認",
    description: "申請から承認、差戻し、発注まで",
    source: `title: 稟議・承認ワークフロー

lane: 申請者
lane: 上長
lane: 経理
lane: 購買

node draft: 稟議作成 (lane: 申請者)
node review: 上長確認 (lane: 上長)
node revise: 差戻し対応 (lane: 申請者)
node budget: 予算確認 (lane: 経理)
node order: 発注処理 (lane: 購買)
node done: 完了連絡 (lane: 申請者)

draft -> review
review -.-> revise
review -> budget
revise -> budget
budget -> order -> done`,
  },
  {
    id: "hiring",
    title: "採用選考",
    description: "応募受付から面接、内定、入社準備まで",
    source: `title: 採用選考ワークフロー

lane: 採用担当
lane: 現場面接官
lane: 候補者
lane: 人事労務

node apply: 応募受付 (lane: 採用担当)
node screen: 書類選考 (lane: 採用担当)
node interview: 一次面接 (lane: 現場面接官)
node final: 最終面接 (lane: 現場面接官)
node offer: 内定連絡 (lane: 採用担当)
node accept: 承諾 (lane: 候補者)
node onboarding: 入社準備 (lane: 人事労務)

apply -> screen -> interview -> final -> offer
offer -> accept -> onboarding`,
  },
  {
    id: "incident",
    title: "障害対応",
    description: "検知から一次対応、復旧、ふりかえりまで",
    source: `title: 障害対応ワークフロー

lane: 監視
lane: SRE
lane: 開発
lane: サポート

node alert: アラート検知 (lane: 監視)
node triage: 影響確認 (lane: SRE)
node workaround: 暫定対応 (lane: SRE)
node fix: 修正リリース (lane: 開発)
node notify: 顧客連絡 (lane: サポート)
node review: ふりかえり (lane: SRE)

alert -> triage
triage -> workaround -> notify
triage -> fix -> notify
notify -> review`,
  },
];
