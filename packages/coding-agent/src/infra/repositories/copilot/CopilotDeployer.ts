import { PackmindLogger } from '@packmind/logger';
import {
  CAMEL_TO_YAML_KEY,
  CODING_AGENT_ARTEFACT_PATHS,
  COPILOT_ADDITIONAL_FIELDS,
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

const origin = 'CopilotDeployer';

export class CopilotDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.copilot;
  /** @deprecated Legacy path to clean up during migration */
  private static readonly RECIPES_INDEX_PATH =
    '.github/instructions/packmind-recipes-index.instructions.md';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options?: DeployDefaultSkillsOptions) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'CoPilot',
      CopilotDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for GitHub Copilot', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForCommand(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(promptFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: promptFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: getTargetPrefixedPath(CopilotDeployer.RECIPES_INDEX_PATH, target),
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for GitHub Copilot', {
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
        await this.generateCopilotConfigForStandard(standardVersion);
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
    this.logger.info('Generating file updates for recipes (GitHub Copilot)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: promptFile.path,
        content: promptFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: CopilotDeployer.RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (GitHub Copilot)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCopilotConfigForStandard(standardVersion);
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
    this.logger.info('Deploying skills for GitHub Copilot', {
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
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        const targetPrefixedPath = getTargetPrefixedPath(
          skillFile.path,
          target,
        );
        fileUpdates.createOrUpdate.push({
          path: targetPrefixedPath,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: skillFile.skillFileId,
          skillFilePermissions: skillFile.skillFilePermissions,
        });
      }
    }

    return fileUpdates;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for skills (GitHub Copilot)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: skillFile.path,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: skillFile.skillFileId,
          skillFilePermissions: skillFile.skillFilePermissions,
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
      'Deploying artifacts (recipes + standards + skills) for GitHub Copilot',
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

    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: promptFile.path,
        content: promptFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCopilotConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: skillFile.path,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: skillFile.skillFileId,
          skillFilePermissions: skillFile.skillFilePermissions,
        });
      }
    }

    fileUpdates.delete.push({
      path: CopilotDeployer.RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
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
    this.logger.info('Generating removal file updates for GitHub Copilot', {
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
        path: `${CopilotDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.prompt.md`,
        type: DeleteItemType.File,
      });
    }

    if (
      removed.recipeVersions.length > 0 ||
      installed.recipeVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: CopilotDeployer.RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.standard}packmind-${standardVersion.slug}.instructions.md`,
        type: DeleteItemType.File,
      });
    }

    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
    this.logger.info(
      'Generating agent cleanup file updates for GitHub Copilot',
      {
        recipesCount: artifacts.recipeVersions.length,
        standardsCount: artifacts.standardVersions.length,
        skillsCount: artifacts.skillVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [
        {
          path: CopilotDeployer.RECIPES_INDEX_PATH,
          type: DeleteItemType.File,
        },
      ],
    };

    for (const recipeVersion of artifacts.recipeVersions) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.prompt.md`,
        type: DeleteItemType.File,
      });
    }

    for (const standardVersion of artifacts.standardVersions) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.standard}packmind-${standardVersion.slug}.instructions.md`,
        type: DeleteItemType.File,
      });
    }

    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    for (const skillVersion of artifacts.skillVersions) {
      fileUpdates.delete.push({
        path: `${CopilotDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  private async generateCopilotConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    this.logger.debug('Generating Copilot configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });
    const rules =
      standardVersion.rules ??
      (await this.standardsPort?.getRulesByStandardId(
        standardVersion.standardId,
      )) ??
      [];

    const applyTo = standardVersion.scope || '**';

    const content = `---
applyTo: '${applyTo}'
---
${GenericStandardSectionWriter.formatStandardContent({
  standardVersion,
  rules,
  link: `../../.packmind/standards/${standardVersion.slug}.md`,
})}`;

    const path = `${CopilotDeployer.ARTEFACT_PATHS.standard}packmind-${standardVersion.slug}.instructions.md`;

    return {
      path,
      content,
    };
  }

  private generateCopilotPromptForCommand(recipeVersion: CommandVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Copilot prompt for recipe', {
      recipeSlug: recipeVersion.slug,
      recipeName: recipeVersion.name,
    });

    const description = recipeVersion.name;

    const frontmatter = `---
description: '${this.escapeSingleQuotes(description)}'
agent: 'agent'
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${CopilotDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.prompt.md`;

    return {
      path,
      content,
    };
  }

  private generateCopilotSkillFiles(
    skillVersion: SkillVersion,
  ): SkillFileOutput[] {
    this.logger.debug('Generating Copilot skill files', {
      skillSlug: skillVersion.slug,
      skillName: skillVersion.name,
      fileCount: (skillVersion.files?.length ?? 0) + 1,
    });

    const files: SkillFileOutput[] = [];

    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `${CopilotDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/SKILL.md`,
      content: skillMdContent,
    });

    if (skillVersion.files && skillVersion.files.length > 0) {
      for (const file of skillVersion.files) {
        // Already generated above from the skill prompt.
        if (file.path.toUpperCase() === 'SKILL.MD') {
          continue;
        }
        files.push({
          path: `${CopilotDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/${file.path}`,
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
        COPILOT_ADDITIONAL_FIELDS,
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

  getSkillsFolderPath(): string {
    return CopilotDeployer.ARTEFACT_PATHS.skill;
  }
}
