import { PackmindLogger } from '@packmind/logger';
import {
  CAMEL_TO_YAML_KEY,
  CODING_AGENT_ARTEFACT_PATHS,
  CURSOR_ADDITIONAL_FIELDS,
  DeleteItem,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  CommandVersion,
  SkillFileOutput,
  SkillVersion,
  StandardVersion,
  Target,
  camelToKebab,
  filterAdditionalProperties,
  sortAdditionalPropertiesKeys,
} from '@packmind/types';
import {
  DeployDefaultSkillsOptions,
  ICodingAgentDeployer,
} from '../../../domain/repository/ICodingAgentDeployer';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { formatAdditionalPropertyYaml } from '../utils/YamlFrontmatterUtils';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const origin = 'CursorDeployer';

export class CursorDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.cursor;
  private static readonly STANDARD_DEPLOY_DIR =
    CODING_AGENT_ARTEFACT_PATHS.cursor.standard + 'packmind/';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_COMMANDS_PATH = '.cursor/commands/packmind';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_RECIPES_INDEX_PATH =
    '.cursor/rules/packmind/recipes-index.mdc';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options?: DeployDefaultSkillsOptions) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Cursor',
      CursorDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
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

    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForCommand(recipe);
      const targetPrefixedPath = getTargetPrefixedPath(
        commandFile.path,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipe.name,
        artifactId: recipe.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
        target,
      ),
      type: DeleteItemType.File,
    });

    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        `${CursorDeployer.LEGACY_COMMANDS_PATH}/`,
        target,
      ),
      type: DeleteItemType.Directory,
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

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    return fileUpdates;
  }

  async generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Cursor)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForCommand(recipe);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipe.name,
        artifactId: recipe.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    fileUpdates.delete.push({
      path: `${CursorDeployer.LEGACY_COMMANDS_PATH}/`,
      type: DeleteItemType.Directory,
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

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
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
          artifactId: skillVersion.skillId as string,
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

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCursorSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    return fileUpdates;
  }

  async deployArtifacts(
    recipeVersions: CommandVersion[],
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

    for (const recipe of recipeVersions) {
      const commandFile = this.generateCursorCommandForCommand(recipe);
      fileUpdates.createOrUpdate.push({
        path: commandFile.path,
        content: commandFile.content,
        artifactType: 'command',
        artifactName: recipe.name,
        artifactId: recipe.recipeId as string,
      });
    }

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCursorConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCursorSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    fileUpdates.delete.push({
      path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    fileUpdates.delete.push({
      path: `${CursorDeployer.LEGACY_COMMANDS_PATH}/`,
      type: DeleteItemType.Directory,
    });

    return fileUpdates;
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: CommandVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    installed: {
      recipeVersions: CommandVersion[];
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

    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.mdc`,
        type: DeleteItemType.File,
      });
    }

    const hasRemovedCommands = removed.recipeVersions.length > 0;
    if (hasRemovedCommands) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.LEGACY_COMMANDS_PATH}/`,
        type: DeleteItemType.Directory,
      });
    }

    const hasRemovedStandards = removed.standardVersions.length > 0;
    if (hasRemovedStandards && installed.standardVersions.length === 0) {
      fileUpdates.delete.push({
        path: CursorDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      });
    }

    // Directory deletes are expanded to individual files by the git port
    // (CommitToGitUseCase), so listing the skill folder is enough.
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `${CursorDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  async generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: CommandVersion[];
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
        path: `${CursorDeployer.LEGACY_COMMANDS_PATH}/`,
        type: DeleteItemType.Directory,
      },
      {
        path: CursorDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      },
      {
        path: CursorDeployer.LEGACY_RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      },
    ];

    for (const recipeVersion of artifacts.recipeVersions) {
      deleteItems.push({
        path: `${CursorDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${CursorDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${CursorDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return {
      createOrUpdate: [],
      delete: deleteItems,
    };
  }

  private generateCursorCommandForCommand(recipe: CommandVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Cursor command for recipe', {
      recipeSlug: recipe.slug,
    });

    const path = `${CursorDeployer.ARTEFACT_PATHS.command}${recipe.slug}.md`;
    const content = recipe.content;

    return {
      path,
      content,
    };
  }

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
      content = `---
globs: ${standardVersion.scope}
alwaysApply: false
---
${instructionContent}`;
    } else {
      content = `---
alwaysApply: true
---
${instructionContent}`;
    }

    const path = `${CursorDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.mdc`;

    return {
      path,
      content,
    };
  }

  getSkillsFolderPath(): string {
    return CursorDeployer.ARTEFACT_PATHS.skill;
  }

  private generateCursorSkillFiles(
    skillVersion: SkillVersion,
  ): SkillFileOutput[] {
    const files: SkillFileOutput[] = [];

    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `${CursorDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/SKILL.md`,
      content: skillMdContent,
    });

    if (skillVersion.files && skillVersion.files.length > 0) {
      for (const file of skillVersion.files) {
        // Already generated above from the skill prompt.
        if (file.path.toUpperCase() === 'SKILL.MD') {
          continue;
        }
        files.push({
          path: `${CursorDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          skillFileId: file.id,
          skillFilePermissions: file.permissions,
        });
      }
    }

    return files;
  }

  private generateSkillMdContent(skillVersion: SkillVersion): string {
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

    if (
      skillVersion.additionalProperties &&
      Object.keys(skillVersion.additionalProperties).length > 0
    ) {
      const filtered = filterAdditionalProperties(
        skillVersion.additionalProperties,
        CURSOR_ADDITIONAL_FIELDS,
      );
      for (const [camelKey, value] of sortAdditionalPropertiesKeys(filtered)) {
        const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
        frontmatterFields.push(formatAdditionalPropertyYaml(yamlKey, value));
      }
    }

    const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

    return `${frontmatter}

${skillVersion.prompt}`;
  }

  // YAML single-quoted scalars escape a quote by doubling it.
  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, "''");
  }
}
