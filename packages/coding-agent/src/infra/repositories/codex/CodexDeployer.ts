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
import { DeployDefaultSkillsOptions } from '../../../domain/repository/ICodingAgentDeployer';

export class CodexDeployer extends SingleFileDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.codex;

  protected readonly config: DeployerConfig = {
    filePath: 'AGENTS.md',
    agentName: 'Codex',
    codingAgent: 'codex',
  };

  async deployDefaultSkills(options?: DeployDefaultSkillsOptions) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Codex',
      CodexDeployer.ARTEFACT_PATHS.skill,
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  override getSkillsFolderPath(): string {
    return CodexDeployer.ARTEFACT_PATHS.skill;
  }

  override async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for Codex', {
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
    // Single-file removal for standards (AGENTS.md sections)
    const singleFileUpdates = await super.generateRemovalFileUpdates(
      removed,
      installed,
    );

    // Multi-file removal for skills
    for (const skillVersion of removed.skillVersions) {
      singleFileUpdates.delete.push({
        path: `${CodexDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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

    // Delete default skills
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      fileUpdates.delete.push({
        path: `${CodexDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills
    for (const skillVersion of artifacts.skillVersions) {
      fileUpdates.delete.push({
        path: `${CodexDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }
}
