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

export class GitlabDuoDeployer extends SingleFileDeployer {
  private static readonly ARTEFACT_PATHS =
    CODING_AGENT_ARTEFACT_PATHS.gitlab_duo;

  protected readonly config: DeployerConfig = {
    filePath: '.gitlab/duo/chat-rules.md',
    agentName: 'Gitlab Duo',
    pathToPackmindFolder: '../../',
    codingAgent: 'gitlab_duo',
  };

  async deployDefaultSkills(options?: {
    cliVersion?: string;
    includeBeta?: boolean;
  }) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'GitLab Duo',
      GitlabDuoDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  override getSkillsFolderPath(): string {
    return GitlabDuoDeployer.ARTEFACT_PATHS.skill;
  }

  override async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for GitLab Duo', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates = await this.generateFileUpdatesForSkills(skillVersions);

    // Apply target prefix to all paths
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
    // Single-file deployment for standards/commands
    const singleFileUpdates = await super.deployArtifacts(
      recipeVersions,
      standardVersions,
    );

    // Multi-file deployment for skills
    const skillFileUpdates = await super.generateFileUpdatesForSkills(
      skillVersions,
      skillFilesMap,
    );

    return {
      createOrUpdate: [
        ...singleFileUpdates.createOrUpdate,
        ...skillFileUpdates.createOrUpdate,
      ],
      delete: [...singleFileUpdates.delete, ...skillFileUpdates.delete],
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
    // Single-file removal for standards/commands
    const singleFileUpdates = await super.generateRemovalFileUpdates(
      removed,
      installed,
    );

    // Multi-file removal for skills
    for (const skillVersion of removed.skillVersions) {
      singleFileUpdates.delete.push({
        path: `${GitlabDuoDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
    // Single-file cleanup for standards/commands
    const fileUpdates = await super.generateAgentCleanupFileUpdates(artifacts);

    // Delete default skills
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      fileUpdates.delete.push({
        path: `${GitlabDuoDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills
    for (const skillVersion of artifacts.skillVersions) {
      fileUpdates.delete.push({
        path: `${GitlabDuoDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }
}
