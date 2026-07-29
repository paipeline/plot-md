---
name: customize-semantic-markdown
description: Safely customize a project's Plot.md templates from natural-language design requests. Use when changing `.semantic-markdown/templates.json`, selecting safe decision/flow/matrix/meme/note/visual presentations, adjusting density/radius/accent tokens, or validating semantic blocks without adding CSS, scripts, HTML, or remote resources.
---

# Customize Semantic Markdown

Translate visual intent into the renderer's small, versioned registry. Modify only `.semantic-markdown/templates.json`; keep document semantics in Markdown and presentation in the reader.

## Workflow

1. Locate the workspace root and `.semantic-markdown/templates.json`.
2. If the file does not exist, ask the user to run `Plot.md: Initialize Project`. Do not invent a wider schema.
3. Read the entire registry before editing it.
4. Map the request to the allowlist below. State any part that cannot be expressed safely.
5. Preserve `version: 1`, unknown user content outside the requested fields, and valid directive settings.
6. Edit only the registry JSON.
7. Run `Plot.md: Validate Current File` in VS Code for the relevant Markdown document. If VS Code commands are unavailable, run `npm run check` in the extension repository and validate the JSON against the allowlist manually.
8. Tell the user to close and reopen an already-open Markdown Preview. Do not claim automatic refresh.

## Allowed registry

```json
{
  "version": 1,
  "theme": {
    "density": "compact",
    "radius": "small",
    "accent": "lavender"
  },
  "directives": {
    "decision": {
      "variant": "comparison"
    },
    "flow": {
      "variant": "steps"
    },
    "matrix": {
      "variant": "tiers"
    },
    "meme": {
      "variant": "classic"
    },
    "note": {
      "tone": "insight"
    },
    "visual": {
      "variant": "scene"
    }
  }
}
```

- `theme.density`: `compact` or `comfortable`
- `theme.radius`: `small` or `medium`
- `theme.accent`: `lavender`, `amber`, or `blue`
- `directives.decision.variant`: `summary`, `comparison`, or `record`
- `directives.flow.variant`: `steps` or `equation`
- `directives.matrix.variant`: `tiers` or `columns`
- `directives.meme.variant`: `classic`, `poster`, or `deadpan`
- `directives.note.tone`: `critical`, `insight`, or `caution`
- `directives.visual.variant`: `hero`, `scene`, or `split`

Choose variants by content:

- `comparison`: exactly one comparison table, with optional body and `**Outcome:**`.
- `record`: prose or mixed content with decision metadata and/or an outcome.
- `summary`: any valid decision; use as the deterministic fallback.
- `flow.steps`: one Markdown list rendered as a numbered process.
- `flow.equation`: one short Markdown list rendered as an input-to-output chain.
- `matrix.tiers`: one table whose first column is the priority tier.
- `matrix.columns`: one wide reference table with neutral column emphasis.
- `meme.classic`: one relative local image with large top and bottom captions overlaid in classic internet-meme grammar.
- `meme.poster`: one relative local Markdown image plus editable punchline copy, rendered like a loud printed poster.
- `meme.deadpan`: the same content rendered as a restrained monochrome joke.
- `note.critical`: a rule whose violation invalidates the result.
- `note.insight`: an explanatory or interpretive takeaway.
- `note.caution`: a limitation, migration, or follow-up.
- `visual.hero`: a wide opening world or end-to-end system.
- `visual.scene`: an explanatory local image beside a concise caption.
- `visual.split`: a local image that expresses a contrast or transition.

`hook`, `reveal`, and `checkpoint` are fixed narrative templates and do not expose registry variants.

## Request mapping examples

- “Make decisions denser and Linear-like” → `density: compact`, `radius: small`, `accent: lavender`.
- “Use a warmer accepted-decision look” → `accent: amber`; do not create orange CSS.
- “Show the tradeoffs as two columns” → `decision.variant: comparison`; first verify the block has exactly one table.
- “Turn this ordered list into a pipeline” → `flow.variant: steps`.
- “Show composition + conditions → property” → `flow.variant: equation`.
- “Make the must/nice/discard table scannable” → `matrix.variant: tiers`.
- “Make this look like an actual internet meme” → `meme.variant: classic`.
- “Make this local image and caption feel like a printed poster” → `meme.variant: poster`.
- “Keep the joke dry and understated” → `meme.variant: deadpan`.
- “Call out the leakage warning” → `note.tone: critical`.
- “Make this opening image feel cinematic and wide” → `visual.variant: hero`.
- “Put the image beside its explanation” → `visual.variant: scene`.
- “Show the before/after regime” → `visual.variant: split`.
- “Make this interactive with tabs” → refuse the interaction. Offer the closest static variant.

## Hard refusals

- Do not add project CSS or change `markdown.styles`.
- Do not add JavaScript, event handlers, React, templates with executable code, or expression evaluation.
- Do not add URLs, remote assets, npm template packages, or network loading.
- Do not modify the installed extension or generated HTML.
- Do not replace the Markdown document with HTML.
- Do not widen the registry schema or accept a future version.

If the request needs one of these capabilities, explain that it is outside the 0.0.5 safety contract and leave the registry valid.

## Output

Report the exact fields changed, validation result, and any unexpressed request. Keep the report concise.
