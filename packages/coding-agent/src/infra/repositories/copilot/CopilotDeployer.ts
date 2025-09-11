import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger } from '@packmind/shared';
import { GenericRecipeSectionWriter } from '../genericRecipe/GenericRecipeSectionWriter';

const origin = 'CopilotDeployer';

export class CopilotDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH =
    '.github/instructions/packmind-recipes-index.instructions.md';
  private readonly logger: PackmindLogger;

  constructor(private readonly gitHexa?: GitHexa) {
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for GitHub Copilot', {
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
        path: CopilotDeployer.RECIPES_INDEX_PATH,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for GitHub Copilot', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile = this.generateCopilotConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  /**
   * Get existing content from recipes-index.instructions.md file
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
        CopilotDeployer.RECIPES_INDEX_PATH,
      );
      return existingFile?.content || '';
    } catch (error) {
      this.logger.debug(
        'Failed to get existing Copilot recipes index content',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
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

    const packmindInstructions =
      GenericRecipeSectionWriter.generateRecipesSection({
        agentName: 'GitHub Copilot',
        repoName,
        recipesSection,
      });

    // Check if recipe instructions are already present
    const hasRecipeInstructions =
      this.checkForRecipeInstructions(existingContent);

    if (hasRecipeInstructions) {
      this.logger.debug(
        'Recipe instructions already present in Copilot recipes index content',
      );
      // When content already exists, return existing content unchanged
      // The combination of recipes is handled at a higher level
      return existingContent;
    }

    // Create new content with Copilot header
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
   * Generate GitHub Copilot configuration file for a specific standard
   */
  private generateCopilotConfigForStandard(standardVersion: StandardVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Copilot configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });

    const applyTo = standardVersion.scope || '**';

    const content = `---
applyTo: '${applyTo}'
---
Apply the coding rules described #file:../../.packmind/standards/${standardVersion.slug}.md`;

    const path = `.github/instructions/packmind-${standardVersion.slug}.instructions.md`;

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
applyTo: '**'
---

# Packmind Recipes

${instructions}`;
  }
}
