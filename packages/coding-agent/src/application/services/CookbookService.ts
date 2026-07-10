export class CookbookService {
  public buildCookbook(recipes: Array<{ name: string; slug: string }>): string {
    const sortedCommands = [...recipes].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const header = this.generateHeader();
    const commandsList = this.generateCommandsList(sortedCommands);
    const footer = this.generateFooter();

    return [header, commandsList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Cookbook

This cookbook contains all available coding recipes that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Recipes`;
  }

  private generateCommandsList(
    recipes: Array<{ name: string; slug: string }>,
  ): string {
    if (recipes.length === 0) {
      return 'No recipes available.';
    }

    return recipes.map((recipe) => this.formatCommandEntry(recipe)).join('\n');
  }

  private formatCommandEntry(recipe: { name: string; slug: string }): string {
    const fileName = `${recipe.slug}.md`;
    const relativePath = `recipes/${fileName}`;
    const description = this.getCommandDescription(recipe);

    return `- [${recipe.name}](${relativePath}) : ${description}`;
  }

  private getCommandDescription(recipe: { name: string }): string {
    return recipe.name;
  }

  private generateFooter(): string {
    return `
---

*This cookbook was automatically generated from deployed recipe versions.*`;
  }
}
