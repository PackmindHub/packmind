import { PackmindLogger } from '@packmind/logger';
import {
  DeleteItem,
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
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly COMMANDS_PATH = '.cursor/commands/packmind';
  private static readonly SKILLS_FOLDER_PATH = '.cursor/skills/';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_RECIPES_INDEX_PATH =
    '.cursor/rules/packmind/recipes-index.mdc';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options?: {
    cliVersion?: string;
    includeBeta?: boolean;
  }) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Cursor',
      '.cursor/skills/',
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
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
        artifactType: 'command',
        artifactName: recipe.name,
      });
    }

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
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
        artifactType: 'standard',
        artifactName: standardVersion.name,
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
        artifactType: 'command',
        artifactName: recipe.name,
      });
    }

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
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
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    return fileUpdates;
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for Cursor', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Cursor skill files for each skill
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCursorSkillFiles(skillVersion);
      for (const file of skillFiles) {
        const targetPrefixedPath = getTargetPrefixedPath(file.path, target);
        fileUpdates.createOrUpdate.push({
          path: targetPrefixedPath,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    return fileUpdates;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for skills (Cursor)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Cursor skill files for each skill (without target prefix)
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCursorSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    return fileUpdates;
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    this.logger.info(
      'Deploying artifacts (recipes + standards + skills) for Cursor',
      {
        recipesCount: recipeVersions.length,
        standardsCount: standardVersions.length,
        skillsCount: skillVersions.length,
      },
    );

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
        artifactType: 'command',
        artifactName: recipe.name,
      });
    }

    // Generate individual Cursor configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    // Generate individual Cursor skill files for each skill
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCursorSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    // Clean up legacy recipes-index.mdc file
    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
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
    this.logger.info('Generating removal file updates for Cursor', {
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      installedRecipesCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
      installedSkillsCount: installed.skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete individual command files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.COMMANDS_PATH}/${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete individual Cursor configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.cursor/rules/packmind/standard-${standardVersion.slug}.mdc`,
        type: DeleteItemType.File,
      });
    }

    // Delete commands folder if no recipes remain installed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes && installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.COMMANDS_PATH}/`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete packmind folder if all standards are removed
    const hasRemovedStandards = removed.standardVersions.length > 0;
    if (hasRemovedStandards && installed.standardVersions.length === 0) {
      fileUpdates.delete.push({
        path: '.cursor/rules/packmind/',
        type: DeleteItemType.Directory,
      });
    }

    // Delete skill directories for removed skills
    // (git port will expand directory paths to individual files)
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `.cursor/skills/${skillVersion.slug}`,
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
    this.logger.info('Generating agent cleanup file updates for Cursor', {
      recipesCount: artifacts.recipeVersions.length,
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    const deleteItems: DeleteItem[] = [
      {
        path: CursorDeployer.COMMANDS_PATH,
        type: DeleteItemType.Directory,
      },
      {
        path: '.cursor/rules/packmind/',
        type: DeleteItemType.Directory,
      },
      {
        path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      },
    ];

    // Delete default skills (managed by Packmind)
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${CursorDeployer.SKILLS_FOLDER_PATH}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills (managed by Packmind)
    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${CursorDeployer.SKILLS_FOLDER_PATH}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    console.log('-----------------------------------------');
    console.log('-----------------------------------------');
    console.log('-----------------------------------------');
    console.log(JSON.stringify(deleteItems, null, 2));

    return {
      createOrUpdate: [],
      delete: deleteItems,
    };
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

  getSkillsFolderPath(): string {
    return CursorDeployer.SKILLS_FOLDER_PATH;
  }

  private generateCursorSkillFiles(skillVersion: SkillVersion): Array<{
    path: string;
    content: string;
    isBase64?: boolean;
    skillFileId?: string;
    skillFilePermissions?: string;
  }> {
    const files: Array<{
      path: string;
      content: string;
      isBase64?: boolean;
      skillFileId?: string;
      skillFilePermissions?: string;
    }> = [];

    // Generate SKILL.md (main skill file)
    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `.cursor/skills/${skillVersion.slug}/SKILL.md`,
      content: skillMdContent,
    });

    // Add additional skill files if they exist (excluding SKILL.md which we already generated)
    if (skillVersion.files && skillVersion.files.length > 0) {
      for (const file of skillVersion.files) {
        // Skip SKILL.md as it's already generated from the prompt
        if (file.path.toUpperCase() === 'SKILL.MD') {
          continue;
        }
        files.push({
          path: `.cursor/skills/${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          skillFileId: file.id,
          skillFilePermissions: file.permissions,
        });
      }
    }

    return files;
  }

  /**
   * Generate the SKILL.md content with frontmatter for a specific skill version
   */
  private generateSkillMdContent(skillVersion: SkillVersion): string {
    // Build frontmatter according to Agent Skills specification
    const frontmatterFields: string[] = [];

    if (skillVersion.name) {
      frontmatterFields.push(
        `name: '${this.escapeSingleQuotes(skillVersion.name)}'`,
      );
    }

    if (skillVersion.description) {
      frontmatterFields.push(
        `description: '${this.escapeSingleQuotes(skillVersion.description)}'`,
      );
    }

    if (skillVersion.license) {
      frontmatterFields.push(
        `license: '${this.escapeSingleQuotes(skillVersion.license)}'`,
      );
    }

    if (skillVersion.compatibility) {
      frontmatterFields.push(
        `compatibility: '${this.escapeSingleQuotes(skillVersion.compatibility)}'`,
      );
    }

    if (skillVersion.allowedTools) {
      frontmatterFields.push(
        `allowed-tools: '${this.escapeSingleQuotes(skillVersion.allowedTools)}'`,
      );
    }

    if (
      skillVersion.metadata &&
      Object.keys(skillVersion.metadata).length > 0
    ) {
      // Metadata is stored as JSONB, convert to YAML format
      const metadataYaml = Object.entries(skillVersion.metadata)
        .map(
          ([key, value]) =>
            `  ${key}: '${this.escapeSingleQuotes(String(value))}'`,
        )
        .join('\n');
      frontmatterFields.push(`metadata:\n${metadataYaml}`);
    }

    const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

    // Content is the skill prompt (body)
    return `${frontmatter}

${skillVersion.prompt}`;
  }

  /**
   * Escape single quotes in YAML values to prevent parsing errors
   */
  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, "''");
  }
}
