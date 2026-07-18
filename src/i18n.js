export const supportedLocales = Object.freeze(["ja", "en"]);
export const localeStorageKey = "timeline-workflow.locale";

const englishMessages = new Map(Object.entries({
  "時系列ワークフロー図ジェネレーター": "Timeline Workflow Generator",
  "言語を変更": "Change language",
  "トップへ": "Home",
  "Markdownから、": "Turn Markdown into ",
  "PowerPointで": "an editable PowerPoint ",
  "編集できる": "with an automatically generated ",
  "時系列ワークフロー図": "timeline workflow diagram",
  "を自動生成": "",
  "業務の流れを": " describe your workflow. ",
  "書くだけで、": "",
  "レーン、時系列、": "Lanes, timeline steps, and ",
  "依存関係を自動整列。": "dependencies are aligned automatically. ",
  "図形とコネクタを": "Export editable shapes and connectors ",
  "編集できるPPTXのほか、": "as PPTX, or use ",
  "SVG / PNG / 画像コピーで": "SVG, PNG, and image copy ",
  "出力できます。": "for your documents.",
  "Engineを開く": "Open Engine",
  "VS Codeでライブプレビュー": "Live preview in VS Code",
  "申請": "Request",
  "受付": "Desk",
  "作成": "Create",
  "承認": "Approve",
  "完了": "Done",
  "- req: 申請": "- req: Request",
  "- desk: 受付": "- desk: Desk",
  "- a1: 作成": "- a1: Create",
  "- a2: 承認": "- a2: Approve",
  "- b1: 完了": "- b1: Done",
  "レーン型タイムラインSVGの生成例": "Generated lane-based timeline SVG example",
  "依存関係から時系列位置を自動整列": "Automatically align timeline positions from dependencies",
  "出力形式": "Export formats",
  "図形を動かすたびに、": "Stop rearranging shapes every time ",
  "ワークフロー": "the workflow ",
  "の説明が止まってしまう": "changes",
  "業務フロー図": "workflow diagram",
  "PowerPointやExcelで": "When you build a ",
  "を作ると、ノードを1つ増やすだけで、矢印、余白、レーン位置、 時系列の見え方を手で直す必要があります。レビューで順番が変わるたびに、図の整列作業もやり直しになります。": " in PowerPoint or Excel, adding one node means manually fixing arrows, spacing, lanes, and the timeline. Every review that changes the order creates more alignment work.",
  "PowerPointやExcelで 業務フロー図 を作ると、ノードを1つ増やすだけで、矢印、余白、レーン位置、 時系列の見え方を手で直す必要があります。レビューで順番が変わるたびに、図の整列作業もやり直しになります。": "When a workflow diagram is built in PowerPoint or Excel, adding one node means manually fixing arrows, spacing, lanes, and the timeline. Every review that changes the order creates more alignment work.",
  "流れをテキストで書けば、": "Describe the flow as text and ",
  "依存関係": "dependencies ",
  "から時系列を自動でそろえる": "align the timeline automatically",
  "Timeline Workflow Generatorは、レーン、ノード、 依存関係 をMarkdownで受け取り、 DAGレイアウトで横方向の時系列位置を計算します。座標を指定せずに図を整え、編集可能なPPTXへそのまま出力できます。": "Timeline Workflow Generator reads lanes, nodes, and dependencies from Markdown. Its DAG layout calculates horizontal timeline positions without coordinates and exports an editable PPTX.",
  "Timeline Workflow Generatorは、レーン、ノード、": "Timeline Workflow Generator reads lanes, nodes, and ",
  "をMarkdownで受け取り、 DAGレイアウトで横方向の時系列位置を計算します。座標を指定せずに図を整え、編集可能なPPTXへそのまま出力できます。": "from Markdown. Its DAG layout calculates horizontal timeline positions without coordinates and exports an editable PPTX.",
  "主な特徴": "Key features",
  "Markdownで素早く編集": "Edit quickly in Markdown",
  "リスト継続、インデント、行移動の入力補助とサンプルで、ワークフローを素早く組み立てられます。": "Build workflows quickly with list continuation, indentation, line movement, and ready-to-use examples.",
  "プレビューで自動整列": "Automatic preview alignment",
  "依存関係から時系列をそろえ、配色、間隔、時間ラベル、長いラベルの表示を調整できます。": "Align the timeline from dependencies and adjust colors, spacing, time labels, and long-label handling.",
  "PowerPointで編集できるPPTX": "Editable PowerPoint output",
  "ノード図形と標準コネクタを編集できるPPTXを出力。SVG / PNG / 画像コピーにも対応します。": "Export editable node shapes and standard connectors in PPTX, plus SVG, PNG, and image copy.",
  "3ステップで作成": "Create in three steps",
  "Markdownを書く": "Write Markdown",
  "レーン、ノード、依存関係を workflow 記法で入力します。": "Describe lanes, nodes, and dependencies with workflow syntax.",
  "プレビューで確認": "Check the preview",
  "自動整列されたタイムラインを見ながら、配色や間隔、ラベル表示を調整します。": "Review the aligned timeline and adjust colors, spacing, and labels.",
  "PPTX / SVG / PNGで出力": "Export PPTX / SVG / PNG",
  "PowerPointで編集するか、画像として資料へ貼り付けるかを用途に合わせて選べます。": "Choose an editable PowerPoint or an image ready to paste into a document.",
  "順序と担当レーンがある": "For processes with an order and ",
  "業務の下書き": "responsible lanes",
  "に": "",
  "稟議・申請": "Approvals and requests",
  "申請者、承認者、経理などのレーンを分けて、承認経路や差戻しを整理できます。": "Separate requester, approver, and finance lanes to clarify approvals and revisions.",
  "購買・発注": "Purchasing and ordering",
  "見積、承認、発注、納品確認までの担当と順序を1枚の流れにできます。": "Show ownership and order from quotation and approval through ordering and delivery.",
  "障害対応・開発工程": "Incident and development flows",
  "調査、判断、対応、確認の依存関係を時系列で共有できます。": "Share dependencies among investigation, decisions, actions, and verification on a timeline.",
  "よくある不安": "Frequently asked questions",
  "PowerPointで使えますか？": "Can I use it in PowerPoint?",
  "PPTXで出力すると、ノード図形とコネクタをPowerPoint上で編集できます。SVG / PNG の貼り付けや画像コピーも選べます。": "PPTX output keeps node shapes and connectors editable in PowerPoint. You can also paste SVG or PNG, or copy an image.",
  "Markdown本文から抽出できますか？": "Can it read a Markdown document?",
  "Markdown内の workflow コードブロック、または workflow 記法の本文を入力できます。": "You can enter a workflow code block from Markdown or the workflow source itself.",
  "座標を手で調整する必要はありますか？": "Do I need to adjust coordinates?",
  "横位置は依存関係から計算します。ユーザーが座標や余白を細かく指定する必要はありません。": "Horizontal positions are calculated from dependencies. You do not need to specify coordinates or fine-tune spacing.",
  "登録なしで試せますか？": "Can I try it without registering?",
  "登録フォームはありません。Engineを開いて、サンプルからすぐに試せます。": "No registration is required. Open the Engine and start with an example.",
  "まずはサンプルから、": "Start with an example and create a ",
  "を作る": "",
  "VS Code拡張": "VS Code extension",
  "配色プリセット": "Color preset",
  "資料向けのSVG配色テーマ": "SVG color theme for documents",
  "濃い青 / 枠線": "Dark blue / Outline",
  "濃い青 / 塗りつぶし": "Dark blue / Fill",
  "灰色 / 枠線": "Gray / Outline",
  "灰色 / 塗りつぶし": "Gray / Fill",
  "自動プレビュー": "Automatic preview",
  "入力と同時にSVGを更新": "Update the SVG while typing",
  "時間軸の間隔": "Timeline spacing",
  "ノード間の横方向スペース": "Horizontal space between nodes",
  "レーンの高さ": "Lane height",
  "レーン同士の縦方向スペース": "Vertical space between lanes",
  "時間ラベル": "Time labels",
  "Step 1, Step 2 などのラベルを表示": "Show labels such as Step 1 and Step 2",
  "ノード幅": "Node width",
  "各ノードの表示幅": "Display width of each node",
  "ノード高さ": "Node height",
  "各ノードの表示高さ": "Display height of each node",
  "ラベル表示": "Label fitting",
  "長いラベルの収め方": "How to fit long labels",
  "自動改行を優先": "Prefer wrapping",
  "文字縮小を優先": "Prefer shrinking",
  "設定を既定値に戻す": "Restore default settings",
  "入力を整形": "Format input",
  "検索と置換": "Find and replace",
  "置換欄を表示": "Show replace field",
  "検索": "Find",
  "前の一致": "Previous match",
  "次の一致": "Next match",
  "検索を閉じる": "Close search",
  "置換": "Replace",
  "現在の一致を置換": "Replace current match",
  "すべて置換": "Replace all",
  "該当なし": "No results",
  "エディターとプレビューのサイズ変更": "Resize editor and preview",
  "プレビューを縮小": "Zoom out preview",
  "現在のプレビュー倍率": "Current preview zoom",
  "プレビューを拡大": "Zoom in preview",
  "プレビュー倍率をリセット": "Reset preview zoom",
  "diagramを最大化": "Maximize diagram",
  "diagram最大化を解除": "Restore diagram",
  "画像をコピー": "Copy image",
  "PNGでダウンロード": "Download PNG",
  "PPTXでダウンロード": "Download PPTX",
  "SVGでダウンロード": "Download SVG",
  "入力にエラーがあります。前回成功時のプレビューを表示しています。": "The input has an error. Showing the last successful preview.",
  "構文を確認してください": "Check the syntax",
  "1件置換しました": "Replaced 1 match",
  "入力を整形しました": "Formatted input",
  "整形済みです": "Input is already formatted",
  "このブラウザでは画像コピーに対応していません。": "This browser does not support copying images.",
  "PNGに変換できるプレビューがありません。": "There is no preview to convert to PNG.",
  "PNG変換用のcanvasを初期化できません。": "Could not initialize the canvas for PNG conversion.",
  "PNG画像を生成できません。": "Could not generate the PNG image.",
  "SVGをPNGに変換できません。": "Could not convert the SVG to PNG.",
  "Preview updated": "Preview updated",
  "Preview not updated": "Preview not updated",
  "PNG downloaded": "PNG downloaded",
  "Image copied": "Image copied",
  "PPTX downloaded": "PPTX downloaded",
  "Export failed": "Export failed",
  "Ready": "Ready",
  "雛形から始める": "Start from template",
  "案内を閉じる": "Dismiss hint",
  "記法ガイド": "Syntax guide",
  "記法ガイドを閉じる": "Close syntax guide",
  "レーン、ノード、つながりの3つを順に定義します。": "Define lanes, nodes, and connections in that order.",
  "基本構造": "Basic structure",
  "# タイトル": "# Title",
  "図のタイトル": "Diagram title",
  "- laneId: レーン名": "- laneId: Lane name",
  "の下に、2スペース下げて": "indent two spaces beneath it and write",
  "- nodeId: ノード名": "- nodeId: Node name",
  "の形式でつながりを定義": "to define a connection",
  "IDには半角英数字、_、-を使用できます。": "IDs can contain ASCII letters, numbers, underscores, and hyphens.",
  "つながりの記法": "Connection syntax",
  "通常の流れ": "Standard flow",
  "実線の矢印を描きます。": "Draws a solid arrow.",
  "点線の流れ": "Dotted flow",
  "点線の矢印を描きます。": "Draws a dotted arrow.",
  "点線の依存": "Dotted dependency",
  "矢印のない点線を描きます。": "Draws a dotted line without an arrow.",
  "中止・却下": "Stopped or rejected",
  "線の終端手前に×を描きます。": "Draws a cross near the end of the line.",
  "点線の中止・却下": "Dotted stopped or rejected",
  "点線の終端手前に×を描きます。": "Draws a cross near the end of the dotted line.",
  "順序だけ指定": "Order only",
  "線を描かず、bをaより後に配置します。": "Draws no line and places b after a on the timeline.",
  "その他": "More syntax",
  "のように、つながりを1行にまとめられます。": "chains connections on one line.",
  "- nodeId [highlight]: ノード名": "- nodeId [highlight]: Node name",
  "で、1つのノードを強調できます。": "highlights one node.",
  "すべての記法を見る": "View all syntax",
  "購買申請": "Purchase request",
  "申請作成から承認、予算確認、発注まで": "From request creation through approval, budget review, and ordering",
  "稟議・承認": "Approval flow",
  "申請から承認、差戻し、発注まで": "From request through approval, revision, and ordering",
  "採用選考": "Hiring process",
  "応募受付から面接、内定、入社準備まで": "From application through interviews, offer, and onboarding",
  "障害対応": "Incident response",
  "検知から一次対応、復旧、ふりかえりまで": "From detection through response, recovery, and review",
}));

const englishErrorMessages = Object.freeze({
  "title.empty": "The title is empty.",
  "section.invalid": "Use one of these sections: `## lanes`, `## nodes`, or `## workflow`.",
  "section.required-context": "Write this line inside a `## lanes`, `## nodes`, or `## workflow` section.",
  "lane.syntax": "Write a lane as `- laneId: Lane name`.",
  "lane.name-empty": "The lane name is empty.",
  "lane.id-duplicate": "Lane ID \"{id}\" is duplicated.",
  "node.lane-context": "Write the node under its lane.",
  "node.name-empty": "The node name is empty.",
  "node.id-duplicate": "Node ID \"{id}\" is duplicated.",
  "node.attribute-unsupported": "Node attribute \"{attribute}\" is not supported. The available attribute is `{supported}`.",
  "node.highlight-duplicate": "Only one node per workflow can use `{attribute}`. Node \"{id}\" is already highlighted.",
  "nodes.syntax": "Write nodes as `- laneId` followed by `  - nodeId: Node name`.",
  "workflow.syntax": "Write workflow entries as `- a -> b`.",
  "line.unrecognized": "This line could not be interpreted.",
  "graph.cycle": "The dependencies contain a cycle. Update the arrows so the graph is a DAG.",
  "edge.syntax": "Write a dependency in one of these forms: `{usage}`.",
  "edge.endpoint-invalid": "Specify a node ID at both ends of the arrow.",
  "section.lanes-missing": "Define a `## lanes` section.",
  "section.nodes-missing": "Define a `## nodes` section.",
  "section.workflow-missing": "Define a `## workflow` section.",
  "lane.none": "Define at least one lane.",
  "node.lane-undefined": "Lane \"{laneId}\" for node \"{id}\" is not defined.",
  "edge.from-undefined": "The edge start node \"{id}\" is not defined.",
  "edge.to-undefined": "The edge end node \"{id}\" is not defined.",
});

const japaneseMessages = new Map(Object.entries({
  "Problem": "課題",
  "Solution": "解決方法",
  "Features": "特徴",
  "Steps": "使い方",
  "Use Cases": "利用例",
  "FAQ": "よくある質問",
  "Try It": "試してみる",
  "Style": "スタイル",
  "Canvas": "キャンバス",
  "Nodes": "ノード",
  "Settings": "設定",
  "Example Workflows": "ワークフロー例",
  "Export": "出力",
  "Ready": "準備完了",
  "Preview updated": "プレビューを更新しました",
  "Preview not updated": "プレビューを更新できませんでした",
  "PNG downloaded": "PNGをダウンロードしました",
  "Image copied": "画像をコピーしました",
  "PPTX downloaded": "PPTXをダウンロードしました",
  "Export failed": "出力に失敗しました",
  "Copy image": "画像をコピー",
}));

const originalText = new WeakMap();
const originalAttributes = new WeakMap();

export function normalizeLocale(value) {
  return String(value ?? "").toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function resolveLocale({ storage = globalThis.localStorage, languages = globalThis.navigator?.languages } = {}) {
  let stored = null;
  try {
    stored = storage?.getItem(localeStorageKey);
  } catch {
    stored = null;
  }
  if (supportedLocales.includes(stored)) return stored;
  return normalizeLocale(languages?.[0]);
}

export function persistLocale(locale, storage = globalThis.localStorage) {
  if (!supportedLocales.includes(locale)) return;
  try {
    storage?.setItem(localeStorageKey, locale);
  } catch {
    // The UI still switches when storage is unavailable.
  }
}

export function translate(source, locale, params = {}) {
  const normalizedSource = normalizeMessage(source);
  const template = locale === "en"
    ? (englishMessages.get(normalizedSource) ?? source)
    : (japaneseMessages.get(normalizedSource) ?? source);
  return interpolate(template, params);
}

export function formatWorkflowError(error, locale) {
  if (locale !== "en") return error.message;
  const template = englishErrorMessages[error.code];
  if (!template) return error.message;
  const message = interpolate(template, error.params);
  return error.line == null ? message : `Line ${error.line}: ${message}`;
}

export function workflowLocaleOptions(locale) {
  return {
    defaultTitle: locale === "ja" ? "時系列ワークフロー" : "Timeline Workflow",
    formatTimeLabel: (stepNumber) => locale === "ja" ? `ステップ ${stepNumber}` : `Step ${stepNumber}`,
  };
}

export function localizeRoot(root, locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.parentElement?.closest("[data-i18n-ignore]")
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT,
  });
  let node = walker.nextNode();
  while (node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    const trimmed = source.trim();
    if (trimmed) node.nodeValue = source.replace(trimmed, translate(trimmed, locale));
    node = walker.nextNode();
  }

  const attributes = ["aria-label", "data-tooltip", "placeholder", "title"];
  root.querySelectorAll("*").forEach((element) => {
    if (element.closest("[data-i18n-ignore]")) return;
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    attributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      if (!originals.has(attribute)) originals.set(attribute, element.getAttribute(attribute));
      element.setAttribute(attribute, translate(originals.get(attribute), locale));
    });
  });
}

function normalizeMessage(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function interpolate(template, params) {
  return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
