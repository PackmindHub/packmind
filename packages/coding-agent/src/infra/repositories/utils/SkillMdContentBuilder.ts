import { CAMEL_TO_YAML_KEY, SkillVersion, camelToKebab } from '@packmind/types';
import { sortAdditionalPropertiesKeys } from '@packmind/node-utils';
import { escapeSingleQuotes } from './FileUtils';
import { formatAdditionalPropertyYaml } from './YamlFrontmatterUtils';

/**
 * Generate the SKILL.md content with YAML frontmatter for a given skill version,
 * following the Agent Skills specification. The body is taken from skillVersion.prompt.
 */
export function generateSkillMdContent(skillVersion: SkillVersion): string {
  const frontmatterFields: string[] = [];

  if (skillVersion.name) {
    frontmatterFields.push(`name: '${escapeSingleQuotes(skillVersion.name)}'`);
  }

  if (skillVersion.description) {
    frontmatterFields.push(
      `description: '${escapeSingleQuotes(skillVersion.description)}'`,
    );
  }

  if (skillVersion.license) {
    frontmatterFields.push(
      `license: '${escapeSingleQuotes(skillVersion.license)}'`,
    );
  }

  if (skillVersion.compatibility) {
    frontmatterFields.push(
      `compatibility: '${escapeSingleQuotes(skillVersion.compatibility)}'`,
    );
  }

  if (skillVersion.allowedTools) {
    frontmatterFields.push(
      `allowed-tools: '${escapeSingleQuotes(skillVersion.allowedTools)}'`,
    );
  }

  if (skillVersion.metadata && Object.keys(skillVersion.metadata).length > 0) {
    const metadataYaml = Object.entries(skillVersion.metadata)
      .map(([key, value]) => `  ${key}: '${escapeSingleQuotes(String(value))}'`)
      .join('\n');
    frontmatterFields.push(`metadata:\n${metadataYaml}`);
  }

  if (
    skillVersion.additionalProperties &&
    Object.keys(skillVersion.additionalProperties).length > 0
  ) {
    for (const [camelKey, value] of sortAdditionalPropertiesKeys(
      skillVersion.additionalProperties,
    )) {
      const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
      frontmatterFields.push(formatAdditionalPropertyYaml(yamlKey, value));
    }
  }

  const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

  return `${frontmatter}

${skillVersion.prompt}`;
}
