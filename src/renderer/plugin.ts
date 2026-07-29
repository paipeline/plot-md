import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { type TemplateRegistry } from "../core/registry";
import { MAX_DIRECTIVE_BYTES, parseDirectiveOpener } from "../core/scanner";
import { type SemanticNode } from "../core/types";
import {
  KNOWN_DIRECTIVE_TYPES,
  type DecisionAnalysis,
  type KnownDirectiveType,
  validateSemanticMarkdown,
} from "../core/validation";
import { renderSemanticClose, renderSemanticOpen } from "./directive";

export type SemanticMarkdownPluginOptions = {
  getRegistry: () => TemplateRegistry;
};

type MarkdownEnvironment = Record<string, unknown> & {
  __smdDepth?: number;
};

type BlockState = {
  src: string;
  bMarks: number[];
  eMarks: number[];
  tShift: number[];
  line: number;
  parentType: string;
  md: MarkdownIt;
  env: MarkdownEnvironment;
  tokens: Token[];
  push(type: string, tag: string, nesting: number): Token;
};

type SemanticTokenMeta = {
  node: SemanticNode;
  analysis?: DecisionAnalysis;
  registry: TemplateRegistry;
};

function lineText(state: BlockState, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

function shiftNode(node: SemanticNode, offset: number, lineOffset: number): SemanticNode {
  const shiftRange = (range: { startUtf16: number; endUtf16Exclusive: number }) => ({
    startUtf16: range.startUtf16 + offset,
    endUtf16Exclusive: range.endUtf16Exclusive + offset,
  });
  return {
    ...node,
    sourceRange: shiftRange(node.sourceRange),
    openerRange: shiftRange(node.openerRange),
    contentRange: shiftRange(node.contentRange),
    propRanges: Object.fromEntries(Object.entries(node.propRanges).map(([key, range]) => [key, shiftRange(range)])),
    startLine: node.startLine + lineOffset,
    endLineExclusive: node.endLineExclusive + lineOffset,
  };
}

function rebaseChildTokenMaps(tokens: Token[], lineOffset: number, levelOffset: number): void {
  for (const token of tokens) {
    if (token.map) {
      token.map = [token.map[0] + lineOffset, token.map[1] + lineOffset];
    }
    token.level += levelOffset;
  }
}

function markOutcomeParagraph(tokens: Token[]): void {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].type !== "paragraph_open" || tokens[index + 1].type !== "inline") {
      continue;
    }
    const inlineSource = tokens[index + 1].content.trimStart();
    if (inlineSource.startsWith("**Outcome:**") || inlineSource.startsWith("**结论：**")) {
      tokens[index].attrJoin("class", "smd-outcome");
    }
  }
}

function markComparisonTable(tokens: Token[], analysis: DecisionAnalysis): void {
  if (analysis.effectiveVariant !== "comparison") {
    return;
  }
  const table = tokens.find((token) => token.type === "table_open");
  table?.attrJoin("class", "smd-comparison-table");
}

function isLocalAssetSource(source: string): boolean {
  return !source.startsWith("/")
    && !source.startsWith("\\")
    && !source.startsWith("#")
    && !/^[a-z][a-z0-9+.-]*:/iu.test(source);
}

type LocalImageKind = "meme" | "visual";

function prepareLocalImage(tokens: Token[], kind: LocalImageKind): void {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].type !== "paragraph_open" || tokens[index + 1].type !== "inline") {
      continue;
    }
    const inline = tokens[index + 1];
    if (!inline.content.trimStart().startsWith("![")) {
      continue;
    }
    tokens[index].attrJoin("class", `smd-${kind}__visual`);
    inline.meta = {
      ...(inline.meta && typeof inline.meta === "object" ? inline.meta as Record<string, unknown> : {}),
      __smdLocalImageKind: kind,
    };
    return;
  }
}

function markRenderedLocalImages(tokens: Token[]): void {
  for (const token of tokens) {
    const meta = token.meta as Record<string, unknown> | null;
    const kind = meta?.__smdLocalImageKind;
    if (token.type !== "inline" || (kind !== "meme" && kind !== "visual")) {
      continue;
    }
    const image = token.children?.find((child) => child.type === "image");
    if (!image) {
      continue;
    }
    image.attrJoin("class", `smd-${kind}__image`);
    const source = image.attrGet("src") ?? "";
    if (!isLocalAssetSource(source)) {
      image.attrSet("src", "");
      image.attrSet("data-smd-invalid-src", "true");
    }
  }
}

function markSemanticChildren(tokens: Token[], meta: SemanticTokenMeta): void {
  if (meta.node.type === "decision" && meta.analysis) {
    markOutcomeParagraph(tokens);
    markComparisonTable(tokens, meta.analysis);
    return;
  }
  if (meta.node.type === "flow") {
    const list = tokens.find((token) => token.type === "ordered_list_open" || token.type === "bullet_list_open");
    list?.attrJoin("class", "smd-flow-list");
    return;
  }
  if (meta.node.type === "matrix") {
    const table = tokens.find((token) => token.type === "table_open");
    table?.attrJoin("class", "smd-matrix-table");
    return;
  }
  if (meta.node.type === "meme") {
    prepareLocalImage(tokens, "meme");
    return;
  }
  if (meta.node.type === "visual") {
    prepareLocalImage(tokens, "visual");
    return;
  }
  if (meta.node.type === "checkpoint") {
    const list = tokens.find((token) => token.type === "ordered_list_open" || token.type === "bullet_list_open");
    list?.attrJoin("class", "smd-checkpoint-list");
  }
}

function createDirectiveRule(options: SemanticMarkdownPluginOptions) {
  return (state: BlockState, startLine: number, endLine: number, silent: boolean): boolean => {
    if (state.parentType !== "root" || (state.env.__smdDepth ?? 0) > 0 || state.tShift[startLine] !== 0) {
      return false;
    }

    const openerSource = lineText(state, startLine);
    const opener = parseDirectiveOpener(openerSource, state.bMarks[startLine]);
    if (
      !opener.matched ||
      !opener.type ||
      !KNOWN_DIRECTIVE_TYPES.includes(opener.type as KnownDirectiveType) ||
      opener.diagnostics.length > 0
    ) {
      return false;
    }

    let closerLine = -1;
    for (let line = startLine + 1; line < endLine; line += 1) {
      if (state.tShift[line] === 0 && lineText(state, line).trim() === ":::") {
        closerLine = line;
        break;
      }
    }
    if (closerLine === -1) {
      return false;
    }

    const rawStart = state.bMarks[startLine];
    const rawEnd = state.eMarks[closerLine];
    if (rawEnd - rawStart > MAX_DIRECTIVE_BYTES) {
      return false;
    }
    if (silent) {
      return true;
    }

    const rawSource = state.src.slice(rawStart, rawEnd);
    const registry = options.getRegistry();
    const validation = validateSemanticMarkdown(rawSource, registry);
    const localNode = validation.nodes[0];
    if (!localNode) {
      return false;
    }
    const localAnalysis = validation.decisionAnalyses.get(localNode);
    if (localNode.type === "decision" && !localAnalysis) {
      return false;
    }
    const node = shiftNode(localNode, rawStart, startLine);
    const meta: SemanticTokenMeta = {
      node,
      registry,
      ...(localAnalysis ? { analysis: localAnalysis } : {}),
    };

    const open = state.push("smd_directive_open", "section", 1);
    open.block = true;
    open.map = [startLine, closerLine + 1];
    open.meta = meta;

    const contentStart = state.eMarks[startLine] < state.src.length && state.src[state.eMarks[startLine]] === "\r"
      ? state.eMarks[startLine] + 2
      : state.eMarks[startLine] + 1;
    const contentEnd = state.bMarks[closerLine];
    const contentSource = state.src.slice(contentStart, contentEnd);
    const childTokens: Token[] = [];
    const previousDepth = state.env.__smdDepth ?? 0;
    try {
      state.env.__smdDepth = previousDepth + 1;
      state.md.block.parse(contentSource, state.md, state.env, childTokens);
    } finally {
      state.env.__smdDepth = previousDepth;
    }
    rebaseChildTokenMaps(childTokens, startLine + 1, open.level + 1);
    markSemanticChildren(childTokens, meta);
    state.tokens.push(...childTokens);

    const close = state.push("smd_directive_close", "section", -1);
    close.block = true;
    close.meta = meta;
    state.line = closerLine + 1;
    return true;
  };
}

export function semanticMarkdownPlugin(md: MarkdownIt, options: SemanticMarkdownPluginOptions): MarkdownIt {
  md.block.ruler.before("fence", "smd_directive", createDirectiveRule(options) as never, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.core.ruler.after("inline", "smd_local_images", (state) => {
    markRenderedLocalImages(state.tokens);
  });

  md.renderer.rules.smd_directive_open = (tokens, index) => {
    const meta = tokens[index].meta as SemanticTokenMeta;
    return renderSemanticOpen(meta);
  };
  md.renderer.rules.smd_directive_close = (tokens, index) => {
    const meta = tokens[index].meta as SemanticTokenMeta;
    return renderSemanticClose(meta.node);
  };
  return md;
}
