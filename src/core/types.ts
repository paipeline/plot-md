export type SemanticValue = string | number | boolean;

export type ContentKind = "table" | "list" | "body" | "mixed";

export type DiagnosticSeverity = "error" | "warning";

export type SourceRange = {
  startUtf16: number;
  endUtf16Exclusive: number;
};

export type SemanticDiagnostic = {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  range: SourceRange;
};

export type ParsedDirectiveOpener = {
  matched: boolean;
  type?: string;
  props: Record<string, SemanticValue>;
  propRanges: Record<string, SourceRange>;
  diagnostics: SemanticDiagnostic[];
};

export type SemanticNode = {
  type: string;
  props: Record<string, SemanticValue>;
  propRanges: Record<string, SourceRange>;
  sourceRange: SourceRange;
  openerRange: SourceRange;
  contentRange: SourceRange;
  contentKind: ContentKind;
  contentSource: string;
  rawSource: string;
  startLine: number;
  endLineExclusive: number;
};

export type ScanResult = {
  nodes: SemanticNode[];
  diagnostics: SemanticDiagnostic[];
};
