/** Array order is preserved; only object keys are reordered. */
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
 * Use this instead of `JSON.stringify` whenever two values must compare equal
 * regardless of key insertion order — e.g. YAML parse order against PostgreSQL
 * JSONB retrieval order.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(deepSortKeys(value ?? null));
}

export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Claude Code-specific frontmatter fields that are not part of the Agent Skills spec.
 * Maps YAML kebab-case key → camelCase storage key.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS: Record<string, string> = {
  'argument-hint': 'argumentHint',
  arguments: 'arguments',
  when_to_use: 'whenToUse',
  'disable-model-invocation': 'disableModelInvocation',
  'user-invocable': 'userInvocable',
  model: 'model',
  context: 'context',
  agent: 'agent',
  effort: 'effort',
  hooks: 'hooks',
  paths: 'paths',
  shell: 'shell',
  'disallowed-tools': 'disallowedTools',
};

/**
 * Canonical order for rendering YAML frontmatter, so the output does not follow
 * whatever key order JSONB retrieval happens to return.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER: string[] = [
  'argumentHint',
  'arguments',
  'whenToUse',
  'disableModelInvocation',
  'userInvocable',
  'model',
  'context',
  'agent',
  'effort',
  'hooks',
  'paths',
  'shell',
  'disallowedTools',
];

export const CAMEL_TO_YAML_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(CLAUDE_CODE_ADDITIONAL_FIELDS).map(([yaml, camel]) => [
    camel,
    yaml,
  ]),
);

/**
 * Additional properties supported by the GitHub Copilot agent (camelCase storage keys).
 *
 * Note: `context` is documented as experimental upstream
 * (https://code.visualstudio.com/docs/copilot/customization/agent-skills).
 */
export const COPILOT_ADDITIONAL_FIELDS: string[] = [
  'argumentHint',
  'context',
  'disableModelInvocation',
  'userInvocable',
];

export const CURSOR_ADDITIONAL_FIELDS: string[] = [
  'disableModelInvocation',
  'paths',
];

export function filterAdditionalProperties(
  props: Record<string, unknown>,
  supportedKeys: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => supportedKeys.includes(key)),
  );
}

/**
 * Known fields first in `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER`, then unknown
 * fields alphabetically.
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
