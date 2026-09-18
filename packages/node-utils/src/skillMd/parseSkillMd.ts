import { parseSkillMdContent } from './parseSkillMdContent';
import {
  canonicalJsonStringify,
  serializeSkillMetadata,
} from './parseSkillMdContent';
import { CLAUDE_CODE_ADDITIONAL_FIELDS } from '@packmind/types';

export {
  CLAUDE_CODE_ADDITIONAL_FIELDS,
  CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER,
  sortAdditionalPropertiesKeys,
} from '@packmind/types';

/** Known Agent Skills spec fields (post-normalization). */
const SPEC_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'allowedTools',
  'metadata',
]);

/** @see https://agentskills.io/specification */
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
   * Values here are JSON-ENCODED strings (`'"opus"'`, `'true'`), because that
   * is the form the CLI-to-API diff pipeline compares and transports. The
   * database holds the raw JSONB value instead, so
   * `SkillChangeProposalApplier` has to `JSON.parse` each one on the way back.
   */
  additionalProperties: Record<string, string>;
};

/**
 * Returns `null` - never throws - when the content cannot be parsed: missing or
 * unclosed frontmatter, invalid YAML, or a YAML value that is not an object.
 *
 * `metadataJson` is deterministic JSON, so two equivalent metadata blocks
 * compare equal as strings.
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
