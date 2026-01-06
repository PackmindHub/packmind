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
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly COMMANDS_PATH = '.cursor/commands/packmind';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_RECIPES_INDEX_PATH =
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

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual command files for each recipe
    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForRecipe(recipe);
      const targetPrefixedPath = getTargetPrefixedPath(
        commandFile.path,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: commandFile.content,
      });
    }

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
        target,
      ),
    });

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

    // Generate individual command files for each recipe
    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForRecipe(recipe);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
      });
    }

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
    });

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

    // Generate individual command files for each recipe
    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForRecipe(recipe);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
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

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
    });

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

    // Delete individual command files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.COMMANDS_PATH}/${recipeVersion.slug}.md`,
      });
    }

    // Delete individual Cursor configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`,
      });
    }

    // Delete commands folder if no recipes remain installed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes && installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.COMMANDS_PATH}/`,
      });
    }

    // Delete packmind folder if all standards are removed
    const hasRemovedStandards = removed.standardVersions.length > 0;
    if (hasRemovedStandards && installed.standardVersions.length === 0) {
      fileUpdates.delete.push({
        path: '.cursor/rules/packmind/',
      });
    }

    return fileUpdates;
  }

  /**
   * Generate Cursor command file for a specific recipe
   */
  private generateCursorCommandForRecipe(recipe: RecipeVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Cursor command for recipe', {
      recipeSlug: recipe.slug,
    });

    const path = `${CursorDeployer.COMMANDS_PATH}/${recipe.slug}.md`;
    const content = recipe.content;

    return {
      path,
      content,
    };
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
