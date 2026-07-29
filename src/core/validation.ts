import {
  DECISION_VARIANTS,
  FLOW_VARIANTS,
  MATRIX_VARIANTS,
  MEME_VARIANTS,
  NOTE_TONES,
  VISUAL_VARIANTS,
  type DecisionVariant,
  type TemplateRegistry,
} from "./registry";
import { scanSemanticMarkdown } from "./scanner";
import { type ScanResult, type SemanticDiagnostic, type SemanticNode, type SourceRange } from "./types";

export const KNOWN_DIRECTIVE_TYPES = [
  "decision",
  "flow",
  "matrix",
  "meme",
  "note",
  "hook",
  "visual",
  "reveal",
  "checkpoint",
] as const;
export type KnownDirectiveType = (typeof KNOWN_DIRECTIVE_TYPES)[number];

const DECISION_STATUSES = ["proposed", "accepted", "superseded"] as const;
const DIRECTIVE_PROPS: Record<KnownDirectiveType, readonly string[]> = {
  decision: ["id", "status", "title", "variant"],
  flow: ["title", "variant"],
  matrix: ["title", "variant"],
  meme: ["title", "variant"],
  note: ["title", "tone"],
  hook: ["title"],
  visual: ["title", "variant"],
  reveal: ["title"],
  checkpoint: ["title"],
};

export type DecisionAnalysis = {
  tableCount: number;
  tableRowCount: number;
  hasBody: boolean;
  hasOutcome: boolean;
  requestedVariant: DecisionVariant;
  effectiveVariant: DecisionVariant;
};

export type ValidationResult = ScanResult & {
  decisionAnalyses: Map<SemanticNode, DecisionAnalysis>;
};

function makeDiagnostic(
  code: string,
  message: string,
  severity: "error" | "warning",
  range: SourceRange,
): SemanticDiagnostic {
  return { code, message, severity, range };
}

function rangeForProp(node: SemanticNode, prop: string): SourceRange {
  return node.propRanges[prop] ?? node.openerRange;
}

function countTablesAndRows(content: string): { tableCount: number; tableRowCount: number } {
  const lines = content.split(/\r?\n/);
  let tableCount = 0;
  let tableRowCount = 0;
  let insideTable = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] ?? "";
    const isRow = /^\s*\|?.+\|.+\|?\s*$/.test(line);
    const nextIsDelimiter = /^\s*\|?\s*:?-{3,}/.test(next);
    if (isRow && nextIsDelimiter) {
      tableCount += 1;
      insideTable = true;
      index += 1;
      continue;
    }
    if (insideTable && isRow) {
      tableRowCount += 1;
      continue;
    }
    if (line.trim() !== "") {
      insideTable = false;
    }
  }
  return { tableCount, tableRowCount };
}

function markdownImageDestinations(content: string): string[] {
  const destinations: string[] = [];
  const pattern = /!\[[^\]\r\n]*\]\(\s*(?:<([^>\r\n]+)>|([^\s)\r\n]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/gu;
  for (const match of content.matchAll(pattern)) {
    destinations.push(match[1] ?? match[2] ?? "");
  }
  return destinations;
}

function isLocalAssetPath(destination: string): boolean {
  return !destination.startsWith("/")
    && !destination.startsWith("\\")
    && !destination.startsWith("#")
    && !/^[a-z][a-z0-9+.-]*:/iu.test(destination);
}

function analyzeDecision(node: SemanticNode, registry: TemplateRegistry): DecisionAnalysis {
  const { tableCount, tableRowCount } = countTablesAndRows(node.contentSource);
  const hasOutcome = /^(?:\s*)\*\*(?:Outcome:|结论：)\*\*/mu.test(node.contentSource);
  const hasBody = node.contentSource
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("|") && !/^\|?\s*:?-{3,}/.test(trimmed);
    });
  const directiveVariant = node.props.variant;
  const requestedVariant = typeof directiveVariant === "string" && DECISION_VARIANTS.includes(directiveVariant as DecisionVariant)
    ? directiveVariant as DecisionVariant
    : registry.directives.decision.variant;

  let effectiveVariant = requestedVariant;
  if (requestedVariant === "comparison" && tableCount !== 1) {
    effectiveVariant = "summary";
  }
  if (requestedVariant === "record" && !hasBody && !hasOutcome) {
    effectiveVariant = "summary";
  }

  return { tableCount, tableRowCount, hasBody, hasOutcome, requestedVariant, effectiveVariant };
}

function validateAllowedProperties(
  node: SemanticNode,
  type: KnownDirectiveType,
  diagnostics: SemanticDiagnostic[],
): void {
  const allowed = DIRECTIVE_PROPS[type];
  for (const prop of Object.keys(node.props)) {
    if (!allowed.includes(prop)) {
      diagnostics.push(
        makeDiagnostic(
          "unknown_property",
          `Property ${prop} is not allowed on smd-${type}. Allowed properties: ${allowed.join(", ")}.`,
          "error",
          rangeForProp(node, prop),
        ),
      );
    }
  }
}

function validateStringProperty(
  node: SemanticNode,
  prop: string,
  diagnostics: SemanticDiagnostic[],
): void {
  if (node.props[prop] !== undefined && typeof node.props[prop] !== "string") {
    diagnostics.push(
      makeDiagnostic(
        "invalid_string_property",
        `${node.type}.${prop} must be a double-quoted string.`,
        "error",
        rangeForProp(node, prop),
      ),
    );
  }
}

function validateEnumProperty<T extends readonly string[]>(
  node: SemanticNode,
  prop: string,
  allowed: T,
  diagnostics: SemanticDiagnostic[],
): void {
  const value = node.props[prop];
  if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) {
    diagnostics.push(
      makeDiagnostic(
        `invalid_${node.type}_${prop}`,
        `${node.type}.${prop} must be one of: ${allowed.join(", ")}.`,
        "error",
        rangeForProp(node, prop),
      ),
    );
  }
}

function validateDecision(
  node: SemanticNode,
  registry: TemplateRegistry,
  diagnostics: SemanticDiagnostic[],
): DecisionAnalysis {
  validateEnumProperty(node, "status", DECISION_STATUSES, diagnostics);
  validateEnumProperty(node, "variant", DECISION_VARIANTS, diagnostics);
  validateStringProperty(node, "id", diagnostics);
  validateStringProperty(node, "title", diagnostics);

  const analysis = analyzeDecision(node, registry);
  if (analysis.tableRowCount > 200) {
    diagnostics.push(
      makeDiagnostic(
        "table_row_limit",
        "Semantic tables may contain at most 200 data rows.",
        "error",
        node.contentRange,
      ),
    );
  }
  if (analysis.requestedVariant !== analysis.effectiveVariant) {
    const reason = analysis.requestedVariant === "comparison"
      ? "comparison requires exactly one table"
      : "record requires body content or an Outcome paragraph";
    diagnostics.push(
      makeDiagnostic(
        "variant_incompatible",
        `decision variant ${analysis.requestedVariant} is incompatible: ${reason}. Renderer falls back to summary.`,
        "warning",
        rangeForProp(node, "variant"),
      ),
    );
  }
  return analysis;
}

function validateFlow(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  validateEnumProperty<typeof FLOW_VARIANTS>(node, "variant", FLOW_VARIANTS, diagnostics);
  if (node.contentKind !== "list") {
    diagnostics.push(
      makeDiagnostic(
        "flow_requires_list",
        "smd-flow requires one Markdown list and no extra body content.",
        "warning",
        node.contentRange,
      ),
    );
  }
}

function validateMatrix(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  validateEnumProperty<typeof MATRIX_VARIANTS>(node, "variant", MATRIX_VARIANTS, diagnostics);
  const { tableCount, tableRowCount } = countTablesAndRows(node.contentSource);
  if (tableCount !== 1) {
    diagnostics.push(
      makeDiagnostic(
        "matrix_requires_table",
        "smd-matrix requires exactly one Markdown table.",
        "warning",
        node.contentRange,
      ),
    );
  }
  if (tableRowCount > 200) {
    diagnostics.push(
      makeDiagnostic(
        "table_row_limit",
        "Semantic tables may contain at most 200 data rows.",
        "error",
        node.contentRange,
      ),
    );
  }
}

function validateMeme(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  validateEnumProperty<typeof MEME_VARIANTS>(node, "variant", MEME_VARIANTS, diagnostics);
  validateLocalImageBlock(node, diagnostics);
}

function validateLocalImageBlock(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  const images = markdownImageDestinations(node.contentSource);
  if (images.length !== 1) {
    diagnostics.push(
      makeDiagnostic(
        `${node.type}_requires_one_image`,
        `smd-${node.type} requires exactly one inline Markdown image.`,
        "error",
        node.contentRange,
      ),
    );
  } else if (!isLocalAssetPath(images[0])) {
    diagnostics.push(
      makeDiagnostic(
        `${node.type}_requires_local_image`,
        `smd-${node.type} images must use a relative local asset path.`,
        "error",
        node.contentRange,
      ),
    );
  }
}

function validateVisual(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  validateEnumProperty<typeof VISUAL_VARIANTS>(node, "variant", VISUAL_VARIANTS, diagnostics);
  validateLocalImageBlock(node, diagnostics);
}

function validateNarrativeText(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  if (node.contentSource.trim().length === 0) {
    diagnostics.push(
      makeDiagnostic(
        `${node.type}_requires_content`,
        `smd-${node.type} requires body content.`,
        "error",
        node.contentRange,
      ),
    );
  }
}

function validateCheckpoint(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  if (node.contentKind !== "list") {
    diagnostics.push(
      makeDiagnostic(
        "checkpoint_requires_list",
        "smd-checkpoint requires one Markdown list and no extra body content.",
        "warning",
        node.contentRange,
      ),
    );
  }
}

function validateNote(node: SemanticNode, diagnostics: SemanticDiagnostic[]): void {
  validateStringProperty(node, "title", diagnostics);
  validateEnumProperty<typeof NOTE_TONES>(node, "tone", NOTE_TONES, diagnostics);
  if (node.contentSource.trim().length === 0) {
    diagnostics.push(
      makeDiagnostic(
        "note_requires_content",
        "smd-note requires body content.",
        "error",
        node.contentRange,
      ),
    );
  }
}

export function validateSemanticMarkdown(source: string, registry: TemplateRegistry): ValidationResult {
  const scan = scanSemanticMarkdown(source);
  const diagnostics = [...scan.diagnostics];
  const decisionAnalyses = new Map<SemanticNode, DecisionAnalysis>();
  const decisionIds = new Map<string, SemanticNode>();

  for (const node of scan.nodes) {
    if (!KNOWN_DIRECTIVE_TYPES.includes(node.type as KnownDirectiveType)) {
      diagnostics.push(
        makeDiagnostic(
          "unknown_type",
          `Unknown semantic directive smd-${node.type}. Supported directives: ${KNOWN_DIRECTIVE_TYPES.map((type) => `smd-${type}`).join(", ")}.`,
          "error",
          node.openerRange,
        ),
      );
      continue;
    }

    const type = node.type as KnownDirectiveType;
    validateAllowedProperties(node, type, diagnostics);
    switch (type) {
      case "decision": {
        const analysis = validateDecision(node, registry, diagnostics);
        decisionAnalyses.set(node, analysis);
        const id = node.props.id;
        if (typeof id === "string" && id.length > 0) {
          const existing = decisionIds.get(id);
          if (existing) {
            diagnostics.push(
              makeDiagnostic(
                "duplicate_decision_id",
                `Decision id ${id} is already used earlier in this file.`,
                "error",
                rangeForProp(node, "id"),
              ),
            );
          } else {
            decisionIds.set(id, node);
          }
        }
        break;
      }
      case "flow":
        validateFlow(node, diagnostics);
        break;
      case "matrix":
        validateMatrix(node, diagnostics);
        break;
      case "meme":
        validateMeme(node, diagnostics);
        break;
      case "note":
        validateNote(node, diagnostics);
        break;
      case "visual":
        validateVisual(node, diagnostics);
        break;
      case "checkpoint":
        validateCheckpoint(node, diagnostics);
        break;
      case "hook":
      case "reveal":
        validateNarrativeText(node, diagnostics);
        break;
    }
  }

  return { nodes: scan.nodes, diagnostics, decisionAnalyses };
}
