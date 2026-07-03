# Cloudflare Workers 公開手順

このプロジェクトは Vite で `dist/` を生成し、Cloudflare Workers Assets へ公開します。
`add-weekday` と同じく GitHub Actions から deploy しますが、こちらは SPA のため `/engine` の直アクセスに fallback 設定が必要です。

## 前提

- Worker 名は `timeline-workflow-generator` です。
- GitHub Actions workflow は [../../.github/workflows/deploy-workers.yml](../../.github/workflows/deploy-workers.yml) です。
- Workers Assets 設定は [../../wrangler.toml](../../wrangler.toml) です。
- GitHub Actions の secret は repository 単位で設定します。`add-weekday` の secret はこの repository へ自動共有されません。

## 初回セットアップ

1. Cloudflare の `My Profile` → `API Tokens` で User API Token を作成します。
   - テンプレートは `Edit Cloudflare Workers` を使います。
   - 初回 deploy ではまだ Worker が存在しないため、resources は `Entire Account` を選びます。
   - 初回 deploy が成功し Worker が作られた後、必要なら `Specified Workers` へ絞った token を作り直します。
2. Cloudflare dashboard で Account ID を確認します。
   - Account home の URL に含まれる `/home` の手前の 32 文字の ID です。
   - Workers の overview でも Account ID を確認できます。
3. GitHub repository の `Settings` → `Secrets and variables` → `Actions` に以下を登録します。
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. `main` へ merge するか、Actions から `Deploy to Cloudflare Workers` を手動実行します。
5. 初回 deploy 成功後、Cloudflare の Workers & Pages で `timeline-workflow-generator` を確認します。
6. 独自ドメインを使う場合は、Cloudflare dashboard の Worker 設定から custom domain を追加します。

## Deploy workflow

`main` への push で、対象 path が変わった場合に deploy workflow が走ります。

実行内容:

- `pnpm install --frozen-lockfile`
- `pnpm exec playwright install chromium`
- `pnpm test`
- `pnpm run build`
- `wrangler deploy`

`wrangler` は devDependency と lockfile で管理します。workflow 実行中に `wrangler-action` へ暗黙 install させないでください。

## 公開後の確認

以下を確認します。

- `/` が表示できること
- `/engine` をブラウザで直接開けること
- トップページの `Engine` リンクから `/engine` へ遷移できること
- DevTools の Network で `/engine` が 404 になっていないこと
- GitHub Actions の deploy job が green であること

このアプリは Vite SPA なので、Workers Assets の `not_found_handling` は `single-page-application` にします。
`404-page` にすると `/` は表示できても `/engine` の直アクセスが 404 になります。

## よくある失敗と解消方法

### Playwright の browser がない

症状:

```text
browserType.launch: Executable doesn't exist
Please run: pnpm exec playwright install
```

原因:

GitHub-hosted runner に Playwright browser binary が入っていません。

解消:

`pnpm test` の前に `pnpm exec playwright install chromium` を実行します。

### Wrangler が workflow 内で見つからない

症状:

```text
Command "wrangler" not found
pnpm add wrangler@3.90.0
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: workerd
```

原因:

`wrangler` を project の依存関係として管理していないため、`wrangler-action` が workflow 中に追加 install しようとします。

解消:

- `wrangler` を devDependency に追加します。
- `pnpm-lock.yaml` を更新します。
- `pnpm-workspace.yaml` の `allowBuilds` で `workerd: true` を許可します。

### Cloudflare account を自動検出できない

症状:

```text
A request to the Cloudflare API (/memberships) failed.
Authentication failed (status: 400) [code: 9106]
```

原因:

Wrangler が token から account を自動検出しようとして失敗しています。

解消:

GitHub Actions secret に `CLOUDFLARE_ACCOUNT_ID` を追加し、`cloudflare/wrangler-action` の `accountId` に渡します。

### Worker 作成・更新権限が足りない

症状:

```text
A request to the Cloudflare API (/accounts/.../workers/services/timeline-workflow-generator) failed.
Authentication error [code: 10000]
Please ensure it has the correct permissions for this operation.
```

原因:

`CLOUDFLARE_API_TOKEN` が Worker を作成・更新できる権限または resource scope を持っていません。

解消:

初回 deploy 用に User API Token を作り直し、`Edit Cloudflare Workers` template と `Entire Account` resource で作成します。
Worker 作成後に最小権限へ絞る場合は、`Specified Workers` で `timeline-workflow-generator` を指定した token に差し替えます。

### `/` は表示できるが `/engine` が 404

症状:

```text
GET /engine 404
```

原因:

Vite SPA には `dist/engine/index.html` がありません。Workers Assets が `/engine` を `dist/index.html` へ fallback していないため 404 になります。

解消:

[../../wrangler.toml](../../wrangler.toml) の assets 設定を以下にします。

```toml
[assets]
directory = "./dist"
html_handling = "auto-trailing-slash"
not_found_handling = "single-page-application"
```

## 再発防止チェック

- Cloudflare token は User API Tokens と Account API Tokens のどちらを見ているか確認する。
- 初回 deploy 前は `Specified Workers` に絞らず、Worker 作成後に絞る。
- `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` の両方を GitHub Actions secret に登録する。
- `wrangler` と `workerd` build approval は repository の依存関係として管理する。
- `/engine` の直アクセス確認を公開後チェックに含める。
