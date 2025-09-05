export class RecipesIndexService {
  public buildRecipesIndex(
    recipes: Array<{ name: string; slug: string; summary?: string | null }>,
  ): string {
    const sortedRecipes = [...recipes].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const header = this.generateHeader();
    const recipesList = this.generateRecipesList(sortedRecipes);
    const footer = this.generateFooter();

    return [header, recipesList, footer].join('\n\n');
  }

  private generateHeader(): string {
    return `# Packmind Recipes Index

This recipes index contains all available coding recipes that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Recipes`;
  }

  private generateRecipesList(
    recipes: Array<{ name: string; slug: string; summary?: string | null }>,
  ): string {
    if (recipes.length === 0) {
      return 'No recipes available.';
    }

    return recipes.map((recipe) => this.formatRecipeEntry(recipe)).join('\n');
  }

  private formatRecipeEntry(recipe: {
    name: string;
    slug: string;
    summary?: string | null;
  }): string {
    const fileName = `${recipe.slug}.md`;
    const relativePath = `recipes/${fileName}`;
    const description = this.getRecipeDescription(recipe);

    return `- [${recipe.name}](${relativePath}) : ${description}`;
  }

  private getRecipeDescription(recipe: {
    name: string;
    summary?: string | null;
  }): string {
    if (!recipe.summary || recipe.summary.trim() === '') {
      return recipe.name;
    }

    return recipe.summary.trim();
  }

  private generateFooter(): string {
    return `
---

*This recipes index was automatically generated from deployed recipe versions.*`;
  }
}
