import { IPublicUseCase } from '@packmind/types';

export type IInstallCommand = {
  baseDirectory?: string;
  packages?: string[];
};

export type IInstallResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  errors: string[];
  recipesCount: number;
  standardsCount: number;
  skillsCount: number;
  skillDirectoriesDeleted: number;
  missingAccess: string[];
};

export type IInstallUseCase = IPublicUseCase<IInstallCommand, IInstallResult>;
