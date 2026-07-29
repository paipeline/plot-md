# Contributing to Plot.md

Plot.md should stay small, safe, and readable without the renderer.

## Development

Requirements:

- Node.js 22 or newer
- VS Code 1.100 or newer for extension testing

Install and verify:

```bash
npm install
npm run check
npm run render:dataset
```

Package the extension:

```bash
npm run package
```

## Pull requests

Keep each pull request focused. Include:

- the reader problem being solved;
- the Markdown source shape;
- the safe rendered behavior;
- tests for validation and HTML output;
- a desktop and narrow-layout check for visual changes.

Run `npm run check` before submitting.

## Template design rules

- Preserve readable fallback Markdown.
- Never evaluate document-provided HTML, JavaScript, CSS, or expressions.
- Never load remote images or template code.
- Prefer one semantic content contract over layout-specific properties.
- Escape document-provided text.
- Keep variants finite and registry-validated.
- Avoid a page made entirely of interchangeable cards.
- Meet keyboard, contrast, reduced-motion, and screen-reader expectations.

New directive proposals should explain why an existing directive or ordinary Markdown cannot express the same reader need.

## Assets

Only add assets you have the right to redistribute. Generated images must not imitate a living artist or include third-party brands. Keep exact technical labels in Markdown rather than baking them into images.

## Reporting security issues

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).
