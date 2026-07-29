import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import { DEFAULT_REGISTRY } from "../dist/src/core/registry.js";
import { semanticMarkdownPlugin } from "../dist/src/renderer/plugin.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const source = await readFile(
  path.join(projectRoot, "examples", "dataset-feature-guide.md"),
  "utf8",
);
const rendererCss = await readFile(
  path.join(projectRoot, "media", "preview.css"),
  "utf8",
);
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(semanticMarkdownPlugin, {
  getRegistry: () => DEFAULT_REGISTRY,
});
const rendered = markdown.render(source);
const outputDirectory = path.join(projectRoot, "output", "renderer");

const pageStyles = `
  :root {
    --page-paper: oklch(98% 0.008 78);
    --page-ink: oklch(19% 0.018 258);
    --page-muted: oklch(47% 0.014 258);
    --page-rule: oklch(88% 0.012 78);
  }
  * { box-sizing: border-box; }
  html { background: var(--vscode-editor-background); }
  body {
    margin: 0;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif;
    font-size: 16px;
    line-height: 1.65;
    font-kerning: normal;
  }
  .markdown-body {
    width: min(100% - 3rem, 980px);
    margin-inline: auto;
    padding-block: clamp(3rem, 7vw, 7rem);
  }
  .markdown-body > h1 {
    max-width: 13ch;
    margin: 0 0 1rem;
    border: 0;
    color: inherit;
    font-size: clamp(3rem, 7vw, 6rem);
    font-weight: 650;
    line-height: 0.98;
    letter-spacing: -0.065em;
  }
  .markdown-body > h1 + blockquote {
    max-width: 46rem;
    margin: 0 0 4rem;
    padding: 0;
    border: 0;
    color: var(--page-muted);
    font-size: clamp(1.1rem, 1.4vw, 1.35rem);
  }
  .markdown-body > h2 {
    margin: 5rem 0 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--page-rule);
    border-bottom: 0;
    color: inherit;
    font-size: clamp(1.75rem, 3vw, 2.75rem);
    font-weight: 620;
    line-height: 1.1;
    letter-spacing: -0.045em;
  }
  .markdown-body > p,
  .markdown-body > ul {
    max-width: 68ch;
  }
  .markdown-body code {
    padding: 0.12em 0.32em;
    border-radius: 4px;
    background: color-mix(in srgb, var(--vscode-editor-foreground) 7%, transparent);
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 0.88em;
  }
  .markdown-body .smd-block {
    max-width: none;
    margin-block: 2rem;
  }
  .vscode-dark {
    --vscode-editor-background: #010102;
    --vscode-editor-foreground: #f7f8f8;
    --vscode-editor-font-family: "SFMono-Regular", Consolas, monospace;
    --page-muted: #9ca2ad;
    --page-rule: #23252a;
  }
  .vscode-light {
    --vscode-editor-background: var(--page-paper);
    --vscode-editor-foreground: var(--page-ink);
    --vscode-editor-font-family: "SFMono-Regular", Consolas, monospace;
  }
  @media (max-width: 640px) {
    .markdown-body {
      width: min(100% - 2rem, 980px);
      padding-block: 3rem;
    }
    .markdown-body > h1 + blockquote { margin-bottom: 2.5rem; }
    .markdown-body > h2 { margin-top: 3.5rem; }
  }
`;

function document(theme) {
  const isDark = theme === "linear";
  const themeClass = isDark ? "vscode-dark" : "vscode-light";
  const title = `Biopolymer dataset - ${isDark ? "Linear" : "Apple"} renderer`;
  return `<!doctype html>
<html lang="en" class="${themeClass}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="icon" href="data:,">
  <base href="../../examples/">
  <title>${title}</title>
  <style>${pageStyles}\n${rendererCss}</style>
</head>
<body>
  <main class="markdown-body">${rendered}</main>
</body>
</html>
`;
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  ["apple", "linear"].map((theme) =>
    writeFile(
      path.join(outputDirectory, `dataset-feature-guide-${theme}.html`),
      document(theme),
      "utf8",
    ),
  ),
);

console.log(`Rendered dataset examples to ${outputDirectory}`);
