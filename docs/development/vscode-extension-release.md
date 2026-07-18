# VS Code拡張の公開手順

## 公開先と識別子

- Marketplace: [Timeline Workflow Preview](https://marketplace.visualstudio.com/items?itemName=zohiro00.timeline-workflow-preview)
- GitHub Releases: [timeline-workflow-generator releases](https://github.com/zohiro00/timeline-workflow-generator/releases)
- Extension ID: `zohiro00.timeline-workflow-preview`
- Marketplace Publisher: `zohiro00`
- GitHub Release tag: `vscode-v<version>`
- VSIX: `vscode-extension/timeline-workflow-preview-<version>.vsix`

Marketplaceを通常の配布経路とし、GitHub ReleaseのVSIXは手動導入、動作確認、特定バージョンの保管に使います。

## 公開原則

- 拡張のPRを先に`main`へマージし、最新の`origin/main`から公開物を生成します。
- MarketplaceとGitHub Releaseには、同じ1つのVSIXを使います。公開先ごとに再ビルドしません。
- VSIX生成時のコミットSHAとSHA-256を記録します。
- `vsce publish patch`などによる公開時の自動バージョン更新は使いません。バージョンとCHANGELOGはPRで更新します。
- 初期運用ではMarketplaceへの公開を自動化せず、確認済みVSIXを管理画面から手動アップロードします。
- 認証情報、PAT、`.env`はVSIX、Git、Releaseへ含めません。

## リリース前の準備

1. `vscode-extension/package.json`の`version`、`publisher`、`name`を確認します。
2. `vscode-extension/CHANGELOG.md`を対象バージョンへ更新します。
3. Marketplaceの拡張名とPublisherを確認します。
4. READMEの画像がHTTPSで参照でき、`main`上に存在することを確認します。
5. Marketplace用アイコンとREADME画像にユーザー提供SVGを使っていないことを確認します。

## mainからVSIXを生成する

```bash
git status --short
git fetch origin
git switch main
git pull --ff-only origin main

CI=true pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm run vscode:build
pnpm run vscode:test:integration
pnpm run vscode:package
pnpm --dir vscode-extension exec vsce ls --no-dependencies
shasum -a 256 vscode-extension/timeline-workflow-preview-<version>.vsix
```

`git status -sb`がcleanで、`main`と`origin/main`が一致することも確認します。`dist/`、Extension Host、VSIXの生成結果をGitへ追加しません。

## ローカル導入を確認する

```bash
code --install-extension vscode-extension/timeline-workflow-preview-<version>.vsix --force
```

macOSで`code`がPATHにない場合は、VS Code内の **Shell Command: Install 'code' command in PATH** を実行します。一時的な確認では次のアプリ内CLIも利用できます。

```bash
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
  --install-extension vscode-extension/timeline-workflow-preview-<version>.vsix \
  --force
```

確認項目:

- 通常のMarkdownファイルでプレビューを開ける
- 保存前の編集でプレビューが更新される
- ファイル切り替えに追従する
- workflow未検出とDSLエラーが表示され、修正後に復旧する
- VSIX内のバージョンとインストール済みバージョンが一致する

Marketplace経由の導入確認前には、ローカルVSIX版をアンインストールします。

```bash
code --uninstall-extension zohiro00.timeline-workflow-preview
```

## Marketplaceへ公開する

1. [Manage Publishers & Extensions](https://marketplace.visualstudio.com/manage/publishers/)を開きます。
2. Publisher `zohiro00`から確認済みVSIXをアップロードします。
3. `Verifying`が完了し、対象バージョンがPublicになったことを確認します。
4. Marketplaceの商品ページでアイコン、README画像、CHANGELOG、リンクを確認します。
5. VS Codeで`@id:zohiro00.timeline-workflow-preview`を検索し、Marketplaceからインストールします。

## GitHub Releaseを作成する

Marketplaceへアップロードしたものと同じVSIXを添付します。

- Tag: `vscode-v<version>`
- Target: VSIXを生成した`main`コミット
- Title: `Timeline Workflow Preview v<version>`
- Asset: `timeline-workflow-preview-<version>.vsix`

Release notesには、主要機能、MarketplaceまたはVSIXからの導入方法、VSIXのSHA-256を記載します。作成後、tagの対象SHAと添付ファイル名を確認します。

Macを直接操作できる環境でGitHub CLIを使う場合は、先に認証状態を確認します。

```bash
gh auth status
```

認証が切れている場合は、そのMacの通常ターミナルから再認証します。Remote環境でkeyring参照が不安定な場合は回避策を重ねず、Macを直接操作できるタイミングまでRelease作成を延期します。

Release notesを`/tmp/vscode-release-notes.md`へ用意した後、次の形式で作成します。

```markdown
## Timeline Workflow Preview v<version>

### Features

- Preview the first `workflow` block in an active Markdown document
- Update the preview automatically while editing
- Display workflow syntax errors in the preview
- Reuse the Web application's parser, layout engine, and SVG renderer

### Installation

Install from the Visual Studio Marketplace, or download the attached VSIX.

### Integrity

SHA-256: `<VSIXのSHA-256>`
```

ファイルを用意したら、次の形式でReleaseを作成します。

```bash
VERSION=0.2.0
VSIX="vscode-extension/timeline-workflow-preview-${VERSION}.vsix"
TARGET_SHA="$(git rev-parse origin/main)"

gh release create "vscode-v${VERSION}" "${VSIX}" \
  --target "${TARGET_SHA}" \
  --title "Timeline Workflow Preview v${VERSION}" \
  --notes-file /tmp/vscode-release-notes.md
```

作成後はReleaseのURL、tagのtarget、添付ファイル、ハッシュを確認します。確認が終わるまでローカルVSIXを削除しません。

## 公開後の導線を更新する

- リポジトリのREADMEからMarketplaceの商品ページへリンクします。
- Web版トップページでは`Engineを開く`を主CTAのまま維持します。
- Heroには`VS Codeでライブプレビュー`の副CTA、Footerには`VS Code拡張`リンクを追加します。
- Marketplace導線は別タブで開き、外部リンクであることが分かる文言にします。
- Web版と拡張版の役割を混同させる説明や、同格の主CTAを2つ並べる構成は避けます。
- トップページ導線の変更は公開手順docsと分けたPRにし、desktopとnarrow viewportのUIテストを更新します。

## 作業ディレクトリを片付ける

まず削除候補を表示します。

```bash
git status --ignored --short
git clean -ndX
```

確認後、次の再生成可能な出力だけを削除します。

- ルートの`dist/`
- `vscode-extension/dist/`
- `vscode-extension/.vscode-test/`
- GitHub Releaseへの添付とハッシュ確認が完了したVSIX

`node_modules/`と`.pnpm-store/`は依存キャッシュです。容量を空ける目的が明確な場合だけ削除し、通常のリリース後クリーンアップには含めません。追跡対象や用途不明のignoredファイルを`git clean -fdX`で一括削除しません。
