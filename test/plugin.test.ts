import assert from "node:assert/strict";
import test from "node:test";
import MarkdownIt from "markdown-it";
import { DEFAULT_REGISTRY } from "../src/core/registry";
import { semanticMarkdownPlugin } from "../src/renderer/plugin";

function createMarkdown() {
  return new MarkdownIt({ html: false }).use(semanticMarkdownPlugin, {
    getRegistry: () => DEFAULT_REGISTRY,
  });
}

test("renders a decision through the current markdown-it instance", () => {
  const source = `:::smd-decision id="engine" status="accepted" variant="comparison"\n## Preview engine\n\n| Built-in Preview | Custom Webview |\n|---|---|\n| Native workflow | More surface |\n\n**Outcome:** Extend the built-in preview.\n:::`;
  const html = createMarkdown().render(source);
  assert.match(html, /class="smd-block smd-decision smd-decision--comparison/);
  assert.match(html, /smd-status--accepted/);
  assert.match(html, /class="smd-comparison-table"/);
  assert.match(html, /class="smd-outcome"/);
  assert.match(html, /<h2>Preview engine<\/h2>/);
});

test("escapes document-provided title text", () => {
  const source = `:::smd-decision title="<img src=x onerror=alert(1)>" variant="summary"\nSafe body\n:::`;
  const html = createMarkdown().render(source);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("keeps an unclosed directive visible as ordinary Markdown", () => {
  const source = ":::smd-decision\nStill visible";
  const html = createMarkdown().render(source);
  assert.match(html, /:::smd-decision/);
  assert.match(html, /Still visible/);
  assert.doesNotMatch(html, /smd-block/);
});

test("does not activate directives inside list items or blockquotes", () => {
  const source = `- :::smd-decision\n  Body\n  :::\n\n> :::smd-decision\n> Body\n> :::`;
  const html = createMarkdown().render(source);
  assert.doesNotMatch(html, /smd-block/);
  assert.match(html, /:::smd-decision/);
});

test("uses registry theme classes without injecting registry values", () => {
  const registry = {
    ...DEFAULT_REGISTRY,
    theme: { density: "comfortable", radius: "medium", accent: "amber" },
  } as const;
  const md = new MarkdownIt().use(semanticMarkdownPlugin, { getRegistry: () => registry });
  const html = md.render(':::smd-decision variant="summary"\nBody\n:::');
  assert.match(html, /smd-density--comfortable/);
  assert.match(html, /smd-radius--medium/);
  assert.match(html, /smd-accent--amber/);
});

test("renders flow, matrix, meme, and note through the same directive interface", () => {
  const source = `:::smd-flow title="Learning task" variant="equation"
1. Composition
2. Conditions
3. Property
:::

:::smd-matrix title="Feature contract" variant="tiers"
| Tier | Columns |
|---|---|
| Must | role_*_wt |
| Discard | *_id |
:::

:::smd-meme title="Suspicious score" variant="classic"
![A paper in disguise](./assets/meme.png)

**Train:** I know that paper.
:::

:::smd-note title="Leakage rule" tone="critical"
Group cross-validation by paper.
:::`;
  const html = createMarkdown().render(source);
  assert.match(html, /class="smd-block smd-flow smd-flow--equation/);
  assert.match(html, /class="smd-flow-list"/);
  assert.match(html, /class="smd-block smd-matrix smd-matrix--tiers/);
  assert.match(html, /class="smd-matrix-table"/);
  assert.match(html, /class="smd-block smd-meme smd-meme--classic/);
  assert.match(html, /class="smd-meme__visual"/);
  assert.match(html, /class="smd-meme__image"/);
  assert.match(html, /src="\.\/assets\/meme\.png"/);
  assert.match(html, /<\/figure>/);
  assert.match(html, /class="smd-block smd-note smd-note--critical/);
  assert.match(html, /role="note"/);
});

test("escapes titles on every semantic template", () => {
  const source = `:::smd-note title="<svg onload=alert(1)>" tone="insight"
Safe body
:::`;
  const html = createMarkdown().render(source);
  assert.doesNotMatch(html, /<svg/);
  assert.match(html, /&lt;svg onload=alert\(1\)&gt;/);
});

test("strips remote image sources from meme blocks", () => {
  const source = `:::smd-meme variant="deadpan"
![Remote image](https://example.com/meme.png)
:::`;
  const html = createMarkdown().render(source);
  assert.doesNotMatch(html, /https:\/\/example\.com/);
  assert.match(html, /data-smd-invalid-src="true"/);
});

test("renders narrative beats and local visual chapters", () => {
  const source = `:::smd-hook title="Did it learn the science?"
Follow the evidence before trusting the score.
:::

:::smd-visual title="One formulation, three views" variant="scene"
![A formulation branches into three representations](./assets/story.png)

These are alternate views of one formulation.
:::

:::smd-reveal title="The score was a disguise."
Grouped validation reveals the shortcut.
:::

:::smd-checkpoint title="Keep these rules"
1. Split by paper.
2. Preserve test conditions.
:::`;
  const html = createMarkdown().render(source);
  assert.match(html, /class="smd-block smd-storybeat smd-hook/);
  assert.match(html, /<aside class="smd-block smd-storybeat smd-hook/);
  assert.match(html, /class="smd-block smd-visual smd-visual--scene/);
  assert.match(html, /class="smd-visual__visual"/);
  assert.match(html, /class="smd-visual__image"/);
  assert.match(html, /src="\.\/assets\/story\.png"/);
  assert.match(html, /class="smd-block smd-storybeat smd-reveal/);
  assert.match(html, /class="smd-block smd-storybeat smd-checkpoint/);
  assert.match(html, /class="smd-checkpoint-list"/);
});

test("strips remote image sources from visual blocks", () => {
  const source = `:::smd-visual variant="hero"
![Remote image](https://example.com/story.png)
:::`;
  const html = createMarkdown().render(source);
  assert.doesNotMatch(html, /https:\/\/example\.com/);
  assert.match(html, /class="smd-visual__image"/);
  assert.match(html, /data-smd-invalid-src="true"/);
});
