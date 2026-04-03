import { IPublicUseCase } from '@packmind/types';

export type IInstallDefaultSkillsCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
  cliVersion?: string; // CLI version for filtering skills by minimumVersion
  includeBeta?: boolean; // If true, include unreleased/beta skills
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

export type IInstallDefaultSkillsUseCase = IPublicUseCase<
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult
>;
