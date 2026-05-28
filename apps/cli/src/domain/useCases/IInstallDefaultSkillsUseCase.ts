import { CodingAgent, IPublicUseCase } from '@packmind/types';

export type IInstallDefaultSkillsCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
  cliVersion?: string; // CLI version for filtering skills by minimumVersion
  includeBeta?: boolean; // If true, include unreleased/beta skills
  // When provided, overrides the agents read from packmind.json. Used by the
  // `install` flow to re-use the server-resolved agents (which already include
  // the organisation-level fallback) so both packages and default skills
  // render against the same list.
  agents?: CodingAgent[];
};

export type IncompatibleInstalledSkill = {
  skillName: string;
  filePaths: string[]; // relative paths for all agent replicas of this skill
};

export type IInstallDefaultSkillsResult = {
  filesCreated: number;
  filesUpdated: number;
  errors: string[];
  skippedSkillsCount: number;
  /** Skills that exceed their maximum CLI version and are NOT yet installed — skipped from creation */
  skippedIncompatibleSkillNames: string[];
  /** Skills that exceed their maximum CLI version and ARE already installed — candidates for deletion */
  incompatibleInstalledSkills: IncompatibleInstalledSkill[];
};

export interface IInstallDefaultSkillsUseCase extends IPublicUseCase<
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult
> {
  /**
   * Bootstraps a truly empty directory by writing packmind.json from the org's
   * active render modes. No-op if either packmind.json or packmind-lock.json
   * already exists. Throws SkillsInitBootstrapError if the gateway fails or
   * the mapped agent list is empty.
   */
  bootstrapEmptyDirectory(baseDirectory: string): Promise<void>;
}
