import { WithTimestamps } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { CommandVersion } from '@packmind/types';

const origin = 'CookbookService';

export class CookbookService {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CookbookService initialized');
  }

  public buildCookbook(
    recipeVersions: WithTimestamps<CommandVersion>[],
  ): string {
    this.logger.info('Building cookbook', {
      totalRecipes: recipeVersions.length,
    });

    // Sort recipe versions alphabetically by name for consistent, human-readable ordering
    const sortedCommands = [...recipeVersions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.logger.debug('Recipes sorted alphabetically', {
      sortedCount: sortedCommands.length,
    });

    // Generate the cookbook content
    const cookbookContent = this.generateCookbookContent(sortedCommands);

    this.logger.info('Cookbook generated successfully', {
      contentLength: cookbookContent.length,
    });

    return cookbookContent;
  }

  private generateCookbookContent(
    sortedCommands: WithTimestamps<CommandVersion>[],
  ): string {
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
    recipes: WithTimestamps<CommandVersion>[],
  ): string {
    if (recipes.length === 0) {
      return 'No recipes available.';
    }

    return recipes.map((recipe) => this.formatCommandEntry(recipe)).join('\n');
  }

  private formatCommandEntry(recipe: WithTimestamps<CommandVersion>): string {
    const fileName = `${recipe.slug}.md`;
    const relativePath = `recipes/${fileName}`;
    const description = this.getCommandDescription(recipe);

    return `- [${recipe.name}](${relativePath}) : ${description}`;
  }

  private getCommandDescription(
    recipe: WithTimestamps<CommandVersion>,
  ): string {
    this.logger.debug('Using recipe name as description', {
      recipeId: recipe.id,
      recipeName: recipe.name,
    });
    return recipe.name;
  }

  private generateFooter(): string {
    return `
---

*This cookbook was automatically generated from deployed recipe versions.*`;
  }
}
