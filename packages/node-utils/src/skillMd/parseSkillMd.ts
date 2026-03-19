import { parseSkillMdContent } from './parseSkillMdContent';
import {
  canonicalJsonStringify,
  serializeSkillMetadata,
} from './parseSkillMdContent';

/**
 * Claude Code-specific frontmatter fields that are not part of the Agent Skills spec.
 * Maps YAML kebab-case key → camelCase storage key.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS: Record<string, string> = {
  'argument-hint': 'argumentHint',
  'disable-model-invocation': 'disableModelInvocation',
  'user-invocable': 'userInvocable',
  model: 'model',
  context: 'context',
  agent: 'agent',
  hooks: 'hooks',
};

/**
 * Canonical ordering of Claude Code additional properties (camelCase storage keys).
 * Used to ensure deterministic YAML frontmatter rendering regardless of JSONB key order.
 */
export const CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER: string[] = [
  'argumentHint',
  'disableModelInvocation',
  'userInvocable',
  'model',
  'context',
  'agent',
  'hooks',
];

/** Known Agent Skills spec fields (post-normalization). */
const SPEC_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'allowedTools',
  'metadata',
]);

/**
 * Typed representation of a parsed SKILL.md file with individual
 * frontmatter fields extracted according to the Agent Skills specification.
 *
 * @see https://agentskills.io/specification
 */
export type ParsedSkillMd = {
  name: string;
  description: string;
  body: string;
  license: string;
  compatibility: string;
  allowedTools: string;
  metadataJson: string;
  /**
   * Claude Code additional properties, keyed by camelCase name.
   *
   * Serialization contract:
   * - DB stores raw values (JSONB) — e.g. `"opus"`, `true`, `{ preToolCall: "echo hello" }`.
   * - The diff pipeline (CLI → API) uses `JSON.stringify(rawValue)` so values
   *   are transported as JSON-encoded strings.
   * - The applier uses `JSON.parse(newValue)` to recover the raw value before
   *   persisting it back to the DB.
   */
  additionalProperties: Record<string, string>;
};

/**
 * Parses a SKILL.md file and extracts typed frontmatter fields and body.
 *
 * Returns `null` when the content cannot be parsed (missing/unclosed
 * frontmatter, invalid YAML, or non-object YAML value).
 *
 * Individual spec fields (`license`, `compatibility`, `allowedTools`) are
 * extracted as strings. The generic `metadata` record is serialized as
 * deterministic JSON in `metadataJson`.
 *
 * Claude Code-specific fields are extracted into `additionalProperties`
 * with camelCase keys and JSON-serialized values.
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed fields and body, or `null` on failure
 */
export function parseSkillMd(content: string): ParsedSkillMd | null {
  const parsed = parseSkillMdContent(content);
  if (!parsed) {
    return null;
  }

  const { properties, body } = parsed;

  const name = String(properties['name'] ?? '');
  const description = String(properties['description'] ?? '');
  const license = String(properties['license'] ?? '');
  const compatibility = String(properties['compatibility'] ?? '');
  const allowedTools = String(properties['allowedTools'] ?? '');

  const metadata = properties['metadata'];
  const metadataJson =
    metadata != null && typeof metadata === 'object'
      ? serializeSkillMetadata(metadata as Record<string, unknown>)
      : '{}';

  // Extract Claude Code additional properties
  const additionalProperties: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (SPEC_FIELDS.has(key)) continue;
    const camelKey = CLAUDE_CODE_ADDITIONAL_FIELDS[key];
    if (!camelKey) continue;
    additionalProperties[camelKey] = canonicalJsonStringify(value);
  }

  return {
    name,
    description,
    body,
    license,
    compatibility,
    allowedTools,
    metadataJson,
    additionalProperties,
  };
}
