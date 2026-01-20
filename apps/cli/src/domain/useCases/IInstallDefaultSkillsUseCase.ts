import { IPublicUseCase } from '@packmind/types';

export type IInstallDefaultSkillsCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
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
