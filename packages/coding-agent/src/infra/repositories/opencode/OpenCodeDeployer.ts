import {
  CODING_AGENT_ARTEFACT_PATHS,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  RecipeVersion,
  SkillFile,
  SkillVersion,
  SkillVersionId,
  StandardVersion,
  Target,
} from '@packmind/types';
import {
  SingleFileDeployer,
  DeployerConfig,
} from '../genericSectionWriter/SingleFileDeployer';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

export class OpenCodeDeployer extends SingleFileDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.opencode;

  protected readonly config: DeployerConfig = {
    filePath: 'AGENTS.md',
    agentName: 'OpenCode',
    codingAgent: 'opencode',
  };

  async deployDefaultSkills(options?: {
    cliVersion?: string;
    includeBeta?: boolean;
  }) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'OpenCode',
      OpenCodeDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  override getSkillsFolderPath(): string {
    return OpenCodeDeployer.ARTEFACT_PATHS.skill;
  }

  override async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for OpenCode', {
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
      const path = `${OpenCodeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: getTargetPrefixedPath(path, target),
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clear the recipes section in AGENTS.md
    const agentsMdPath = getTargetPrefixedPath(this.config.filePath, target);
    fileUpdates.createOrUpdate.push({
      path: agentsMdPath,
      sections: [{ key: 'Packmind recipes', content: '' }],
      artifactType: 'command',
    });

    return fileUpdates;
  }

  override async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (OpenCode)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    for (const recipeVersion of recipeVersions) {
      const path = `${OpenCodeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path,
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clear the recipes section in AGENTS.md
    fileUpdates.createOrUpdate.push({
      path: this.config.filePath,
      sections: [{ key: 'Packmind recipes', content: '' }],
      artifactType: 'command',
    });

    return fileUpdates;
  }

  override async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for OpenCode', {
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

  override async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
    skillFilesMap?: Map<SkillVersionId, SkillFile[]>,
  ): Promise<FileUpdates> {
    // Single-file deployment for standards (AGENTS.md)
    const singleFileUpdates = await super.deployArtifacts(
      recipeVersions,
      standardVersions,
    );

    // Multi-file deployment for commands
    const commandFileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };
    for (const recipeVersion of recipeVersions) {
      const path = `${OpenCodeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      commandFileUpdates.createOrUpdate.push({
        path,
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Multi-file deployment for skills
    const skillFileUpdates = await super.generateFileUpdatesForSkills(
      skillVersions,
      skillFilesMap,
    );

    return {
      createOrUpdate: [
        ...singleFileUpdates.createOrUpdate,
        ...commandFileUpdates.createOrUpdate,
        ...skillFileUpdates.createOrUpdate,
      ],
      delete: [
        ...singleFileUpdates.delete,
        ...commandFileUpdates.delete,
        ...skillFileUpdates.delete,
      ],
    };
  }

  override async generateRemovalFileUpdates(
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
    // Single-file removal for standards (AGENTS.md sections)
    const singleFileUpdates = await super.generateRemovalFileUpdates(
      removed,
      installed,
    );

    // Multi-file removal for commands
    for (const recipeVersion of removed.recipeVersions) {
      singleFileUpdates.delete.push({
        path: `${OpenCodeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Multi-file removal for skills
    for (const skillVersion of removed.skillVersions) {
      singleFileUpdates.delete.push({
        path: `${OpenCodeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return singleFileUpdates;
  }

  override async generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }): Promise<FileUpdates> {
    // Single-file cleanup for standards (AGENTS.md sections)
    const fileUpdates = await super.generateAgentCleanupFileUpdates(artifacts);

    // Delete command files
    for (const recipeVersion of artifacts.recipeVersions) {
      fileUpdates.delete.push({
        path: `${OpenCodeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete default skills
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      fileUpdates.delete.push({
        path: `${OpenCodeDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills
    for (const skillVersion of artifacts.skillVersions) {
      fileUpdates.delete.push({
        path: `${OpenCodeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }
}
