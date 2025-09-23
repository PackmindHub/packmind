import { Rule, StandardVersion } from '@packmind/shared';

export class GenericStandardWriter {
  public static writeStandard(
    standardVersion: StandardVersion,
    rules: Rule[],
  ): string {
    return `# ${standardVersion.name}

${standardVersion.description}

${this.renderRules(rules)}
`;
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
