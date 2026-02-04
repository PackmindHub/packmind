import { CodingAgent, IPublicUseCase } from '@packmind/types';

export type IInstallDefaultSkillsCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
  cliVersion?: string; // CLI version for filtering skills by minimumVersion
  includeBeta?: boolean; // If true, include unreleased/beta skills
  agents?: CodingAgent[]; // Optional agents to generate artifacts for (overrides org-level config when present)
};

export type IInstallDefaultSkillsResult = {
  filesCreated: number;
  filesUpdated: number;
  errors: string[];
};

export type IInstallDefaultSkillsUseCase = IPublicUseCase<
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult
>;
