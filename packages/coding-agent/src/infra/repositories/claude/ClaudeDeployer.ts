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

const origin = 'ClaudeDeployer';

export class ClaudeDeployer implements ICodingAgentDeployer {
  private static readonly STANDARDS_FOLDER_PATH = '.claude/rules/packmind/';
  private static readonly COMMANDS_FOLDER_PATH = '.claude/commands/packmind/';
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
    this.logger.info('Deploying recipes for Claude Code', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  /**
   * Generate Claude command file for a specific recipe
   */
  private generateClaudeConfigForRecipe(recipeVersion: RecipeVersion): {
    path: string;
    content: string;
  } {
    const description = recipeVersion.summary?.trim() || recipeVersion.name;

    const frontmatter = `---
description: ${description}
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${ClaudeDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Claude Code', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
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
    this.logger.info('Generating file updates for recipes (Claude Code)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude command files for each recipe (without target prefix)
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Claude Code)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
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
    this.logger.info(
      'Deploying artifacts (recipes + standards) for Claude Code',
      {
        recipesCount: recipeVersions.length,
        standardsCount: standardVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
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
    this.logger.info('Generating removal file updates for Claude Code', {
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      installedRecipesCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete individual Claude command files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`,
      });
    }

    // Delete commands folder if all recipes are removed and something was actually removed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes && installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.COMMANDS_FOLDER_PATH,
      });
    }

    // Delete individual Claude configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`,
      });
    }

    // Delete rules folder if all artifacts are removed and something was actually removed
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.STANDARDS_FOLDER_PATH,
      });
    }

    return fileUpdates;
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
   * Generate Claude configuration file for a specific standard
   */
  private async generateClaudeConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
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
name: ${standardVersion.name}
globs: ${this.formatGlobsValue(standardVersion.scope)}
alwaysApply: false
description: ${summary}
---`;
    } else {
      // When the scope is empty
      frontmatter = `---
name: ${standardVersion.name}
alwaysApply: true
description: ${summary}
---`;
    }

    const content = `${frontmatter}

${instructionContent}`;

    const path = `${ClaudeDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`;

    return {
      path,
      content,
    };
  }
}
