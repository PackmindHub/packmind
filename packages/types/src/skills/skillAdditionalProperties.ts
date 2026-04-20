/**
 * Returns a deep copy of `value` with all object keys sorted recursively.
 *
 * - Plain objects: keys are sorted with `localeCompare`.
 * - Arrays: each element is sorted recursively (order preserved).
 * - Primitives / nulls: returned as-is.
 */
export function deepSortKeys(value: unknown): unknown {
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
  return JSON.stringify(deepSortKeys(value ?? null));
}

/**
 * Converts a camelCase string to kebab-case.
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Claude Code-specific frontmatter fields that are not part of the Agent Skills spec.
 * Maps YAML kebab-case key → camelCase storage key.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS: Record<string, string> = {
  'argument-hint': 'argumentHint',
  when_to_use: 'whenToUse',
  'disable-model-invocation': 'disableModelInvocation',
  'user-invocable': 'userInvocable',
  model: 'model',
  effort: 'effort',
  context: 'context',
  agent: 'agent',
  hooks: 'hooks',
  paths: 'paths',
  shell: 'shell',
};

/**
 * Canonical ordering of Claude Code additional properties (camelCase storage keys).
 * Used to ensure deterministic YAML frontmatter rendering regardless of JSONB key order.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER: string[] = [
  'argumentHint',
  'whenToUse',
  'disableModelInvocation',
  'userInvocable',
  'model',
  'effort',
  'context',
  'agent',
  'hooks',
  'paths',
  'shell',
];

/**
 * Maps camelCase storage key → YAML kebab-case key for Claude Code additional fields.
 * Derived by inverting `CLAUDE_CODE_ADDITIONAL_FIELDS`.
 */
export const CAMEL_TO_YAML_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(CLAUDE_CODE_ADDITIONAL_FIELDS).map(([yaml, camel]) => [
    camel,
    yaml,
  ]),
);

/**
 * Additional properties supported by the GitHub Copilot agent (camelCase storage keys).
 */
export const COPILOT_ADDITIONAL_FIELDS: string[] = [
  'argumentHint',
  'disableModelInvocation',
  'userInvocable',
];

/**
 * Additional properties supported by the Cursor agent (camelCase storage keys).
 */
export const CURSOR_ADDITIONAL_FIELDS: string[] = ['disableModelInvocation'];

/**
 * Filters additional properties to only include keys supported by a given agent.
 */
export function filterAdditionalProperties(
  props: Record<string, unknown>,
  supportedKeys: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => supportedKeys.includes(key)),
  );
}

/**
 * Sorts additional properties entries: known fields first (in canonical order),
 * then unknown fields alphabetically.
 */
export function sortAdditionalPropertiesKeys(
  props: Record<string, unknown>,
): [string, unknown][] {
  const entries = Object.entries(props);
  const orderIndex = new Map(
    CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.map((key, i) => [key, i]),
  );
  return entries.sort(([a], [b]) => {
    const aIdx = orderIndex.get(a);
    const bIdx = orderIndex.get(b);
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    return a.localeCompare(b);
  });
}
