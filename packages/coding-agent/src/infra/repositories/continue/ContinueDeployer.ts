import { PackmindLogger } from '@packmind/logger';
import {
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { escapeSingleQuotes, getTargetPrefixedPath } from '../utils/FileUtils';

const origin = 'ContinueDeployer';

export class ContinueDeployer implements ICodingAgentDeployer {
  private static readonly COMMANDS_FOLDER_PATH = '.continue/prompts/';
  private static readonly STANDARDS_FOLDER_PATH = '.continue/rules/packmind/';
  private static readonly LEGACY_RECIPES_INDEX_PATH =
    '.continue/rules/packmind/recipes-index.md';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Continue', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Continue command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const commandFile = this.generateContinueCommand(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(
        commandFile.path,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Delete legacy recipes-index.md file
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        ContinueDeployer.LEGACY_RECIPES_INDEX_PATH,
        target,
      ),
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Continue', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Continue configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateContinueConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    return fileUpdates;
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Continue)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Continue command files for each recipe (without target prefix)
    for (const recipeVersion of recipeVersions) {
      const commandFile = this.generateContinueCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Delete legacy recipes-index.md file
    fileUpdates.delete.push({
      path: ContinueDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Continue)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Continue configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateContinueConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    return fileUpdates;
  }

  async deploySkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    // Skills not supported for Continue deployer yet
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForSkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    // Skills not supported for Continue deployer yet
    return { createOrUpdate: [], delete: [] };
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    this.logger.info('Deploying artifacts (recipes + standards) for Continue', {
      recipesCount: recipeVersions.length,
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Continue command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const commandFile = this.generateContinueCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Generate individual Continue configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateContinueConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    // Delete legacy recipes-index.md file
    fileUpdates.delete.push({
      path: ContinueDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
  ): Promise<FileUpdates> {
    this.logger.info('Generating removal file updates for Continue', {
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      installedRecipesCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete individual Continue command files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${ContinueDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete commands folder if all recipes are removed and something was actually removed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes && installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: ContinueDeployer.COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
      // Also delete the legacy recipes-index.md if it exists
      fileUpdates.delete.push({
        path: ContinueDeployer.LEGACY_RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

    // Delete individual Continue configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${ContinueDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete rules/packmind folder if all standards are removed and something was actually removed
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: ContinueDeployer.STANDARDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  async generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }): Promise<FileUpdates> {
    this.logger.info('Generating agent cleanup file updates for Continue', {
      recipesCount: artifacts.recipeVersions.length,
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [
        {
          path: ContinueDeployer.LEGACY_RECIPES_INDEX_PATH,
          type: DeleteItemType.File,
        },
        {
          path: ContinueDeployer.STANDARDS_FOLDER_PATH,
          type: DeleteItemType.Directory,
        },
      ],
    };

    for (const recipeVersion of artifacts.recipeVersions) {
      fileUpdates.delete.push({
        path: `${ContinueDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    for (const standardVersion of artifacts.standardVersions) {
      fileUpdates.delete.push({
        path: `${ContinueDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    return fileUpdates;
  }

  /**
   * Generate Continue command file for a specific recipe
   */
  private generateContinueCommand(recipeVersion: RecipeVersion): {
    path: string;
    content: string;
  } {
    const description = recipeVersion.summary?.trim() || recipeVersion.name;

    const frontmatter = `---
name: '${escapeSingleQuotes(recipeVersion.name)}'
description: '${escapeSingleQuotes(description)}'
invokable: true
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${ContinueDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  /**
   * Format globs value for YAML frontmatter.
   * Parses comma-separated globs and formats them as a YAML array.
   * Quotes individual globs that start with one or two asterisks/stars to prevent YAML syntax issues.
   * Note: Commas inside braces are not treated as separators (e.g., a pattern with braces is a single glob).
   */
  private formatGlobsValue(scope: string): string {
    // Parse comma-separated globs, but don't split on commas inside braces {}
    const globs: string[] = [];
    let currentGlob = '';
    let braceDepth = 0;

    for (let i = 0; i < scope.length; i++) {
      const char = scope[i];

      if (char === '{') {
        braceDepth++;
        currentGlob += char;
      } else if (char === '}') {
        braceDepth--;
        currentGlob += char;
      } else if (char === ',' && braceDepth === 0) {
        // Only split on commas that are not inside braces
        const trimmed = currentGlob.trim();
        if (trimmed) {
          globs.push(trimmed);
        }
        currentGlob = '';
      } else {
        currentGlob += char;
      }
    }

    // Add the last glob
    const trimmed = currentGlob.trim();
    if (trimmed) {
      globs.push(trimmed);
    }

    // If only one glob, check if it needs quoting
    if (globs.length === 1) {
      const glob = globs[0];
      if (glob.startsWith('**/') || glob.startsWith('*')) {
        return `"${glob}"`;
      }
      return glob;
    }

    // Multiple globs: format as YAML array
    const quotedGlobs = globs.map((glob) => {
      if (glob.startsWith('**/') || glob.startsWith('*')) {
        return `"${glob}"`;
      }
      return glob;
    });

    return `[${quotedGlobs.join(', ')}]`;
  }

  /**
   * Generate Continue configuration file for a specific standard
   */
  private async generateContinueConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    this.logger.debug('Generating Continue configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });
    const rules =
      standardVersion.rules ??
      (await this.standardsPort?.getRulesByStandardId(
        standardVersion.standardId,
      )) ??
      [];

    const instructionContent =
      GenericStandardSectionWriter.formatStandardContent({
        standardVersion,
        rules,
        link: `../../../.packmind/standards/${standardVersion.slug}.md`,
      });

    const summary = standardVersion.summary?.trim() || standardVersion.name;

    let frontmatter: string;

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      // When the scope is not null or empty
      frontmatter = `---
name: '${escapeSingleQuotes(standardVersion.name)}'
globs: ${this.formatGlobsValue(standardVersion.scope)}
alwaysApply: false
description: '${escapeSingleQuotes(summary)}'
---`;
    } else {
      // When the scope is empty
      frontmatter = `---
name: '${escapeSingleQuotes(standardVersion.name)}'
alwaysApply: true
description: '${escapeSingleQuotes(summary)}'
---`;
    }

    const content = `${frontmatter}

${instructionContent}`;

    const path = `.continue/rules/packmind/standard-${standardVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  getSkillsFolderPath(): undefined {
    // Skills not supported for Continue deployer yet
    return undefined;
  }
}
