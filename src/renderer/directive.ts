import {
  FLOW_VARIANTS,
  MATRIX_VARIANTS,
  MEME_VARIANTS,
  NOTE_TONES,
  VISUAL_VARIANTS,
  type FlowVariant,
  type MatrixVariant,
  type MemeVariant,
  type NoteTone,
  type TemplateRegistry,
  type VisualVariant,
} from "../core/registry";
import { type SemanticNode } from "../core/types";
import { type DecisionAnalysis } from "../core/validation";
import { escapeHtml, renderDecisionOpen } from "./decision";

export type SemanticRenderContext = {
  node: SemanticNode;
  analysis?: DecisionAnalysis;
  registry: TemplateRegistry;
};

function themeClasses(registry: TemplateRegistry): string[] {
  return [
    `smd-density--${registry.theme.density}`,
    `smd-radius--${registry.theme.radius}`,
    `smd-accent--${registry.theme.accent}`,
  ];
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeFlowVariant(value: unknown, registry: TemplateRegistry): FlowVariant {
  return typeof value === "string" && FLOW_VARIANTS.includes(value as FlowVariant)
    ? value as FlowVariant
    : registry.directives.flow?.variant ?? "steps";
}

function safeMatrixVariant(value: unknown, registry: TemplateRegistry): MatrixVariant {
  return typeof value === "string" && MATRIX_VARIANTS.includes(value as MatrixVariant)
    ? value as MatrixVariant
    : registry.directives.matrix?.variant ?? "tiers";
}

function safeMemeVariant(value: unknown, registry: TemplateRegistry): MemeVariant {
  return typeof value === "string" && MEME_VARIANTS.includes(value as MemeVariant)
    ? value as MemeVariant
    : registry.directives.meme?.variant ?? "classic";
}

function safeNoteTone(value: unknown, registry: TemplateRegistry): NoteTone {
  return typeof value === "string" && NOTE_TONES.includes(value as NoteTone)
    ? value as NoteTone
    : registry.directives.note?.tone ?? "insight";
}

function safeVisualVariant(value: unknown, registry: TemplateRegistry): VisualVariant {
  return typeof value === "string" && VISUAL_VARIANTS.includes(value as VisualVariant)
    ? value as VisualVariant
    : registry.directives.visual?.variant ?? "scene";
}

function titleMarkup(node: SemanticNode, fallback: string, className: string): {
  id: string;
  markup: string;
} {
  const id = `smd-${node.type}-${node.sourceRange.startUtf16}`;
  const title = safeString(node.props.title);
  return {
    id,
    markup: title
      ? `<h3 class="${className}" id="${id}">${escapeHtml(title)}</h3>`
      : `<span class="smd-sr-only" id="${id}">${fallback}</span>`,
  };
}

function renderFlowOpen(node: SemanticNode, registry: TemplateRegistry): string {
  const variant = safeFlowVariant(node.props.variant, registry);
  const title = titleMarkup(node, "Flow", "smd-semantic__title");
  const classes = [
    "smd-block",
    "smd-flow",
    `smd-flow--${variant}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-semantic__header"><span class="smd-semantic__eyebrow">FLOW</span>${title.markup}</header>`
    : title.markup;
  return `<section class="${classes}" aria-labelledby="${title.id}" data-smd-type="flow" data-smd-variant="${variant}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-flow__content">`;
}

function renderMatrixOpen(node: SemanticNode, registry: TemplateRegistry): string {
  const variant = safeMatrixVariant(node.props.variant, registry);
  const title = titleMarkup(node, "Matrix", "smd-semantic__title");
  const classes = [
    "smd-block",
    "smd-matrix",
    `smd-matrix--${variant}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-semantic__header"><span class="smd-semantic__eyebrow">MATRIX</span>${title.markup}</header>`
    : title.markup;
  return `<section class="${classes}" aria-labelledby="${title.id}" data-smd-type="matrix" data-smd-variant="${variant}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-matrix__content">`;
}

function renderNoteOpen(node: SemanticNode, registry: TemplateRegistry): string {
  const tone = safeNoteTone(node.props.tone, registry);
  const title = titleMarkup(node, "Note", "smd-note__title");
  const classes = [
    "smd-block",
    "smd-note",
    `smd-note--${tone}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-note__header"><span class="smd-note__mark" aria-hidden="true"></span>${title.markup}</header>`
    : title.markup;
  return `<aside class="${classes}" role="note" aria-labelledby="${title.id}" data-smd-type="note" data-smd-tone="${tone}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-note__content">`;
}

function renderMemeOpen(node: SemanticNode, registry: TemplateRegistry): string {
  const variant = safeMemeVariant(node.props.variant, registry);
  const title = titleMarkup(node, "Meme", "smd-meme__title");
  const classes = [
    "smd-block",
    "smd-meme",
    `smd-meme--${variant}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-meme__header"><span class="smd-meme__eyebrow">NOT PEER REVIEWED</span>${title.markup}</header>`
    : title.markup;
  return `<figure class="${classes}" aria-labelledby="${title.id}" data-smd-type="meme" data-smd-variant="${variant}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-meme__content">`;
}

function renderVisualOpen(node: SemanticNode, registry: TemplateRegistry): string {
  const variant = safeVisualVariant(node.props.variant, registry);
  const title = titleMarkup(node, "Visual", "smd-visual__title");
  const classes = [
    "smd-block",
    "smd-visual",
    `smd-visual--${variant}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-visual__header"><span class="smd-visual__eyebrow">VISUAL CHAPTER</span>${title.markup}</header>`
    : title.markup;
  return `<figure class="${classes}" aria-labelledby="${title.id}" data-smd-type="visual" data-smd-variant="${variant}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-visual__content">`;
}

const STORY_BEATS = {
  hook: { label: "THE QUESTION", tag: "aside" },
  reveal: { label: "THE TURN", tag: "section" },
  checkpoint: { label: "KEEP THIS", tag: "section" },
} as const;

function renderStoryBeatOpen(
  node: SemanticNode,
  registry: TemplateRegistry,
  type: keyof typeof STORY_BEATS,
): string {
  const config = STORY_BEATS[type];
  const title = titleMarkup(node, config.label, `smd-${type}__title`);
  const classes = [
    "smd-block",
    "smd-storybeat",
    `smd-${type}`,
    ...themeClasses(registry),
  ].join(" ");
  const header = safeString(node.props.title)
    ? `<header class="smd-storybeat__header"><span class="smd-storybeat__eyebrow">${config.label}</span>${title.markup}</header>`
    : `<span class="smd-storybeat__eyebrow" aria-hidden="true">${config.label}</span>${title.markup}`;
  return `<${config.tag} class="${classes}" aria-labelledby="${title.id}" data-smd-type="${type}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-storybeat__content">`;
}

export function renderSemanticOpen(context: SemanticRenderContext): string {
  switch (context.node.type) {
    case "decision":
      return context.analysis
        ? renderDecisionOpen({
            node: context.node,
            analysis: context.analysis,
            registry: context.registry,
          })
        : "";
    case "flow":
      return renderFlowOpen(context.node, context.registry);
    case "matrix":
      return renderMatrixOpen(context.node, context.registry);
    case "meme":
      return renderMemeOpen(context.node, context.registry);
    case "note":
      return renderNoteOpen(context.node, context.registry);
    case "visual":
      return renderVisualOpen(context.node, context.registry);
    case "hook":
      return renderStoryBeatOpen(context.node, context.registry, "hook");
    case "reveal":
      return renderStoryBeatOpen(context.node, context.registry, "reveal");
    case "checkpoint":
      return renderStoryBeatOpen(context.node, context.registry, "checkpoint");
    default:
      return "";
  }
}

export function renderSemanticClose(node: SemanticNode): string {
  if (node.type === "note" || node.type === "hook") {
    return "</div></aside>";
  }
  if (node.type === "meme" || node.type === "visual") {
    return "</div></figure>";
  }
  return "</div></section>";
}
