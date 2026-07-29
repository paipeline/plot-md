import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REGISTRY,
  parseTemplateRegistryJson,
  validateTemplateRegistry,
} from "../src/core/registry";

test("accepts the bundled registry", () => {
  const result = validateTemplateRegistry(DEFAULT_REGISTRY);
  assert.equal(result.ok, true);
});

test("keeps legacy version 1 registries valid when new templates are absent", () => {
  const result = validateTemplateRegistry({
    version: 1,
    theme: DEFAULT_REGISTRY.theme,
    directives: {
      decision: DEFAULT_REGISTRY.directives.decision,
    },
  });
  assert.equal(result.ok, true);
});

test("rejects future versions and unknown keys", () => {
  const result = validateTemplateRegistry({
    ...DEFAULT_REGISTRY,
    version: 2,
    css: "unsafe.css",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.includes("$.version")));
    assert.ok(result.errors.some((error) => error.includes("$.css")));
  }
});

test("rejects executable-looking values because they are outside the enum", () => {
  const result = validateTemplateRegistry({
    ...DEFAULT_REGISTRY,
    theme: { ...DEFAULT_REGISTRY.theme, accent: "url(https://example.com/x.css)" },
  });
  assert.equal(result.ok, false);
});

test("rejects unsafe variants on optional templates", () => {
  const result = validateTemplateRegistry({
    ...DEFAULT_REGISTRY,
    directives: {
      ...DEFAULT_REGISTRY.directives,
      meme: { variant: "<script>" },
      visual: { variant: "url(https://example.com/template)" },
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.includes("$.directives.visual.variant")));
  }
});

test("reports malformed JSON", () => {
  const result = parseTemplateRegistryJson("{ nope");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors[0], /not valid JSON/);
  }
});
