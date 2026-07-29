import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_REGISTRY } from "../src/core/registry";
import { validateSemanticMarkdown } from "../src/core/validation";

test("validates one comparison decision", () => {
  const source = `:::smd-decision id="engine" status="accepted" variant="comparison"\n| Option | Strength |\n|---|---|\n| Built-in | Native |\n\n**Outcome:** Use built-in.\n:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  assert.equal(result.diagnostics.length, 0);
  const node = result.nodes[0];
  assert.equal(result.decisionAnalyses.get(node)?.effectiveVariant, "comparison");
});

test("falls back from incompatible comparison to summary", () => {
  const source = `:::smd-decision variant="comparison"\nOnly prose.\n:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  assert.ok(result.diagnostics.some((item) => item.code === "variant_incompatible" && item.severity === "warning"));
  assert.equal(result.decisionAnalyses.get(result.nodes[0])?.effectiveVariant, "summary");
});

test("reports unknown types, invalid status, and duplicate ids", () => {
  const source = `:::smd-timeline\nBody\n:::\n:::smd-decision id="same" status="done"\nBody\n:::\n:::smd-decision id="same"\nBody\n:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  const codes = result.diagnostics.map((item) => item.code);
  assert.ok(codes.includes("unknown_type"));
  assert.ok(codes.includes("invalid_decision_status"));
  assert.ok(codes.includes("duplicate_decision_id"));
});

test("validates reusable flow, matrix, meme, and note shapes", () => {
  const source = `:::smd-flow variant="equation"
1. Composition
2. Conditions
3. Property
:::
:::smd-matrix variant="tiers"
| Tier | Columns |
|---|---|
| Must | role_*_wt |
:::
:::smd-meme variant="poster"
![A paper in disguise](./assets/meme.png)

**Train:** I know that paper.
:::
:::smd-note tone="critical"
Group by paper.
:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  assert.deepEqual(result.diagnostics, []);
});

test("reports incompatible content without swallowing its Markdown", () => {
  const source = `:::smd-flow
Only prose.
:::
:::smd-matrix
- not
- a table
:::
:::smd-note tone="loud"
Body
:::
:::smd-meme
No image.
:::
:::smd-meme
![Remote](https://example.com/meme.png)
:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  const codes = result.diagnostics.map((item) => item.code);
  assert.ok(codes.includes("flow_requires_list"));
  assert.ok(codes.includes("matrix_requires_table"));
  assert.ok(codes.includes("invalid_note_tone"));
  assert.ok(codes.includes("meme_requires_one_image"));
  assert.ok(codes.includes("meme_requires_local_image"));
});

test("limits semantic tables to 200 data rows", () => {
  const rows = Array.from({ length: 201 }, (_, index) => `| ${index} | value |`).join("\n");
  const source = `:::smd-decision variant="comparison"\n| A | B |\n|---|---|\n${rows}\n:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  assert.ok(result.diagnostics.some((item) => item.code === "table_row_limit"));
});

test("validates narrative beats and a local visual", () => {
  const source = `:::smd-hook title="The question"
What did the model actually learn?
:::
:::smd-visual title="The experiment" variant="hero"
![A local experiment](./assets/story.jpg)

One row, one measured property.
:::
:::smd-reveal title="The turn"
The paper identity was the shortcut.
:::
:::smd-checkpoint title="Keep this"
- Group by paper.
- Keep conditions.
:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  assert.deepEqual(result.diagnostics, []);
});

test("reports invalid narrative and visual content", () => {
  const source = `:::smd-hook
:::
:::smd-reveal
:::
:::smd-visual variant="cinematic"
No image.
:::
:::smd-visual
![Remote](https://example.com/story.jpg)
:::
:::smd-checkpoint
Only prose.
:::`;
  const result = validateSemanticMarkdown(source, DEFAULT_REGISTRY);
  const codes = result.diagnostics.map((item) => item.code);
  assert.ok(codes.includes("hook_requires_content"));
  assert.ok(codes.includes("reveal_requires_content"));
  assert.ok(codes.includes("invalid_visual_variant"));
  assert.ok(codes.includes("visual_requires_one_image"));
  assert.ok(codes.includes("visual_requires_local_image"));
  assert.ok(codes.includes("checkpoint_requires_list"));
});
