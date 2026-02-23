import { parseSkillMdContent } from './parseSkillMdContent';
import { serializeSkillMetadata } from './parseSkillMdContent';

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

  return {
    name,
    description,
    body,
    license,
    compatibility,
    allowedTools,
    metadataJson,
  };
}
