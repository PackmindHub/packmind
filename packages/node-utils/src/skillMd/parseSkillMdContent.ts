import { parse as parseYaml } from 'yaml';

export { canonicalJsonStringify } from '@packmind/types';
import { canonicalJsonStringify } from '@packmind/types';

const FRONTMATTER_DELIMITER = '---';

/** @see https://agentskills.io/specification */
export type ParsedSkillMdContent = {
  /** Untyped on purpose - each consumer maps these to its own domain type. */
  properties: Record<string, unknown>;
  body: string;
};

/**
 * Sorts keys recursively before serializing, so two metadata records with the
 * same entries compare equal as strings whatever order they were built in.
 */
export function serializeSkillMetadata(
  fields: Record<string, unknown>,
): string {
  return canonicalJsonStringify(fields);
}

/**
 * Returns `null` - never throws - when the content cannot be parsed: missing or
 * unclosed frontmatter, invalid YAML, or a YAML value that is not an object.
 *
 * The spec's `allowed-tools` key is normalised to `allowedTools` on the way
 * out, so downstream code only ever sees the camelCase form.
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
