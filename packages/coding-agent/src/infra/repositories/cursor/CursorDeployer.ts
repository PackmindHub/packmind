import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger } from '@packmind/shared';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH =
    '.cursor/rules/packmind/recipes-index.mdc';
  private readonly logger: PackmindLogger;

  constructor(private readonly gitHexa?: GitHexa) {
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Cursor', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
    });

    // Get existing recipes index content
    const existingContent = await this.getExistingRecipesIndexContent(gitRepo);

    // Generate content with recipe instructions
    const updatedContent = await this.generateRecipeContent(
      recipeVersions,
      gitRepo,
      existingContent,
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Only create file if content was updated
    if (updatedContent !== existingContent) {
      fileUpdates.createOrUpdate.push({
        path: CursorDeployer.RECIPES_INDEX_PATH,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Cursor', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Cursor configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile = this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  /**
   * Get existing content from packmind-recipes-index.mdc file
   */
  private async getExistingRecipesIndexContent(
    gitRepo: GitRepo,
  ): Promise<string> {
    if (!this.gitHexa) {
      this.logger.debug('No GitHexa available, returning empty content');
      return '';
    }

    try {
      const existingFile = await this.gitHexa.getFileFromRepo(
        gitRepo,
        CursorDeployer.RECIPES_INDEX_PATH,
      );
      return existingFile?.content || '';
    } catch (error) {
      this.logger.debug('Failed to get existing Cursor recipes index content', {
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /**
   * Generate content with recipe instructions, including recipe summaries
   */
  private async generateRecipeContent(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    existingContent: string,
  ): Promise<string> {
    const repoName = `${gitRepo.owner}/${gitRepo.repo}`;

    // Generate recipes list
    const recipesSection = this.generateRecipesSection(recipeVersions);

    const packmindInstructions = `🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "Cursor"
* gitRepo: "${repoName}"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**

${recipesSection}`;

    // Check if recipe instructions are already present
    const hasRecipeInstructions =
      this.checkForRecipeInstructions(existingContent);

    if (hasRecipeInstructions) {
      this.logger.debug(
        'Recipe instructions already present in Cursor recipes index content',
      );
      // When content already exists, return existing content unchanged
      // The combination of recipes is handled at a higher level
      return existingContent;
    }

    // Create new content with header
    return this.createRecipesIndexContent(packmindInstructions);
  }

  /**
   * Generate the recipes section with summaries
   */
  private generateRecipesSection(recipeVersions: RecipeVersion[]): string {
    if (recipeVersions.length === 0) {
      return `## Available Recipes

No recipes are currently available for this repository.`;
    }

    const recipesList = recipeVersions
      .map(
        (recipe) =>
          `- [${recipe.name}](.packmind/recipes/${recipe.slug}.md) : ${recipe.summary || recipe.name}`,
      )
      .join('\n');

    return `## Available Recipes

${recipesList}`;
  }

  /**
   * Generate Cursor configuration file for a specific standard
   */
  private generateCursorConfigForStandard(standardVersion: StandardVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Cursor configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });

    let content: string;

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      // When the scope is not null or empty
      content = `---
globs: ${standardVersion.scope}
alwaysApply: false
---
Apply the coding rules defined in @.packmind/standards/${standardVersion.slug}.md`;
    } else {
      // When the scope is empty
      content = `---
alwaysApply: true
---
Apply the coding rules defined in @.packmind/standards/${standardVersion.slug}.md`;
    }

    const path = `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`;

    return {
      path,
      content,
    };
  }

  /**
   * Check if recipe instructions are already present
   */
  private checkForRecipeInstructions(existingContent: string): boolean {
    const requiredHeaderPrefix = '# Packmind Recipes';
    const requiredInstructionPhrase = '🚨 **MANDATORY STEP** 🚨';
    const requiredAvailableRecipesSection = '## Available Recipes';

    const hasHeaderPrefix = existingContent.includes(requiredHeaderPrefix);
    const hasInstructions = existingContent.includes(requiredInstructionPhrase);
    const hasAvailableRecipesSection = existingContent.includes(
      requiredAvailableRecipesSection,
    );

    return hasHeaderPrefix && hasInstructions && hasAvailableRecipesSection;
  }

  /**
   * Create the complete recipes index content
   */
  private createRecipesIndexContent(instructions: string): string {
    return `---
alwaysApply: true
---

# Packmind Recipes

${instructions}`;
  }
}
