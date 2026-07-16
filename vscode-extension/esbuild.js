import * as esbuild from "esbuild";

const options = {
  bundle: true,
  entryPoints: ["src/extension.js"],
  external: ["vscode"],
  format: "cjs",
  logLevel: "info",
  minify: false,
  outfile: "dist/extension.cjs",
  platform: "node",
  sourcemap: false,
  target: "node20",
};

if (process.argv.includes("--watch")) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log("Watching the VS Code extension bundle...");
} else {
  await esbuild.build(options);
}
