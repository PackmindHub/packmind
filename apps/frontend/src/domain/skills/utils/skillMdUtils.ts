import { stringify } from 'yaml';

import type { SkillVersion } from '@packmind/types';
import {
  camelToKebab,
  CAMEL_TO_YAML_KEY,
  CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER,
} from '@packmind/types';

/**
 * Reconstructs the full SKILL.md file content from a SkillVersion.
 *
 * When a skill is stored, its SKILL.md frontmatter is parsed and each field is
 * persisted separately (name, description, license, …). The `prompt` field only
 * holds the Markdown body that follows the closing `---` delimiter.
 *
 * This function reassembles the complete file so that the copy-to-clipboard CTA
 * on the skill page gives users the original, deployable SKILL.md content.
 */
export function buildSkillMdContent(version: SkillVersion): string {
  const frontmatter: Record<string, unknown> = {
    name: version.name,
    description: version.description,
  };

  if (version.license) {
    frontmatter['license'] = version.license;
  }

  if (version.compatibility) {
    frontmatter['compatibility'] = version.compatibility;
  }

  // The Agent Skills spec uses `allowed-tools` (with hyphen) as the YAML key.
  if (version.allowedTools) {
    frontmatter['allowed-tools'] = version.allowedTools;
  }

  if (version.metadata && Object.keys(version.metadata).length > 0) {
    frontmatter['metadata'] = version.metadata;
  }

  if (
    version.additionalProperties &&
    Object.keys(version.additionalProperties).length > 0
  ) {
    const orderIndex = new Map(
      CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.map((key, i) => [key, i]),
    );
    const sorted = Object.entries(version.additionalProperties).sort(
      ([a], [b]) => {
        const aIdx = orderIndex.get(a) ?? Infinity;
        const bIdx = orderIndex.get(b) ?? Infinity;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.localeCompare(b);
      },
    );
    for (const [camelKey, value] of sorted) {
      const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
      frontmatter[yamlKey] = value;
    }
  }

  const yamlBlock = stringify(frontmatter).trimEnd();

  return `---\n${yamlBlock}\n---\n\n${version.prompt}`;
}
