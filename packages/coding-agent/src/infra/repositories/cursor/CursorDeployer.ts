import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { GenericRecipeSectionWriter } from '../genericSectionWriter/GenericRecipeSectionWriter';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH =
    '.cursor/rules/packmind/recipes-index.mdc';
  private readonly logger: PackmindLogger;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
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
    const updatedContent = await this.generateRecipeContent(recipeVersions);

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Only create file if content is not empty and was updated
    if (updatedContent !== '' && updatedContent !== existingContent) {
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

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Cursor)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate content without target prefixing
    const content = this.generateRecipeContentSimple(recipeVersions);

    // Only add file if there is content
    if (content !== '') {
      fileUpdates.createOrUpdate.push({
        path: CursorDeployer.RECIPES_INDEX_PATH,
        content,
      });
    }

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Cursor)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Cursor configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Deploying artifacts (recipes + standards) for Cursor', {
      recipesCount: recipeVersions.length,
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate recipes index file only if there are recipes
    const recipesContent = this.generateRecipeContentSimple(recipeVersions);
    if (recipesContent !== '') {
      fileUpdates.createOrUpdate.push({
        path: CursorDeployer.RECIPES_INDEX_PATH,
        content: recipesContent,
      });
    }

    // Generate individual Cursor configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
    },
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
    },
  ): Promise<FileUpdates> {
    this.logger.info('Generating removal file updates for Cursor', {
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      installedRecipesCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete recipes index file if no recipes remain installed
    if (installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: CursorDeployer.RECIPES_INDEX_PATH,
      });
    }

    // Delete individual Cursor configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`,
      });
    }

    // Delete packmind folder if all artifacts are removed and something was actually removed
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: '.cursor/rules/packmind/',
      });
    }

    return fileUpdates;
  }

  /**
   * Generate content with recipe instructions without target/repo context
   */
  private generateRecipeContentSimple(recipeVersions: RecipeVersion[]): string {
    // Generate recipes list
    const recipesSection = this.generateRecipesSection(recipeVersions);

    // If no recipes, return empty string to indicate no file should be created
    if (recipesSection === '') {
      return '';
    }

    const packmindInstructions =
      GenericRecipeSectionWriter.generateRecipesSection({
        recipesSection,
      });

    return `---
alwaysApply: true
---

${packmindInstructions}`;
  }

  /**
   * Get existing content from packmind-recipes-index.mdc file
   */
  private async getExistingRecipesIndexContent(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<string> {
    if (!this.gitPort) {
      this.logger.debug('No GitHexa available, returning empty content');
      return '';
    }

    try {
      const targetPrefixedPath = getTargetPrefixedPath(
        CursorDeployer.RECIPES_INDEX_PATH,
        target,
      );
      const existingFile = await this.gitPort.getFileFromRepo(
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
  ): Promise<string> {
    // Generate recipes list
    const recipesSection = this.generateRecipesSection(recipeVersions);

    // If no recipes, return empty string to indicate no file should be created
    if (recipesSection === '') {
      return '';
    }

    const packmindInstructions =
      GenericRecipeSectionWriter.generateRecipesSection({
        recipesSection,
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
      return '';
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
      standardVersion.rules ??
      (await this.standardsPort?.getRulesByStandardId(
        standardVersion.standardId,
      )) ??
      [];

    let content: string;

    const instructionContent =
      GenericStandardSectionWriter.formatStandardContent({
        standardVersion,
        rules,
        link: `../../../.packmind/standards/${standardVersion.slug}.md`,
      });

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      // When the scope is not null or empty
      content = `---
globs: ${standardVersion.scope}
alwaysApply: false
---
${instructionContent}`;
    } else {
      // When the scope is empty
      content = `---
alwaysApply: true
---
${instructionContent}`;
    }

    const path = `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`;

    return {
      path,
      content,
    };
  }
}
