/**
 * Wrap an already-rendered workflow SVG in a portable, self-contained HTML file.
 * Keep the SVG inline so its nodes and edges remain addressable for future animation.
 */
export function createWorkflowHtml(svg) {
  if (typeof svg !== "string" || !/^\s*<svg\b/i.test(svg)) {
    throw new TypeError("A rendered workflow SVG is required.");
  }

  // The workflow renderer escapes labels. Do not interpret user-authored markup here.
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Timeline Workflow</title>
  <style>
    :root { color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      background: #fff;
      font-family: Arial, "Noto Sans JP", sans-serif;
    }
    main {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 16px;
      min-height: 100vh;
    }
    .workflow-diagram {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
    }
    @media print {
      main { min-height: 0; padding: 0; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <main aria-label="Workflow diagram">
${svg.trim()}
  </main>
</body>
</html>
`;
}
