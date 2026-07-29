# VS Code Preview spikes

Checked on 2026-07-20 against the current public VS Code documentation.

## 1. Document URI in markdown-it environment

Result: **not a stable public contract**.

The documented `markdown.markdownItPlugins` API guarantees an `extendMarkdownIt(md)` hook, but does not document a document URI field in the synchronous render environment. The 0.0.1 prototype therefore supports only one trusted local workspace folder and binds one prevalidated registry snapshot to that extension host. It does not inspect undocumented `env` fields.

This is sufficient for the weekend single-root slice. Multi-root and per-document registry selection remain blocked until a supported URI contract is available or an adapter boundary is introduced.

Source: https://code.visualstudio.com/api/extension-guides/markdown-extension

## 2. Public preview refresh

Result: **no public registry-driven refresh command documented**.

VS Code documents automatic preview updates when the Markdown document changes and documents opening Preview to the side. It does not document a public command for an extension to invalidate an already-open Preview because an external template registry changed.

The prototype watches `templates.json`, validates and swaps its in-memory snapshot atomically, then asks the user to close and reopen Preview. It does not call internal command IDs.

Source: https://code.visualstudio.com/docs/languages/markdown

## Decision

Proceed with Approach A for a single-root local prototype. Keep registry selection and preview invalidation behind explicit extension boundaries so a later supported API can replace these constraints.
