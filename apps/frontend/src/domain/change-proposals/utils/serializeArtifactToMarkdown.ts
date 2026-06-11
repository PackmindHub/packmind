import { AppliedStandard } from './applyStandardProposals';

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

type SerializableSkill = {
  name: string;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
  metadata?: Record<string, string>;
};

export function serializeSkillToMarkdown(applied: SerializableSkill): string {
  const frontmatterFields: string[] = [];

  if (applied.name) {
    frontmatterFields.push(`name: '${escapeSingleQuotes(applied.name)}'`);
  }

  if (applied.description) {
    frontmatterFields.push(
      `description: '${escapeSingleQuotes(applied.description)}'`,
    );
  }

  if (applied.license) {
    frontmatterFields.push(`license: '${escapeSingleQuotes(applied.license)}'`);
  }

  if (applied.compatibility) {
    frontmatterFields.push(
      `compatibility: '${escapeSingleQuotes(applied.compatibility)}'`,
    );
  }

  if (applied.allowedTools) {
    frontmatterFields.push(
      `allowed-tools: '${escapeSingleQuotes(applied.allowedTools)}'`,
    );
  }

  if (applied.metadata && Object.keys(applied.metadata).length > 0) {
    const metadataYaml = Object.entries(applied.metadata)
      .map(([key, value]) => `  ${key}: '${escapeSingleQuotes(String(value))}'`)
      .join('\n');
    frontmatterFields.push(`metadata:\n${metadataYaml}`);
  }

  return `---\n${frontmatterFields.join('\n')}\n---\n\n${applied.prompt}`;
}

export function serializeStandardToMarkdown(applied: AppliedStandard): string {
  const frontmatterFields: string[] = [];

  frontmatterFields.push(`name: '${escapeSingleQuotes(applied.name)}'`);

  if (applied.scope && applied.scope.trim() !== '') {
    frontmatterFields.push(`alwaysApply: false`);
    frontmatterFields.push(
      `description: '${escapeSingleQuotes(applied.name)}'`,
    );
  } else {
    frontmatterFields.push(`alwaysApply: true`);
    frontmatterFields.push(
      `description: '${escapeSingleQuotes(applied.name)}'`,
    );
  }

  const frontmatter = `---\n${frontmatterFields.join('\n')}\n---`;

  const lines: string[] = [`## Standard: ${applied.name}`];

  if (applied.description) {
    lines.push('');
    lines.push(applied.description);
  }

  if (applied.rules.length > 0) {
    lines.push('');
    const sortedRules = [...applied.rules]
      .map((rule) => rule.content.trim())
      .filter((content) => content.length > 0)
      .sort((a, b) => a.localeCompare(b));
    for (const rule of sortedRules) {
      lines.push(`* ${rule}`);
    }
  }

  return `${frontmatter}\n\n${lines.join('\n')}`;
}
