# Engine/Top/README 精密監査

実施日: 2026-07-04
対象ブランチ: `codex/audit-engine-readme-tests`
基準: 最新 `origin/main`

## 結論

- P1: README のスクリーンショットが現行 engine と一致していない。`docs/assets/engine-desktop.png` は旧 UI のままで、`pnpm run capture:engine` が生成する `artifacts/ui-captures/engine-desktop.png` と SHA も表示内容も異なる。
- P1: README の Feature と Workflow Example が最新 DSL に追従していない。現行 DSL は `-x-`、`.x.`、`~>` を扱うが、README は実線/点線までの説明と旧サンプルに留まっている。
- P2: top ページの説明は大きく破綻していないが、engine の現行サンプルが表現する cross/invisible edge を訴求していない。新機能の認知経路としては弱い。
- P2: `src/main.js` に UI 構築、設定 schema、状態、イベント登録、プレビュー制御、リサイズ制御が集中している。直ちに壊れてはいないが、設定追加時の変更理由が増えやすい。
- P2: SVG レンダリング既定値が `src/main.js` と `src/workflow.js` に重複している。今後の寸法変更時に UI 既定値と API 既定値がずれるリスクがある。
- P3: UI テストは今回の連続実行では安定していた。ただし `networkidle`、固定ポート、mouse drag、`boundingBox()` 判定は将来のフレイキー要因なので、次の UI 改修時に改善する。

## 監査結果

### engine と top の追従

- `/` と `/engine` を desktop/mobile で表示確認した。横方向 overflow は `top-desktop`、`top-mobile`、`engine-desktop`、`engine-mobile` の全てで 0 件だった。
- top の CTA と engine への導線は有効。モバイルでも大きな重なりは確認されなかった。
- top の demo は `->` の単純な依存だけを見せている。現行 engine の初期サンプルは `-.->`、`-x-`、`.x.`、`~>` を含むため、top は最新表現に完全には追従していない。
- top の Feature「設定拡張前提」は、現行 engine に既に配色プリセット、自動プレビュー、Canvas、Nodes、ズーム、サンプル適用、SVG ダウンロードがある状態と比べると少し古い。次回は「矢印種別」「配色プリセット」「ズーム/レイアウト調整」のように現行機能を直接説明する。

### README とスクリーンショット

- README は `docs/assets/engine-desktop.png` を参照している。
- `pnpm run capture:engine` は `artifacts/ui-captures/engine-desktop.png` を生成する。
- SHA:
  - `docs/assets/engine-desktop.png`: `bcfc6898a5a5e4b597849c57bb204ca7c285e505858eab7b290494a6ea08c7fa`
  - `artifacts/ui-captures/engine-desktop.png`: `5e2fa1b26d925d575f054a04ad69d6532c0f097da224fc2f375a46be02b7b671`
- 見た目でも差分あり。README 側は旧 DSL 表示、旧設定順、`6 nodes / 6 edges / 3 lanes`。最新キャプチャは購買申請サンプル、Style-first 設定、`8 nodes / 8 edges / 4 lanes`。
- 改修方針は、README が参照する tracked 画像を `docs/assets/engine-desktop.png` に固定し、キャプチャスクリプトがそこへ出力する形を第一候補にする。補助的な一時成果物が必要なら `artifacts/` ではなく明示的な別 script 名に分ける。

### 不要コード、ハードコード、OCP

- `src/workflow.js` の `EDGE_DEFINITIONS` は edge type 追加に強い形になっており、parser/rendering の分岐は定義配列から辿れる。ここは OCP 観点では良い。
- `src/workflow.js` の `workflowThemes` は色トークンを一部共有しており、過去のハードコード対策は効いている。
- `src/main.js` の `settingsSchema` と `renderWorkflowSvg()` の default config は `gridXSize: 188`、`gridYSize: 116`、`nodeWidth: 112`、`nodeHeight: 42` を別々に持つ。設定 UI を経由しない `generateWorkflowSvg()` と engine UI の既定値が将来ずれる可能性がある。
- breakpoint `980px` は JS の `matchMedia()` と CSS の media query に重複している。pane minimum size も JS と CSS に近い意味の値がある。
- `mountEngine()` は 300 行超の関数で、DOM 参照、イベント登録、設定、レンダリング、ズーム、ペインリサイズ、ダウンロードをまとめて持つ。次の UI 機能追加前に、設定 schema/preview zoom/pane resize を小さな責務へ分けると安全。
- `preview.innerHTML` には renderer 生成 SVG が入る。SVG 側は `escapeXml()` を通しているため、現状のユーザー入力経路は守られている。`gutter.innerHTML` は行番号のみでユーザー文字列を含まない。

### フレイキーテスト

- `pnpm test` は通常条件で 3 回連続成功した。各回 39 tests pass。
- `UI_TEST_PORT=5193 pnpm test` も成功した。
- `pnpm run capture:engine` と `UI_CAPTURE_PORT=5194 pnpm run capture:engine` は成功した。
- ただし、UI テストとキャプチャは `networkidle`、固定ポート、mouse drag、`boundingBox()` に依存している。今回失敗はしていないが、実装変更で非同期リソースやアニメーションが増えると揺れやすい。
- 最初に `CI=true` なしで実行した `pnpm test` は、pnpm が registry metadata fetch と modules purge 確認に入り失敗した。ローカル/CI の検証手順では `CI=true` を付けるか、pnpm の store/module 状態を整えてから実行する。

## 次の改修計画

1. README 最新化
   - `README.md` の Features と Workflow Example を `docs/dsl.md` と `src/sample-workflow.js` の現行仕様へ合わせる。
   - cross edge、dotted cross edge、invisible edge を短く説明する。
   - `docs/assets/engine-desktop.png` を最新 engine キャプチャへ更新する。

2. キャプチャ導線の一本化
   - `scripts/capture-engine.js` の出力先を README 参照先の `docs/assets/engine-desktop.png` に変更する。
   - 変更後、`pnpm run capture:engine` 実行で tracked 画像が更新されることをテストまたは手順で確認する。
   - `docs/development/tooling.md` の記述も同じ出力先へ更新する。

3. top ページ文言の追従
   - top の Feature から「設定拡張前提」を外し、現行機能として配色プリセット、エッジ種別、ズーム/サイズ調整を説明する。
   - demo は単純な `->` のままでもよいが、最低限 `.x.` や `~>` が DSL にあることを Feature に反映する。

4. 設計負債の小分け解消
   - `renderWorkflowSvg()` の default config を export し、engine の `settingsSchema` はそこを参照する。
   - responsive breakpoint と pane size を名前付き定数に寄せる。ただし CSS/JS の共有方法は小さく保ち、ビルド設定や依存は増やさない。
   - `mountEngine()` から preview zoom と pane resize を局所 helper に切り出す。DOM 依存は `src/main.js` 内に留める。

5. UI テスト安定化
   - `networkidle` を、`#preview svg` と `#status.status.ok` の明示 wait 中心へ寄せる。
   - drag テストは pointer 操作後に orientation と CSS custom property または pane size の settled 状態を待つ。
   - capture script と UI test の dev server 起動 helper を重複させない方向で整理する。

## 実行した検証

- `git status --short --branch`
- `git fetch origin`
- `git diff --name-status origin/main`
- `CI=true pnpm test` 3 回
- `CI=true UI_TEST_PORT=5193 pnpm test`
- `CI=true pnpm run build`
- `CI=true pnpm run capture:engine`
- `CI=true UI_CAPTURE_PORT=5194 pnpm run capture:engine`
- Playwright による `/` と `/engine` の desktop/mobile スクリーンショット確認
- 監査レポート追加後の `CI=true pnpm test`
- 監査レポート追加後の `CI=true pnpm run guard:change`
- 監査レポート追加後の `git diff --check`
