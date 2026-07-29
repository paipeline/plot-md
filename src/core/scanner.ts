import {
  type ContentKind,
  type ParsedDirectiveOpener,
  type ScanResult,
  type SemanticDiagnostic,
  type SemanticNode,
  type SemanticValue,
  type SourceRange,
} from "./types";

export const MAX_DIRECTIVE_BYTES = 128 * 1024;
export const MAX_DIRECTIVES_PER_DOCUMENT = 100;

type SourceLine = {
  text: string;
  start: number;
  end: number;
  endIncludingNewline: number;
};

const VALID_TYPE = /^[a-z][a-z0-9-]{0,27}$/;
const VALID_PROP = /^[a-z][A-Za-z0-9]{0,31}$/;

function diagnostic(
  code: string,
  message: string,
  range: SourceRange,
  severity: "error" | "warning" = "error",
): SemanticDiagnostic {
  return { code, message, range, severity };
}

function splitSourceLines(source: string): SourceLine[] {
  if (source.length === 0) {
    return [];
  }

  const lines: SourceLine[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const newline = source.indexOf("\n", cursor);
    const rawEnd = newline === -1 ? source.length : newline;
    const end = rawEnd > cursor && source.charCodeAt(rawEnd - 1) === 13 ? rawEnd - 1 : rawEnd;
    lines.push({
      text: source.slice(cursor, end),
      start: cursor,
      end,
      endIncludingNewline: newline === -1 ? source.length : newline + 1,
    });
    cursor = newline === -1 ? source.length : newline + 1;
  }
  return lines;
}

function parseQuotedValue(
  input: string,
  cursor: number,
  absoluteStart: number,
): { value?: string; cursor: number; diagnostics: SemanticDiagnostic[] } {
  const diagnostics: SemanticDiagnostic[] = [];
  let result = "";
  let position = cursor + 1;

  while (position < input.length) {
    const character = input[position];
    if (character === '"') {
      return { value: result, cursor: position + 1, diagnostics };
    }
    if (character === "\\") {
      const escaped = input[position + 1];
      if (escaped === '"' || escaped === "\\") {
        result += escaped;
        position += 2;
        continue;
      }
      diagnostics.push(
        diagnostic(
          "unknown_escape",
          "Only \\\" and \\\\ escapes are allowed in directive strings.",
          { startUtf16: absoluteStart + position, endUtf16Exclusive: absoluteStart + Math.min(position + 2, input.length) },
        ),
      );
      position += Math.min(2, input.length - position);
      continue;
    }
    result += character;
    position += 1;
  }

  diagnostics.push(
    diagnostic(
      "unclosed_string",
      "Directive string value is missing a closing quote.",
      { startUtf16: absoluteStart + cursor, endUtf16Exclusive: absoluteStart + input.length },
    ),
  );
  return { cursor: input.length, diagnostics };
}

function parseBareValue(input: string, cursor: number): { value?: SemanticValue; cursor: number } {
  let end = cursor;
  while (end < input.length && !/\s/.test(input[end])) {
    end += 1;
  }
  const raw = input.slice(cursor, end);
  if (raw === "true") {
    return { value: true, cursor: end };
  }
  if (raw === "false") {
    return { value: false, cursor: end };
  }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) {
    const number = Number(raw);
    if (Number.isFinite(number)) {
      return { value: number, cursor: end };
    }
  }
  return { cursor: end };
}

export function parseDirectiveOpener(line: string, absoluteStart = 0): ParsedDirectiveOpener {
  if (!line.startsWith(":::smd-")) {
    return { matched: false, props: {}, propRanges: {}, diagnostics: [] };
  }

  const diagnostics: SemanticDiagnostic[] = [];
  const props: Record<string, SemanticValue> = {};
  const propRanges: Record<string, SourceRange> = {};
  let cursor = ":::smd-".length;
  const typeStart = cursor;
  while (cursor < line.length && !/\s/.test(line[cursor])) {
    cursor += 1;
  }
  const type = line.slice(typeStart, cursor);

  if (!VALID_TYPE.test(type) || `smd-${type}`.length > 32) {
    diagnostics.push(
      diagnostic(
        "invalid_type",
        "Directive type must match [a-z][a-z0-9-]{0,27} and stay within 32 characters including smd-.",
        { startUtf16: absoluteStart + typeStart, endUtf16Exclusive: absoluteStart + cursor },
      ),
    );
  }

  while (cursor < line.length) {
    while (cursor < line.length && /\s/.test(line[cursor])) {
      cursor += 1;
    }
    if (cursor >= line.length) {
      break;
    }

    const nameStart = cursor;
    while (cursor < line.length && /[A-Za-z0-9]/.test(line[cursor])) {
      cursor += 1;
    }
    const name = line.slice(nameStart, cursor);
    if (!VALID_PROP.test(name)) {
      const invalidEnd = Math.max(cursor, nameStart + 1);
      diagnostics.push(
        diagnostic(
          "invalid_property_name",
          "Property names must match [a-z][A-Za-z0-9]{0,31}.",
          { startUtf16: absoluteStart + nameStart, endUtf16Exclusive: absoluteStart + invalidEnd },
        ),
      );
      break;
    }
    if (line[cursor] !== "=") {
      diagnostics.push(
        diagnostic(
          "missing_property_equals",
          `Property ${name} must be followed by = and a value.`,
          { startUtf16: absoluteStart + nameStart, endUtf16Exclusive: absoluteStart + cursor },
        ),
      );
      break;
    }
    cursor += 1;
    const valueStart = cursor;
    let value: SemanticValue | undefined;

    if (line[cursor] === '"') {
      const parsed = parseQuotedValue(line, cursor, absoluteStart);
      value = parsed.value;
      cursor = parsed.cursor;
      diagnostics.push(...parsed.diagnostics);
    } else {
      const parsed = parseBareValue(line, cursor);
      value = parsed.value;
      cursor = parsed.cursor;
      if (value === undefined) {
        diagnostics.push(
          diagnostic(
            "invalid_property_value",
            `Property ${name} must use a double-quoted string, finite number, true, or false.`,
            { startUtf16: absoluteStart + valueStart, endUtf16Exclusive: absoluteStart + cursor },
          ),
        );
      }
    }

    if (cursor < line.length && !/\s/.test(line[cursor])) {
      diagnostics.push(
        diagnostic(
          "missing_property_separator",
          `Property ${name} must be separated from the next property by whitespace.`,
          { startUtf16: absoluteStart + cursor, endUtf16Exclusive: absoluteStart + Math.min(cursor + 1, line.length) },
        ),
      );
      break;
    }

    const valueRange = { startUtf16: absoluteStart + valueStart, endUtf16Exclusive: absoluteStart + cursor };
    if (Object.prototype.hasOwnProperty.call(props, name)) {
      diagnostics.push(diagnostic("duplicate_property", `Property ${name} is declared more than once.`, valueRange));
    } else if (value !== undefined) {
      props[name] = value;
      propRanges[name] = valueRange;
    }
  }

  return { matched: true, type, props, propRanges, diagnostics };
}

function detectContentKind(content: string): ContentKind {
  const lines = content.split(/\r?\n/);
  const hasTable = lines.some((line) => /^\s*\|?.+\|.+\|?\s*$/.test(line))
    && lines.some((line) => /^\s*\|?\s*:?-{3,}/.test(line));
  const hasList = lines.some((line) => /^\s*(?:\d+[.)]|[-+*])\s+/.test(line));
  const hasBody = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0
      && !/^\|/.test(trimmed)
      && !/^\d+[.)]\s+/.test(trimmed)
      && !/^[-+*]\s+/.test(trimmed);
  });
  const kinds = Number(hasTable) + Number(hasList) + Number(hasBody);
  if (kinds > 1) return "mixed";
  if (hasTable) return "table";
  if (hasList) return "list";
  return "body";
}

export function scanSemanticMarkdown(source: string): ScanResult {
  const lines = splitSourceLines(source);
  const nodes: SemanticNode[] = [];
  const diagnostics: SemanticDiagnostic[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const openerLine = lines[index];
    const opener = parseDirectiveOpener(openerLine.text, openerLine.start);
    if (!opener.matched) {
      continue;
    }
    diagnostics.push(...opener.diagnostics);

    let closerIndex = -1;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].text.trim() === ":::") {
        closerIndex = cursor;
        break;
      }
      const nested = parseDirectiveOpener(lines[cursor].text, lines[cursor].start);
      if (nested.matched) {
        diagnostics.push(
          diagnostic(
            "nested_directive",
            "Semantic directives cannot be nested; the inner opener is treated as literal content.",
            { startUtf16: lines[cursor].start, endUtf16Exclusive: lines[cursor].end },
          ),
        );
      }
    }

    if (closerIndex === -1) {
      diagnostics.push(
        diagnostic(
          "unclosed_directive",
          `smd-${opener.type ?? "unknown"} is missing a closing ::: line. The source is left untouched.`,
          { startUtf16: openerLine.start, endUtf16Exclusive: openerLine.end },
        ),
      );
      break;
    }

    const closerLine = lines[closerIndex];
    const sourceRange = { startUtf16: openerLine.start, endUtf16Exclusive: closerLine.endIncludingNewline };
    const contentRange = { startUtf16: openerLine.endIncludingNewline, endUtf16Exclusive: closerLine.start };
    const rawSource = source.slice(sourceRange.startUtf16, sourceRange.endUtf16Exclusive);
    const contentSource = source.slice(contentRange.startUtf16, contentRange.endUtf16Exclusive);

    if (rawSource.length > MAX_DIRECTIVE_BYTES) {
      diagnostics.push(
        diagnostic(
          "directive_too_large",
          `Directive exceeds the ${MAX_DIRECTIVE_BYTES / 1024} KiB safety limit and will render as source.`,
          { startUtf16: openerLine.start, endUtf16Exclusive: openerLine.end },
        ),
      );
    }

    if (nodes.length >= MAX_DIRECTIVES_PER_DOCUMENT) {
      diagnostics.push(
        diagnostic(
          "too_many_directives",
          `A document may contain at most ${MAX_DIRECTIVES_PER_DOCUMENT} semantic directives.`,
          { startUtf16: openerLine.start, endUtf16Exclusive: openerLine.end },
        ),
      );
    } else if (opener.type) {
      nodes.push({
        type: opener.type,
        props: opener.props,
        propRanges: opener.propRanges,
        sourceRange,
        openerRange: { startUtf16: openerLine.start, endUtf16Exclusive: openerLine.end },
        contentRange,
        contentKind: detectContentKind(contentSource),
        contentSource,
        rawSource,
        startLine: index,
        endLineExclusive: closerIndex + 1,
      });
    }
    index = closerIndex;
  }

  return { nodes, diagnostics };
}
