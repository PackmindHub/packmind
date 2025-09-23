import { GenericSectionWriter } from './GenericSectionWriter';

export type GenericStandardSectionWriterOpts = {
  standardsSection: string;
};

export class GenericStandardSectionWriter extends GenericSectionWriter<GenericStandardSectionWriterOpts> {
  private static instance = new GenericStandardSectionWriter();

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

  public static replace(
    opts: GenericStandardSectionWriterOpts & {
      currentContent: string;
      commentMarker: string;
    },
  ): string {
    return GenericStandardSectionWriter.instance.replace(opts);
  }
}
