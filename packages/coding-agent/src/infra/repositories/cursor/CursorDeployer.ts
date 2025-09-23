import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardsHexa, StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger, Target } from '@packmind/shared';
import { GenericRecipeSectionWriter } from '../genericSectionWriter/GenericRecipeSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { GenericStandardWriter } from '../genericSectionWriter/GenericStandardWriter';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH =
    '.cursor/rules/packmind/recipes-index.mdc';
  private readonly logger: PackmindLogger;

  constructor(
    private readonly standardsHexa?: StandardsHexa,
    private readonly gitHexa?: GitHexa,
  ) {
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Cursor', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    // Get existing recipes index content
    const existingContent = await this.getExistingRecipesIndexContent(
      gitRepo,
      target,
    );

    // Generate content with recipe instructions
    const updatedContent = await this.generateRecipeContent(
      recipeVersions,
      gitRepo,
      target,
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Only create file if content was updated
    if (updatedContent !== existingContent) {
      const targetPrefixedPath = getTargetPrefixedPath(
        CursorDeployer.RECIPES_INDEX_PATH,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Cursor', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Cursor configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
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
    target: Target,
  ): Promise<string> {
    if (!this.gitHexa) {
      this.logger.debug('No GitHexa available, returning empty content');
      return '';
    }

    try {
      const targetPrefixedPath = getTargetPrefixedPath(
        CursorDeployer.RECIPES_INDEX_PATH,
        target,
      );
      const existingFile = await this.gitHexa.getFileFromRepo(
        gitRepo,
        targetPrefixedPath,
      );
      return existingFile?.content || '';
    } catch (error) {
      this.logger.debug('Failed to get existing Cursor recipes index content', {
        error: error instanceof Error ? error.message : String(error),
        targetPath: target.path,
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
    target: Target,
  ): Promise<string> {
    const repoName = `${gitRepo.owner}/${gitRepo.repo}`;
    const targetPath = target.path;

    // Generate recipes list
    const recipesSection = this.generateRecipesSection(recipeVersions);

    const packmindInstructions =
      GenericRecipeSectionWriter.generateRecipesSection({
        agentName: 'Cursor',
        repoName,
        recipesSection,
        target: targetPath,
      });

    return `---
alwaysApply: true
---

${packmindInstructions}`;
  }

  /**
   * Generate the recipes section with summaries
   */
  private generateRecipesSection(recipeVersions: RecipeVersion[]): string {
    if (recipeVersions.length === 0) {
      return `No recipes are currently available for this repository.`;
    }

    return recipeVersions
      .map(
        (recipe) =>
          `- [${recipe.name}](.packmind/recipes/${recipe.slug}.md) : ${recipe.summary || recipe.name}`,
      )
      .join('\n');
  }

  /**
   * Generate Cursor configuration file for a specific standard
   */
  private async generateCursorConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    this.logger.debug('Generating Cursor configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });
    const rules =
      (await this.standardsHexa?.getRulesByStandardId(
        standardVersion.standardId,
      )) ?? [];

    let content: string;

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      // When the scope is not null or empty
      content = `---
globs: ${standardVersion.scope}
alwaysApply: false
---
${GenericStandardWriter.writeStandard(standardVersion, rules)}`;
    } else {
      // When the scope is empty
      content = `---
alwaysApply: true
---
${GenericStandardWriter.writeStandard(standardVersion, rules)}`;
    }

    const path = `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`;

    return {
      path,
      content,
    };
  }
}
