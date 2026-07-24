export class StandardsIndexService {
  public buildStandardsIndex(
    standardVersions: Array<{
      name: string;
      slug: string;
      description?: string | null;
    }>,
  ): string {
    const sortedStandardVersions = [...standardVersions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const header = this.generateHeader();
    const standardsList = this.generateStandardsList(sortedStandardVersions);
    const footer = this.generateFooter();

    return [header, standardsList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards`;
  }

  private generateStandardsList(
    standardVersions: Array<{
      name: string;
      slug: string;
      description?: string | null;
    }>,
  ): string {
    if (standardVersions.length === 0) {
      return 'No standards available.';
    }

    return standardVersions
      .map((standardVersion) => this.formatStandardEntry(standardVersion))
      .join('\n');
  }

  private formatStandardEntry(standardVersion: {
    name: string;
    slug: string;
    description?: string | null;
  }): string {
    const fileName = `${standardVersion.slug}.md`;
    const relativePath = `./standards/${fileName}`;
    const description = this.getStandardDescription(standardVersion);

    return `- [${standardVersion.name}](${relativePath}) : ${description}`;
  }

  private getStandardDescription(standardVersion: {
    name: string;
    description?: string | null;
  }): string {
    if (
      !standardVersion.description ||
      standardVersion.description.trim() === ''
    ) {
      return standardVersion.name;
    }

    return standardVersion.description.trim();
  }

  private generateFooter(): string {
    return `
---

*This standards index was automatically generated from deployed standard versions.*`;
  }
}
