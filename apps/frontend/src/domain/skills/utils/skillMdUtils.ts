import { stringify } from 'yaml';

import type { SkillFile, SkillVersion } from '@packmind/types';
import {
  camelToKebab,
  CAMEL_TO_YAML_KEY,
  createSkillFileId,
  sortAdditionalPropertiesKeys,
} from '@packmind/types';

/** The entry file of a skill, the one an agent reads before any other. */
export const SKILL_MD_FILENAME = 'SKILL.md';

/**
 * SKILL.md as a file, which is the one thing it is not in storage.
 *
 * A skill's frontmatter and body are columns of its version, not a row in its
 * files, so nothing the API returns ever contains SKILL.md. Every surface that
 * shows a skill as a folder has to put it back, and they were each putting back
 * their own: this is now the one place that decides what it looks like.
 *
 * The content is the body alone, because the frontmatter is shown beside it
 * rather than inside it. `buildSkillMdContent` is what reassembles the two, for
 * a copy or a download that has to be the real file.
 */
export function buildVirtualSkillMdFile(version: SkillVersion): SkillFile {
  return {
    id: createSkillFileId(''),
    skillVersionId: version.id,
    permissions: '',
    path: SKILL_MD_FILENAME,
    content: version.prompt,
    isBase64: false,
  };
}

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
    for (const [camelKey, value] of sortAdditionalPropertiesKeys(
      version.additionalProperties,
    )) {
      const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
      frontmatter[yamlKey] = value;
    }
  }

  const yamlBlock = stringify(frontmatter).trimEnd();

  return `---\n${yamlBlock}\n---\n\n${version.prompt}`;
}
