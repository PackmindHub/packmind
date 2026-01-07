export class CommandsIndexService {
  public buildCommandsIndex(
    commands: Array<{ name: string; slug: string; summary?: string | null }>,
  ): string {
    const sortedCommands = [...commands].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const header = this.generateHeader();
    const commandsList = this.generateCommandsList(sortedCommands);
    const footer = this.generateFooter();

    return [header, commandsList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Commands Index

This file contains all available coding commands that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Commands`;
  }

  private generateCommandsList(
    commands: Array<{ name: string; slug: string; summary?: string | null }>,
  ): string {
    if (commands.length === 0) {
      return 'No commands available.';
    }

    return commands
      .map((command) => this.formatCommandEntry(command))
      .join('\n');
  }

  private formatCommandEntry(command: {
    name: string;
    slug: string;
    summary?: string | null;
  }): string {
    const fileName = `${command.slug}.md`;
    const relativePath = `commands/${fileName}`;
    const description = this.getCommandDescription(command);

    return `- [${command.name}](${relativePath}) : ${description}`;
  }

  private getCommandDescription(command: {
    name: string;
    summary?: string | null;
  }): string {
    if (!command.summary || command.summary.trim() === '') {
      return command.name;
    }

    return command.summary.trim();
  }

  private generateFooter(): string {
    return `
---

*This file was automatically generated from deployed command versions.*`;
  }
}
