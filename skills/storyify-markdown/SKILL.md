---
name: storyify-markdown
description: Turn technical Markdown into a vivid, fact-preserving reading journey using narrative hooks, local visual chapters, semantic diagrams, selective memes, reveals, and checkpoints. Use when a technical guide, agent document, README, research note, dataset note, architecture explanation, or tutorial feels dense or monotonous and should read more like a story without becoming HTML or changing its technical claims.
---

# Storyify Markdown

Make the document easier to enter, follow, remember, and retell. Keep Markdown as the source of truth and use Plot.md for presentation.

## Non-negotiable contract

- Preserve every number, formula, code sample, command, API name, citation, limitation, and technical conclusion.
- Do not invent experiments, benchmarks, dialogue, quotes, causes, or certainty.
- Add narrative around technical evidence; do not replace the evidence.
- Keep source order when order carries meaning.
- Keep images local to the project and captions editable as Markdown.
- Leave ordinary Markdown readable when the renderer is absent.

## Workflow

### 1. Lock the facts

Read the entire source before editing it. Make a private inventory of:

- the central question;
- claims and their supporting evidence;
- immutable technical tokens such as numbers, formulas, code, filenames, flags, and citations;
- warnings and uncertainty;
- the intended reader and the action they should take.

If a statement cannot be traced to the source, do not present it as fact.

### 2. Find the narrative spine

Express the document as one question followed by three to seven beats. A useful default is:

1. Situation
2. Tempting shortcut or confusion
3. Evidence
4. Reveal
5. Practical decision
6. Remember-this checkpoint

Do not force drama into a reference page that only needs scannability.

### 3. Choose semantic beats

Read [references/story-patterns.md](references/story-patterns.md) before adding directives.

Use:

- one `smd-hook` near the opening to create a real technical question;
- `smd-visual` at a conceptual bottleneck, not as decoration;
- existing `smd-flow`, `smd-matrix`, `smd-decision`, and `smd-note` blocks for evidence;
- `smd-meme` only at a cognitive reset where the joke explains a genuine mistake;
- `smd-reveal` after the evidence earns a changed interpretation;
- `smd-checkpoint` after a chapter or before execution.

Prefer a varied page rhythm over a stack of interchangeable cards.

### 4. Plan purposeful images

For every proposed image, write one sentence answering: “What becomes easier to understand after seeing this?”

Generate an image only when that answer is specific. When image generation is available:

1. Choose one visual system for the whole document.
2. Generate images without embedded labels or paragraphs.
3. Put all explanation, terminology, and accessible alt text in Markdown.
4. Save deterministic, versioned assets under a project-local directory such as `assets/story/`.
5. Reference them with relative paths.

Good image jobs include an opening world, a spatial system model, a before/after regime, or a physical analogy. A screenshot or a semantic diagram is better when exact UI or exact structure matters.

### 5. Preserve the technical middle

Keep code fences, tables, equations, citations, and source links intact. Shorten only redundant prose. Introduce each difficult block with context and follow it with the implication, but do not restate every line.

Use progressive disclosure:

- first say why the section matters;
- then show the technical object;
- then state what changes because of it.

### 6. Validate the result

Before finishing:

1. Compare the edited document against the fact inventory.
2. Validate all semantic directives.
3. Confirm every visual and meme has exactly one relative local image.
4. Preview desktop and narrow layouts.
5. Check that removing directive styling still leaves understandable Markdown.
6. Remove any block that is decorative, repetitive, or unsupported.

## Output

Return the updated Markdown and local assets. Report:

- the narrative spine;
- directives and images added;
- facts deliberately left untouched;
- validation and preview results;
- any source ambiguity that remains.
