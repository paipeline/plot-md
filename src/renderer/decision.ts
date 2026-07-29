import { type TemplateRegistry } from "../core/registry";
import { type SemanticNode } from "../core/types";
import { type DecisionAnalysis } from "../core/validation";

export type DecisionRenderContext = {
  node: SemanticNode;
  analysis: DecisionAnalysis;
  registry: TemplateRegistry;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeDecisionStatus(value: unknown): "proposed" | "accepted" | "superseded" | undefined {
  return value === "proposed" || value === "accepted" || value === "superseded" ? value : undefined;
}

export function renderDecisionOpen({ node, analysis, registry }: DecisionRenderContext): string {
  const labelId = `smd-decision-${node.sourceRange.startUtf16}`;
  const title = typeof node.props.title === "string" ? node.props.title.trim() : "";
  const status = safeDecisionStatus(node.props.status);
  const classes = [
    "smd-block",
    "smd-decision",
    `smd-decision--${analysis.effectiveVariant}`,
    `smd-density--${registry.theme.density}`,
    `smd-radius--${registry.theme.radius}`,
    `smd-accent--${registry.theme.accent}`,
  ].join(" ");

  const label = title
    ? `<h3 class="smd-decision__title" id="${labelId}">${escapeHtml(title)}</h3>`
    : `<span class="smd-sr-only" id="${labelId}">Decision</span>`;
  const badge = status
    ? `<span class="smd-status smd-status--${status}"><span class="smd-status__dot" aria-hidden="true"></span>${escapeHtml(status)}</span>`
    : "";
  const header = title || badge
    ? `<header class="smd-decision__header">${label}${badge}</header>`
    : label;

  return `<section class="${classes}" aria-labelledby="${labelId}" data-smd-type="decision" data-smd-variant="${analysis.effectiveVariant}" data-smd-source-start="${node.sourceRange.startUtf16}">${header}<div class="smd-decision__content">`;
}

export function renderDecisionClose(): string {
  return "</div></section>";
}
