import { Rule, StandardVersion } from '@packmind/shared';
import { GenericSectionWriter } from './GenericSectionWriter';

export type GenericStandardSectionWriterOpts = {
  standardsSection: string;
};

export class GenericStandardSectionWriter extends GenericSectionWriter<GenericStandardSectionWriterOpts> {
  private static instance = new GenericStandardSectionWriter();
  private static readonly SUMMARY_MAX_LENGTH = 200;
  private static readonly RULES_FALLBACK = '* No rules defined yet.';

  public static standardsIntroduction = `Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.`;

  protected generateSectionContent(
    opts: GenericStandardSectionWriterOpts,
  ): string {
    if (opts.standardsSection.length === 0) {
      return '';
    }

    const content: string[] = [`# Packmind Standards`];

    content.push(GenericStandardSectionWriter.standardsIntroduction);
    content.push(opts.standardsSection);

    return content.join('\n\n');
  }

  // Static methods for backward compatibility
  public static generateStandardsSection(
    opts: GenericStandardSectionWriterOpts,
  ): string {
    return GenericStandardSectionWriter.instance.generateSectionContent(opts);
  }

  public static extractSummaryOrDescription(item: {
    summary?: string | null;
    description?: string | null;
  }): string | null {
    const summary = item.summary?.trim();
    if (summary) {
      return summary;
    }

    const description = item.description?.trim();
    if (!description) {
      return null;
    }

    const firstLine = description.split('\n')[0].trim();
    if (!firstLine) {
      return null;
    }

    if (firstLine.length > this.SUMMARY_MAX_LENGTH) {
      return `${firstLine.substring(0, this.SUMMARY_MAX_LENGTH)}...`;
    }

    return firstLine;
  }

  public static formatStandardContent({
    standardVersion,
    rules,
    link,
  }: {
    standardVersion: StandardVersion;
    rules?: Rule[];
    link: string;
  }): string {
    const summary =
      this.extractSummaryOrDescription(standardVersion) ??
      'Summary unavailable';

    const lines: string[] = [
      `## Standard: ${standardVersion.name}`,
      '',
      `${summary} :`,
      ...this.formatRulesList(rules),
      '',
      `Full standard is available here for further request: [${standardVersion.name}](${link})`,
    ];

    return lines.join('\n');
  }

  private static formatRulesList(rules?: Rule[]): string[] {
    if (rules && rules.length > 0) {
      return [...rules]
        .map((rule) => rule.content.trim())
        .filter((content) => content.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((content) => `* ${content}`);
    }

    return [this.RULES_FALLBACK];
  }

  public static replace(
    opts: GenericStandardSectionWriterOpts & {
      currentContent: string;
      commentMarker: string;
    },
  ): string {
    return GenericStandardSectionWriter.instance.replace(opts);
  }
}
