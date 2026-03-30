function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

export function serializeStandardToMarkdown(applied: {
  name: string;
  scope: string;
  description: string;
  rules: { content: string }[];
}): string {
  const frontmatterFields: string[] = [];

  frontmatterFields.push(`name: '${escapeSingleQuotes(applied.name)}'`);

  if (applied.scope && applied.scope.trim() !== '') {
    frontmatterFields.push(`alwaysApply: false`);
  } else {
    frontmatterFields.push(`alwaysApply: true`);
  }

  frontmatterFields.push(`description: '${escapeSingleQuotes(applied.name)}'`);

  const frontmatter = `---\n${frontmatterFields.join('\n')}\n---`;

  const lines: string[] = [`## Standard: ${applied.name}`];

  if (applied.description) {
    lines.push('', applied.description);
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

export function serializeSkillToMarkdown(_applied: {
  name: string;
  description: string;
  prompt: string;
}): string {
  return '';
}
