import { Rule, StandardVersion } from '@packmind/types';

export class GenericStandardWriter {
  public static writeStandard(
    standardVersion: StandardVersion,
    rules: Rule[],
  ): string {
    const sections = [
      `# ${standardVersion.name}`,
      standardVersion.description,
      this.renderScope(standardVersion.scope),
      this.renderRules(rules),
    ].filter((section) => section !== '');

    return `${sections.join('\n\n')}\n`;
  }

  private static renderScope(scope: string | null) {
    if (!scope || !scope.trim()) {
      return '';
    }

    return `## Scope

${scope.trim()}`;
  }

  private static renderRules(rules: Rule[]) {
    if (rules.length) {
      const rulesContent = rules
        ? rules.map((rule) => `* ${rule.content}`).join('\n')
        : '';

      return `## Rules

${rulesContent}`;
    }

    return '';
  }
}
