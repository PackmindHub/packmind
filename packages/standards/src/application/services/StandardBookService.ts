import { StandardVersion } from '@packmind/types';
import { WithTimestamps } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';

const origin = 'StandardBookService';

export class StandardBookService {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('StandardBookService initialized');
  }

  public buildStandardBook(
    standardVersions: WithTimestamps<StandardVersion>[],
  ): string {
    this.logger.info('Building standard book', {
      totalStandards: standardVersions.length,
    });

    // Sort standard versions alphabetically by name for consistent, human-readable ordering
    const sortedStandards = [...standardVersions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.logger.debug('Standards sorted alphabetically', {
      sortedCount: sortedStandards.length,
    });

    // Generate the standard book content
    const standardBookContent =
      this.generateStandardBookContent(sortedStandards);

    this.logger.info('Standard book generated successfully', {
      contentLength: standardBookContent.length,
    });

    return standardBookContent;
  }

  private generateStandardBookContent(
    sortedStandards: WithTimestamps<StandardVersion>[],
  ): string {
    const header = this.generateHeader();
    const standardsList = this.generateStandardsList(sortedStandards);
    const footer = this.generateFooter();

    return [header, standardsList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Standard Book

This standard book contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards`;
  }

  private generateStandardsList(
    standards: WithTimestamps<StandardVersion>[],
  ): string {
    if (standards.length === 0) {
      return 'No standards available.';
    }

    return standards
      .map((standard) => this.formatStandardEntry(standard))
      .join('\n');
  }

  private formatStandardEntry(
    standard: WithTimestamps<StandardVersion>,
  ): string {
    const fileName = `${standard.slug}.md`;
    const relativePath = `./standards/${fileName}`;
    const description = this.getStandardDescription(standard);

    return `- [${standard.name}](${relativePath}) : ${description}`;
  }

  private getStandardDescription(
    standard: WithTimestamps<StandardVersion>,
  ): string {
    // Use the summary if available (AI-generated for better readability)
    const trimmedSummary = standard.summary?.trim();
    if (trimmedSummary && trimmedSummary !== '') {
      this.logger.debug('Using AI-generated summary as description', {
        standardId: standard.id,
        standardName: standard.name,
        summaryLength: trimmedSummary.length,
      });
      return trimmedSummary;
    }

    // Fall back to the description if available
    const trimmedDescription = standard.description?.trim();
    if (trimmedDescription && trimmedDescription !== '') {
      this.logger.debug('Using standard description as description', {
        standardId: standard.id,
        standardName: standard.name,
      });
      return trimmedDescription;
    }

    // Last resort: use the standard name
    this.logger.debug('Using standard name as description', {
      standardId: standard.id,
      standardName: standard.name,
    });
    return standard.name;
  }

  private generateFooter(): string {
    return `---

*This standard book was automatically generated from deployed standard versions.*`;
  }
}
