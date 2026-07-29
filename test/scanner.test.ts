import assert from "node:assert/strict";
import test from "node:test";
import { parseDirectiveOpener, scanSemanticMarkdown } from "../src/core/scanner";

test("parses quoted, numeric, boolean, Chinese, and escaped values", () => {
  const line = String.raw`:::smd-decision title="发布 \"A\"" count=2 active=true`;
  const result = parseDirectiveOpener(line);
  assert.equal(result.matched, true);
  assert.equal(result.type, "decision");
  assert.deepEqual(result.props, { title: '发布 "A"', count: 2, active: true });
  assert.equal(result.diagnostics.length, 0);
});

test("rejects duplicate properties and unknown escapes", () => {
  const result = parseDirectiveOpener(String.raw`:::smd-decision title="a\n" title="b"`);
  assert.deepEqual(result.diagnostics.map((item) => item.code), ["unknown_escape", "duplicate_property"]);
});

test("scans adjacent directives with UTF-16 source ranges", () => {
  const source = `😀\n:::smd-decision id="one"\nFirst\n:::\n:::smd-decision id="two"\nSecond\n:::\n`;
  const result = scanSemanticMarkdown(source);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0].sourceRange.startUtf16, source.indexOf(":::smd-decision"));
  assert.equal(result.nodes[1].props.id, "two");
  assert.equal(result.nodes[0].contentSource, "First\n");
});

test("reports unclosed directives without producing a semantic node", () => {
  const result = scanSemanticMarkdown(":::smd-decision\nStill plain Markdown");
  assert.equal(result.nodes.length, 0);
  assert.equal(result.diagnostics.at(-1)?.code, "unclosed_directive");
});

test("reports a nested opener as literal content", () => {
  const source = ":::smd-decision\n:::smd-decision\ninner\n:::\n:::\n";
  const result = scanSemanticMarkdown(source);
  assert.equal(result.nodes.length, 1);
  assert.ok(result.diagnostics.some((item) => item.code === "nested_directive"));
});

test("enforces the document directive limit deterministically", () => {
  const source = Array.from({ length: 101 }, (_, index) => `:::smd-decision id="d${index}"\nBody\n:::`).join("\n");
  const result = scanSemanticMarkdown(source);
  assert.equal(result.nodes.length, 100);
  assert.ok(result.diagnostics.some((item) => item.code === "too_many_directives"));
});
