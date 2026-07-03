# 0004: Cloudflare Workers 初回公開時の設定混乱

## 日付

2026-07-03

## 何が起きたか

`timeline-workflow-generator` を Cloudflare Workers Assets へ公開する際、`add-weekday` と同じ形式に寄せたつもりでしたが、初回 deploy と公開後確認で複数の失敗が連続しました。

- GitHub Actions で Playwright の Chromium がなく、UI テストが失敗した。
- `wrangler` が project 依存関係になく、workflow 中の暗黙 install が `workerd` の build approval で失敗した。
- `CLOUDFLARE_ACCOUNT_ID` がなく、Wrangler の account 自動検出が失敗した。
- API token の権限または resource scope が足りず、Worker 作成・更新で失敗した。
- `/` は表示できたが、`/engine` の直アクセスが 404 になった。
- Cloudflare の token 画面について、User API Tokens と Account API Tokens の切り分けが不十分だった。

## 原因

- `add-weekday` は `site/public/engine/index.html` を持つ静的ファイル構成だが、この project は Vite SPA で `dist/index.html` だけを entry とする構成だった。
- GitHub Actions runner は Playwright browser binary を持たないため、`pnpm install` だけでは UI テストを実行できなかった。
- `wrangler-action` に `wrangler` の暗黙 install を任せたため、pnpm の build approval と衝突した。
- Cloudflare token の一覧画面と token 種別について、実環境の確認より一般論を先に出した。
- 初回 Worker 作成前に token を狭くしすぎると、対象 Worker が存在せず作成権限も不足することを明文化していなかった。

## アンチパターン

- 参照 project と同じ `wrangler.toml` をそのまま移植し、配信対象の app 構成差分を確認しない。
- SPA なのに `not_found_handling = "404-page"` のままにする。
- CI で必要な CLI を repository の dependency / lockfile に入れず、GitHub Action の暗黙 install に任せる。
- Playwright を使うテストがあるのに、CI で browser install step を用意しない。
- Cloudflare token の問題を、User API Tokens / Account API Tokens / GitHub Secrets のどこを見ているか切り分けずに説明する。
- 初回 deploy 前から `Specified Workers` に絞った token を前提にする。
- `/` の表示だけで公開確認完了とし、深い URL の直アクセスを確認しない。

## 今後の方針

- Cloudflare Workers 公開手順は [../cloudflare-workers-deploy.md](../cloudflare-workers-deploy.md) に従う。
- Workers Assets の SPA では `not_found_handling = "single-page-application"` を使う。
- deploy workflow で使う CLI は `package.json` と `pnpm-lock.yaml` で管理する。
- Playwright UI テストを CI で実行する場合は、`pnpm exec playwright install chromium` を test 前に入れる。
- Cloudflare の認証情報は、`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` の両方を GitHub Actions secret に登録する。
- 初回 deploy では Worker 作成権限を持つ token を使い、Worker 作成後に必要なら resource scope を絞る。
- 公開確認では `/` と `/engine` の両方を直接開く。

## 再発防止チェック

- `wrangler.toml` の `[assets]` に `directory = "./dist"` と `not_found_handling = "single-page-application"` がある。
- `package.json` に `wrangler` が devDependency として入り、lockfile が更新されている。
- `pnpm-workspace.yaml` で `workerd: true` が許可されている。
- GitHub Actions で `pnpm exec playwright install chromium` が `pnpm test` より前に実行される。
- GitHub Actions secret に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` がある。
- Cloudflare token 作成時に、初回 deploy 用と運用後の最小権限 token を分けて考える。
- 公開後に `/engine` をブラウザで直接開き、404 にならないことを確認する。
