import { GitRepo } from '../git/GitRepo';
import { CommandVersion } from '../commands/CommandVersion';
import { StandardVersion } from '../standards/StandardVersion';
import { SkillVersion } from '../skills/SkillVersion';
import { Target } from '../deployments/Target';
import { FileUpdates } from '../deployments/FileUpdates';

export type DeployDefaultSkillsOptions = {
  cliVersion?: string;
  includeBeta?: boolean;
  excludeDeprecated?: boolean;
};

/**
 * Per-skill metadata emitted by `DefaultSkillsDeployer.deployDefaultSkills`
 * for each concrete deployer that actually ran.
 *
 * Consumed by `DefaultSkillsMetadataEnricher` to stamp artifact metadata
 * onto the deployer's `FileModification[]` so downstream lockfile entries
 * carry `artifactType`, `artifactSlug`, `artifactName`, `artifactVersion`
 * and `source: 'default'` markers.
 */
export type DefaultSkillMetadata = {
  slug: string;
  name: string;
  version: number;
};

export type DefaultSkillsDeployResult = {
  fileUpdates: FileUpdates;
  skippedSkillsCount: number;
  /**
   * Metadata for the default skills that were actually deployed in this run.
   * Filtered by the same `filterDeployers` pass used to compute `fileUpdates`,
   * so the deployed slugs here are 1:1 with the files emitted in
   * `fileUpdates.createOrUpdate`.
   */
  deployedSkills: DefaultSkillMetadata[];
};

/**
 * The coding-agent deployer port. Its canonical definition lives here in
 * `@packmind/types` so other domains collaborate with it through the shared
 * contract package (never by importing `@packmind/coding-agent` source). The
 * coding-agent package owns the implementations and re-exports the port for
 * its internal consumers.
 */
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
