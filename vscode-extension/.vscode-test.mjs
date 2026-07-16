import { defineConfig } from "@vscode/test-cli";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  files: "integration/**/*.integration.cjs",
  version: "1.100.0",
  workspaceFolder: "integration/fixtures",
  launchArgs: [
    "--disable-extensions",
    "--disable-workspace-trust",
    "--user-data-dir",
    join(tmpdir(), `timeline-workflow-preview-test-${process.pid}`),
  ],
});
