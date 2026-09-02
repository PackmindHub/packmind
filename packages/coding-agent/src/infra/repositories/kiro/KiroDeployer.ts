import { PackmindLogger } from '@packmind/logger';
import {
  CODING_AGENT_ARTEFACT_PATHS,
  DeleteItem,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IStandardsPort,
  CommandVersion,
  SkillFileOutput,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import {
  DeployDefaultSkillsOptions,
  ICodingAgentDeployer,
} from '../../../domain/repository/ICodingAgentDeployer';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import {
  escapeSingleQuotes,
  getTargetPrefixedPath,
  splitScopeGlobs,
} from '../utils/FileUtils';
import { generateSkillMdContentWithYamlFrontmatter } from '../utils/SkillMdContentBuilder';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const origin = 'KiroDeployer';

const EMPTY_UPDATES = (): FileUpdates => ({ createOrUpdate: [], delete: [] });

export class KiroDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.kiro;
  private static readonly STANDARD_FILE_PREFIX = 'packmind-standard-';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options?: DeployDefaultSkillsOptions) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Kiro',
      KiroDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Skipping commands for Kiro: no command directory', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    return EMPTY_UPDATES();
  }

  async generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Skipping commands for Kiro: no command directory', {
      recipesCount: recipeVersions.length,
    });

    return EMPTY_UPDATES();
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Kiro', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates =
      await this.generateFileUpdatesForStandards(standardVersions);

    return {
      createOrUpdate: fileUpdates.createOrUpdate.map((file) => ({
        ...file,
        path: getTargetPrefixedPath(file.path, target),
      })),
      delete: fileUpdates.delete.map((item) => ({
        ...item,
        path: getTargetPrefixedPath(item.path, target),
      })),
    };
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Kiro)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates = EMPTY_UPDATES();

    for (const standardVersion of standardVersions) {
      const steeringFile = await this.generateSteeringFile(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: steeringFile.path,
        content: steeringFile.content,
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
    this.logger.info('Deploying skills for Kiro', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates = await this.generateFileUpdatesForSkills(skillVersions);

    return {
      createOrUpdate: fileUpdates.createOrUpdate.map((file) => ({
        ...file,
        path: getTargetPrefixedPath(file.path, target),
      })),
      delete: fileUpdates.delete.map((item) => ({
        ...item,
        path: getTargetPrefixedPath(item.path, target),
      })),
    };
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for skills (Kiro)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates = EMPTY_UPDATES();

    for (const skillVersion of skillVersions) {
      for (const file of this.generateKiroSkillFiles(skillVersion)) {
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
    this.logger.info('Deploying artifacts (standards + skills) for Kiro', {
      recipesCount: recipeVersions.length,
      standardsCount: standardVersions.length,
      skillsCount: skillVersions.length,
    });

    const standardUpdates =
      await this.generateFileUpdatesForStandards(standardVersions);
    const skillUpdates = await this.generateFileUpdatesForSkills(skillVersions);

    return {
      createOrUpdate: [
        ...standardUpdates.createOrUpdate,
        ...skillUpdates.createOrUpdate,
      ],
      delete: [...standardUpdates.delete, ...skillUpdates.delete],
    };
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
    this.logger.info('Generating removal file updates for Kiro', {
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      installedStandardsCount: installed.standardVersions.length,
      installedSkillsCount: installed.skillVersions.length,
    });

    const fileUpdates = EMPTY_UPDATES();

    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: this.steeringFilePath(standardVersion.slug),
        type: DeleteItemType.File,
      });
    }

    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `${KiroDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
    this.logger.info('Generating agent cleanup file updates for Kiro', {
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    const deleteItems: DeleteItem[] = [];

    for (const standardVersion of artifacts.standardVersions) {
      deleteItems.push({
        path: this.steeringFilePath(standardVersion.slug),
        type: DeleteItemType.File,
      });
    }

    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${KiroDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${KiroDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return {
      createOrUpdate: [],
      delete: deleteItems,
    };
  }

  getSkillsFolderPath(): string {
    return KiroDeployer.ARTEFACT_PATHS.skill;
  }

  private steeringFilePath(slug: string): string {
    return `${KiroDeployer.ARTEFACT_PATHS.standard}${KiroDeployer.STANDARD_FILE_PREFIX}${slug}.md`;
  }

  private async generateSteeringFile(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    this.logger.debug('Generating Kiro steering file for standard', {
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
        link: `../../.packmind/standards/${standardVersion.slug}.md`,
      });

    const scope = standardVersion.scope?.trim() ?? '';
    const frontmatter =
      scope !== ''
        ? `---
inclusion: fileMatch
fileMatchPattern: ${this.formatFileMatchPattern(scope)}
---`
        : `---
inclusion: always
---`;

    return {
      path: this.steeringFilePath(standardVersion.slug),
      content: `${frontmatter}
${instructionContent}`,
    };
  }

  private formatFileMatchPattern(scope: string): string {
    const globs = splitScopeGlobs(scope).map(
      (glob) => `'${escapeSingleQuotes(glob)}'`,
    );

    return `[${globs.join(', ')}]`;
  }

  private generateKiroSkillFiles(
    skillVersion: SkillVersion,
  ): SkillFileOutput[] {
    const skillDir = `${KiroDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`;
    const files: SkillFileOutput[] = [
      {
        path: `${skillDir}/SKILL.md`,
        content: generateSkillMdContentWithYamlFrontmatter(skillVersion),
      },
    ];

    for (const file of skillVersion.files ?? []) {
      if (file.path.toUpperCase() === 'SKILL.MD') {
        continue;
      }
      files.push({
        path: `${skillDir}/${file.path}`,
        content: file.content,
        isBase64: file.isBase64,
        skillFileId: file.id,
        skillFilePermissions: file.permissions,
      });
    }

    return files;
  }
}
