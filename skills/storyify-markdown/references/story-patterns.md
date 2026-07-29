# Story patterns and directive contract

Use this reference after reading the full source document.

## Beat selection

| Reader need | Directive | Content shape | Use sparingly when |
|---|---|---|---|
| A reason to continue | `smd-hook` | One title plus a short paragraph | The title is merely sensational |
| A mental model | `smd-visual` | One local image plus a caption | The image repeats nearby prose |
| A sequence | `smd-flow` | One Markdown list | The order is not meaningful |
| A comparison or taxonomy | `smd-matrix` | One Markdown table | The table is tiny |
| A consequential choice | `smd-decision` | Prose or one table | No decision is being made |
| A rule or caveat | `smd-note` | Short body copy | Everything is being called important |
| A memorable failure mode | `smd-meme` | One local image plus punchline | The topic is sensitive or the joke is forced |
| A changed interpretation | `smd-reveal` | Title plus short explanation | Evidence has not earned the turn |
| A compact memory aid | `smd-checkpoint` | One list | The list only repeats headings |

## Narrative directives

### Hook

Ask the technical question that the document will actually answer.

```md
:::smd-hook title="It scored 0.99 R². Did it learn the science—or recognise the paper?"
Follow the evidence before trusting the score.
:::
```

Use one near the opening. Preserve uncertainty in the title if the source is uncertain.

### Visual chapter

Use exactly one relative local Markdown image.

```md
:::smd-visual title="One formulation, three representations" variant="scene"
![One formulation branches into three alternative feature encodings.](./assets/story/composition-encoding-v1.jpg)

These encodings are alternate views of one formulation, not independent signals.
:::
```

Variants:

- `hero`: an opening world or end-to-end system, image first and wide;
- `scene`: an explanatory image beside a concise caption;
- `split`: a contrast, transition, or before/after regime.

The image should carry shape, space, process, or emotion. Keep exact labels and claims in the caption.

### Reveal

State the interpretation that changes after the preceding evidence.

```md
:::smd-reveal title="The model learned the paper, not the material."
Grouped validation removes the shortcut and exposes the honest estimate.
:::
```

Do not introduce a new unsupported claim in a reveal.

### Checkpoint

Use one ordered or unordered Markdown list.

```md
:::smd-checkpoint title="Keep these rules"
1. Split by paper.
2. Preserve test conditions.
3. Start with one compact composition encoding.
:::
```

Three to five items is usually enough.

## Supporting evidence directives

```md
:::smd-flow title="The learning task" variant="equation"
1. Composition
2. Conditions
3. Measured property
:::
```

```md
:::smd-matrix title="Feature contract" variant="tiers"
| Tier | Columns | Treatment |
|---|---|---|
| Must | `role_*_wt` | Train on these |
| Discard | IDs | Keep for audit only |
:::
```

```md
:::smd-note title="Leakage rule" tone="critical"
Rows from one paper are not independent.
:::
```

```md
:::smd-meme title="RANDOM SPLIT: WE ARE SO BACK." variant="classic"
![The same paper enters both train and test wearing a disguise.](./assets/memes/random-split-v1.jpg)

**Same paper:** Put on a moustache and take the test again.
:::
```

## Cadence

A medium technical article usually needs fewer blocks than expected:

- one hook;
- one image per major conceptual bottleneck, commonly every 400–800 words;
- zero or one meme per chapter;
- one reveal for a genuine change in interpretation;
- one checkpoint after a meaningful unit.

Alternate modes: prose → visual → evidence → prose → decision. Avoid repeated full-width cards.

## Image direction

Keep a coherent visual system across a document:

- repeated material, palette, lighting, camera angle family, and character design;
- one visual metaphor per image;
- no embedded body text, legends, code, or fake UI;
- high contrast around the conceptual subject;
- enough quiet space for responsive crops;
- no branding or imitation of a living artist.

Name assets by concept and version, for example:

```text
assets/story/system-world-v1.jpg
assets/story/encoding-fork-v1.jpg
assets/story/temperature-regimes-v1.jpg
```

## Final factual audit

Compare source and output for:

- changed numbers or units;
- renamed code symbols;
- missing qualifiers such as “may,” “often,” or “in this dataset”;
- causal language added where the source only showed correlation;
- a joke that implies a claim stronger than the evidence;
- visual captions that contradict the body;
- remote, absolute, or missing asset paths.
