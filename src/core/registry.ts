export const DECISION_VARIANTS = ["summary", "comparison", "record"] as const;
export const FLOW_VARIANTS = ["steps", "equation"] as const;
export const MATRIX_VARIANTS = ["tiers", "columns"] as const;
export const MEME_VARIANTS = ["classic", "poster", "deadpan"] as const;
export const NOTE_TONES = ["critical", "insight", "caution"] as const;
export const VISUAL_VARIANTS = ["hero", "scene", "split"] as const;
export const THEME_DENSITIES = ["compact", "comfortable"] as const;
export const THEME_RADII = ["small", "medium"] as const;
export const THEME_ACCENTS = ["lavender", "amber", "blue"] as const;

export type DecisionVariant = (typeof DECISION_VARIANTS)[number];
export type FlowVariant = (typeof FLOW_VARIANTS)[number];
export type MatrixVariant = (typeof MATRIX_VARIANTS)[number];
export type MemeVariant = (typeof MEME_VARIANTS)[number];
export type NoteTone = (typeof NOTE_TONES)[number];
export type VisualVariant = (typeof VISUAL_VARIANTS)[number];
export type ThemeDensity = (typeof THEME_DENSITIES)[number];
export type ThemeRadius = (typeof THEME_RADII)[number];
export type ThemeAccent = (typeof THEME_ACCENTS)[number];

export type TemplateRegistry = {
  version: 1;
  theme: {
    density: ThemeDensity;
    radius: ThemeRadius;
    accent: ThemeAccent;
  };
  directives: {
    decision: {
      variant: DecisionVariant;
    };
    flow?: {
      variant: FlowVariant;
    };
    matrix?: {
      variant: MatrixVariant;
    };
    meme?: {
      variant: MemeVariant;
    };
    note?: {
      tone: NoteTone;
    };
    visual?: {
      variant: VisualVariant;
    };
  };
};

export type RegistryValidation =
  | { ok: true; value: TemplateRegistry }
  | { ok: false; errors: string[] };

export const DEFAULT_REGISTRY: TemplateRegistry = {
  version: 1,
  theme: {
    density: "compact",
    radius: "small",
    accent: "lavender",
  },
  directives: {
    decision: {
      variant: "comparison",
    },
    flow: {
      variant: "steps",
    },
    matrix: {
      variant: "tiers",
    },
    meme: {
      variant: "classic",
    },
    note: {
      tone: "insight",
    },
    visual: {
      variant: "scene",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      errors.push(`${path}.${key} is not allowed.`);
    }
  }
}

function isOneOf<const T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function validateOptionalDirective(
  directives: Record<string, unknown>,
  name: string,
  property: string,
  allowed: readonly string[],
  errors: string[],
): void {
  const directive = directives[name];
  if (directive === undefined) {
    return;
  }
  const path = `$.directives.${name}`;
  if (!isRecord(directive)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  hasOnlyKeys(directive, [property], path, errors);
  if (!isOneOf(directive[property], allowed)) {
    errors.push(`${path}.${property} must be one of: ${allowed.join(", ")}.`);
  }
}

export function validateTemplateRegistry(input: unknown): RegistryValidation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["Registry root must be a JSON object."] };
  }
  hasOnlyKeys(input, ["version", "theme", "directives"], "$", errors);

  if (input.version !== 1) {
    errors.push("$.version must be exactly 1.");
  }

  if (!isRecord(input.theme)) {
    errors.push("$.theme must be an object.");
  } else {
    hasOnlyKeys(input.theme, ["density", "radius", "accent"], "$.theme", errors);
    if (!isOneOf(input.theme.density, THEME_DENSITIES)) {
      errors.push(`$.theme.density must be one of: ${THEME_DENSITIES.join(", ")}.`);
    }
    if (!isOneOf(input.theme.radius, THEME_RADII)) {
      errors.push(`$.theme.radius must be one of: ${THEME_RADII.join(", ")}.`);
    }
    if (!isOneOf(input.theme.accent, THEME_ACCENTS)) {
      errors.push(`$.theme.accent must be one of: ${THEME_ACCENTS.join(", ")}.`);
    }
  }

  if (!isRecord(input.directives)) {
    errors.push("$.directives must be an object.");
  } else {
    hasOnlyKeys(input.directives, ["decision", "flow", "matrix", "meme", "note", "visual"], "$.directives", errors);
    if (!isRecord(input.directives.decision)) {
      errors.push("$.directives.decision must be an object.");
    } else {
      hasOnlyKeys(input.directives.decision, ["variant"], "$.directives.decision", errors);
      if (!isOneOf(input.directives.decision.variant, DECISION_VARIANTS)) {
        errors.push(`$.directives.decision.variant must be one of: ${DECISION_VARIANTS.join(", ")}.`);
      }
    }
    validateOptionalDirective(input.directives, "flow", "variant", FLOW_VARIANTS, errors);
    validateOptionalDirective(input.directives, "matrix", "variant", MATRIX_VARIANTS, errors);
    validateOptionalDirective(input.directives, "meme", "variant", MEME_VARIANTS, errors);
    validateOptionalDirective(input.directives, "note", "tone", NOTE_TONES, errors);
    validateOptionalDirective(input.directives, "visual", "variant", VISUAL_VARIANTS, errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: input as TemplateRegistry };
}

export function parseTemplateRegistryJson(source: string): RegistryValidation {
  try {
    return validateTemplateRegistry(JSON.parse(source) as unknown);
  } catch (error) {
    return {
      ok: false,
      errors: [`Registry is not valid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function serializeDefaultRegistry(): string {
  return `${JSON.stringify(DEFAULT_REGISTRY, null, 2)}\n`;
}
