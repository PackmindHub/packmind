import { PackmindLogger } from '@packmind/logger';
import {
  CODING_AGENT_ARTEFACT_PATHS,
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
} from '@packmind/types';
import {
  DeployDefaultSkillsOptions,
  ICodingAgentDeployer,
} from '../../../domain/repository/ICodingAgentDeployer';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { escapeSingleQuotes, getTargetPrefixedPath } from '../utils/FileUtils';
import { generateSkillMdContent } from '../utils/SkillMdContentBuilder';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const origin = 'ClaudeDeployer';

export class ClaudeDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.claude;
  private static readonly STANDARD_DEPLOY_DIR =
    CODING_AGENT_ARTEFACT_PATHS.claude.standard + 'packmind/';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_COMMANDS_FOLDER_PATH =
    '.claude/commands/packmind/';
  private static readonly CLAUDE_MD_PATH = 'CLAUDE.md';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options: DeployDefaultSkillsOptions) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Claude',
      ClaudeDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
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

    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForCommand(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        target,
      ),
      type: DeleteItemType.Directory,
    });

    // Empty section content removes the marker-delimited block outright.
    const claudeMdPath = getTargetPrefixedPath(
      ClaudeDeployer.CLAUDE_MD_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: claudeMdPath,
      sections: [{ key: 'Packmind recipes', content: '' }],
    });

    return fileUpdates;
  }

  private generateClaudeConfigForCommand(recipeVersion: CommandVersion): {
    path: string;
    content: string;
  } {
    const description = recipeVersion.name;

    const frontmatter = `---
description: '${escapeSingleQuotes(description)}'
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;

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

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    // Empty section content removes the marker-delimited block outright.
    const claudeMdPath = getTargetPrefixedPath(
      ClaudeDeployer.CLAUDE_MD_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: claudeMdPath,
      sections: [{ key: 'Packmind standards', content: '' }],
    });

    return fileUpdates;
  }

  async generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Claude Code)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    fileUpdates.delete.push({
      path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
      type: DeleteItemType.Directory,
    });

    // Empty section content removes the marker-delimited block outright.
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [{ key: 'Packmind recipes', content: '' }],
    });

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

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    // Empty section content removes the marker-delimited block outright.
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [{ key: 'Packmind standards', content: '' }],
    });

    return fileUpdates;
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for Claude Code', {
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
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
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
    this.logger.info('Generating file updates for skills (Claude Code)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
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
      'Deploying artifacts (recipes + standards + skills) for Claude Code',
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
      const configFile = this.generateClaudeConfigForCommand(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
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
      path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
      type: DeleteItemType.Directory,
    });

    // Empty section content removes the marker-delimited block outright.
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [
        { key: 'Packmind standards', content: '' },
        { key: 'Packmind recipes', content: '' },
      ],
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
    this.logger.info('Generating removal file updates for Claude Code', {
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
        path: `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    const hasRemovedCommands = removed.recipeVersions.length > 0;
    if (hasRemovedCommands) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
    }

    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      });
    }

    // Delete skill directories for removed skills
    // (git port will expand directory paths to individual files)
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
    this.logger.info('Generating agent cleanup file updates for Claude Code', {
      recipesCount: artifacts.recipeVersions.length,
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    const deleteItems: DeleteItem[] = [
      {
        path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      },
      {
        path: ClaudeDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      },
    ];

    for (const recipeVersion of artifacts.recipeVersions) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return {
      createOrUpdate: [
        {
          path: ClaudeDeployer.CLAUDE_MD_PATH,
          sections: [
            { key: 'Packmind standards', content: '' },
            { key: 'Packmind recipes', content: '' },
          ],
        },
      ],
      delete: deleteItems,
    };
  }

  // Splits a comma-separated scope into a YAML block sequence. Commas inside
  // braces are not separators, so a brace expansion such as `**/*.{ts,tsx}`
  // stays a single path.
  private formatPathsValue(scope: string): string {
    const paths: string[] = [];
    let currentPath = '';
    let braceDepth = 0;

    for (let i = 0; i < scope.length; i++) {
      const char = scope[i];

      if (char === '{') {
        braceDepth++;
        currentPath += char;
      } else if (char === '}') {
        braceDepth--;
        currentPath += char;
      } else if (char === ',' && braceDepth === 0) {
        const trimmed = currentPath.trim();
        if (trimmed) {
          paths.push(trimmed);
        }
        currentPath = '';
      } else {
        currentPath += char;
      }
    }

    const trimmed = currentPath.trim();
    if (trimmed) {
      paths.push(trimmed);
    }

    return paths.map((p) => `\n  - "${p}"`).join('');
  }

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

    const summary = standardVersion.description?.trim() || standardVersion.name;

    let frontmatter: string;

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      frontmatter = `---
name: '${escapeSingleQuotes(standardVersion.name)}'
paths:${this.formatPathsValue(standardVersion.scope)}
alwaysApply: false
description: '${escapeSingleQuotes(summary)}'
---`;
    } else {
      frontmatter = `---
name: '${escapeSingleQuotes(standardVersion.name)}'
alwaysApply: true
description: '${escapeSingleQuotes(summary)}'
---`;
    }

    const content = `${frontmatter}

${instructionContent}`;

    const path = `${ClaudeDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  private generateClaudeSkillFiles(
    skillVersion: SkillVersion,
  ): SkillFileOutput[] {
    const files: SkillFileOutput[] = [];

    files.push({
      path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/SKILL.md`,
      content: generateSkillMdContent(skillVersion),
    });

    if (skillVersion.files && skillVersion.files.length > 0) {
      for (const file of skillVersion.files) {
        if (file.path.toUpperCase() === 'SKILL.MD') {
          continue;
        }
        files.push({
          path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          skillFileId: file.id,
          skillFilePermissions: file.permissions,
        });
      }
    }

    return files;
  }

  getSkillsFolderPath(): string {
    return ClaudeDeployer.ARTEFACT_PATHS.skill;
  }
}
