import { SkillVersion } from '@packmind/types';

/**
 * Escape single quotes in YAML values to prevent parsing errors.
 * In YAML, single quotes are escaped by doubling them.
 */
const escapeSingleQuotes = (value: string): string => {
  return value.replace(/'/g, "''");
};

/**
 * Build a complete markdown string with YAML frontmatter from a SkillVersion.
 * Only includes defined (non-undefined) fields in the frontmatter.
 *
 * Output format:
 * ---
 * name: 'Skill Name'
 * description: 'Description here'
 * license: 'MIT'
 * compatibility: 'claude-code v1.0+'
 * allowed-tools: 'Read, Write, Bash'
 * metadata:
 *   key1: 'value1'
 * ---
 *
 * [prompt content here]
 */
export const buildSkillMarkdown = (skillVersion: SkillVersion): string => {
  const frontmatterFields: string[] = [];

  if (skillVersion.name) {
    frontmatterFields.push(`name: '${escapeSingleQuotes(skillVersion.name)}'`);
  }

  if (skillVersion.description) {
    if (skillVersion.description.includes('\n')) {
      // Use YAML block scalar syntax for multiline descriptions
      const indentedDescription = skillVersion.description
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      frontmatterFields.push(`description: |\n${indentedDescription}`);
    } else {
      frontmatterFields.push(
        `description: '${escapeSingleQuotes(skillVersion.description)}'`,
      );
    }
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

  const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

  return `${frontmatter}

${skillVersion.prompt}`;
};
