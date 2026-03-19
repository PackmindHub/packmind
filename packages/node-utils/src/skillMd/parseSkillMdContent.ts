import { parse as parseYaml } from 'yaml';

const FRONTMATTER_DELIMITER = '---';

/**
 * Result of parsing a SKILL.md file content.
 *
 * Properties are returned as a generic record so consumers can
 * map them to their own domain types.
 *
 * The `allowed-tools` YAML key is normalised to `allowedTools`.
 *
 * @see https://agentskills.io/specification
 */
export type ParsedSkillMdContent = {
  /** Frontmatter properties with `allowed-tools` normalised to `allowedTools` */
  properties: Record<string, unknown>;
  /** Markdown body after the closing `---` */
  body: string;
};

/**
 * Returns a deep copy of `value` with all object keys sorted recursively.
 *
 * - Plain objects: keys are sorted with `localeCompare`.
 * - Arrays: each element is sorted recursively (order preserved).
 * - Primitives / nulls: returned as-is.
 */
function deepSortKeys(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(deepSortKeys);
  }

  const obj = value as Record<string, unknown>;
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce(
      (acc, key) => {
        acc[key] = deepSortKeys(obj[key]);
        return acc;
      },
      {} as Record<string, unknown>,
    );
}

/**
 * Deterministic JSON serialization that recursively sorts object keys.
 *
 * Use this instead of `JSON.stringify` whenever two values must compare
 * equal regardless of key insertion order (e.g. YAML parse order vs
 * PostgreSQL JSONB retrieval order).
 *
 * @param value - Any JSON-serializable value
 * @returns Deterministic JSON string
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(deepSortKeys(value));
}

/**
 * Serializes skill metadata fields into a deterministic JSON string.
 *
 * Keys are sorted alphabetically (recursively) before serialization so that
 * two records with the same entries always produce the same output
 * regardless of insertion order.
 *
 * @param fields - Metadata key-value pairs to serialize
 * @returns Deterministic JSON string
 */
export function serializeSkillMetadata(
  fields: Record<string, unknown>,
): string {
  return canonicalJsonStringify(fields);
}

/**
 * Parses a SKILL.md file and extracts YAML frontmatter properties and body.
 *
 * Returns `null` when the content cannot be parsed (missing/unclosed
 * frontmatter, invalid YAML, or non-object YAML value).
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed properties and body, or `null` on failure
 */
export function parseSkillMdContent(
  content: string,
): ParsedSkillMdContent | null {
  try {
    const trimmed = content.trim();

    if (!trimmed.startsWith(FRONTMATTER_DELIMITER)) {
      return null;
    }

    const afterOpening = trimmed.slice(FRONTMATTER_DELIMITER.length);
    const closingIndex = afterOpening.indexOf(`\n${FRONTMATTER_DELIMITER}`);

    if (closingIndex === -1) {
      return null;
    }

    const frontmatter = afterOpening.slice(0, closingIndex).trim();
    const body = afterOpening
      .slice(closingIndex + FRONTMATTER_DELIMITER.length + 1)
      .trim();

    const parsed = parseYaml(frontmatter) as Record<string, unknown>;
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }

    const { 'allowed-tools': allowedTools, ...rest } = parsed;
    const properties: Record<string, unknown> = {
      ...rest,
      ...(allowedTools !== undefined && { allowedTools }),
    };

    return { properties, body };
  } catch {
    return null;
  }
}
