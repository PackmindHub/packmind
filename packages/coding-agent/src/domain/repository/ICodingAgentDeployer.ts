import {
  GitRepo,
  CommandVersion,
  StandardVersion,
  SkillVersion,
  Target,
  FileUpdates,
} from '@packmind/types';
import { DefaultSkillsDeployResult } from '../../infra/repositories/defaultSkillsDeployer/DefaultSkillsDeployer';

export type DeployDefaultSkillsOptions = {
  cliVersion?: string;
  includeBeta?: boolean;
  excludeDeprecated?: boolean;
};

export interface ICodingAgentDeployer {
  deployCommands(
    recipeVersions: CommandVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
  ): Promise<FileUpdates>;
  generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates>;
  generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates>;
  generateRemovalFileUpdates(
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
  ): Promise<FileUpdates>;
  generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }): Promise<FileUpdates>;
  deployArtifacts(
    recipeVersions: CommandVersion[],
    standardVersions: StandardVersion[],
    skillVersions?: SkillVersion[],
  ): Promise<FileUpdates>;
  deployDefaultSkills?(
    options?: DeployDefaultSkillsOptions,
  ): Promise<DefaultSkillsDeployResult> | DefaultSkillsDeployResult;
  /**
   * Returns the base path for skills folder for this deployer.
   * Returns undefined if skills are not supported by this agent.
   * Used for "burn and rebuild" strategy to delete stale skill files.
   */
  getSkillsFolderPath(): string | undefined;
}
