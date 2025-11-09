import { WithTimestamps } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { RecipeVersion } from '@packmind/types';

const origin = 'CookbookService';

export class CookbookService {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CookbookService initialized');
  }

  public buildCookbook(
    recipeVersions: WithTimestamps<RecipeVersion>[],
  ): string {
    this.logger.info('Building cookbook', {
      totalRecipes: recipeVersions.length,
    });

    // Sort recipe versions alphabetically by name for consistent, human-readable ordering
    const sortedRecipes = [...recipeVersions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.logger.debug('Recipes sorted alphabetically', {
      sortedCount: sortedRecipes.length,
    });

    // Generate the cookbook content
    const cookbookContent = this.generateCookbookContent(sortedRecipes);

    this.logger.info('Cookbook generated successfully', {
      contentLength: cookbookContent.length,
    });

    return cookbookContent;
  }

  private generateCookbookContent(
    sortedRecipes: WithTimestamps<RecipeVersion>[],
  ): string {
    const header = this.generateHeader();
    const recipesList = this.generateRecipesList(sortedRecipes);
    const footer = this.generateFooter();

    return [header, recipesList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Cookbook

This cookbook contains all available coding recipes that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Recipes`;
  }

  private generateRecipesList(
    recipes: WithTimestamps<RecipeVersion>[],
  ): string {
    if (recipes.length === 0) {
      return 'No recipes available.';
    }

    return recipes.map((recipe) => this.formatRecipeEntry(recipe)).join('\n');
  }

  private formatRecipeEntry(recipe: WithTimestamps<RecipeVersion>): string {
    const fileName = `${recipe.slug}.md`;
    const relativePath = `recipes/${fileName}`;
    const description = this.getRecipeDescription(recipe);

    return `- [${recipe.name}](${relativePath}) : ${description}`;
  }

  private getRecipeDescription(recipe: WithTimestamps<RecipeVersion>): string {
    // If summary is null or empty, use the recipe name
    if (!recipe.summary || recipe.summary.trim() === '') {
      this.logger.debug('Using recipe name as description', {
        recipeId: recipe.id,
        recipeName: recipe.name,
      });
      return recipe.name;
    }

    return recipe.summary.trim();
  }

  private generateFooter(): string {
    return `
---

*This cookbook was automatically generated from deployed recipe versions.*`;
  }
}
