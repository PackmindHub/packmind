import { IPublicUseCase } from '@packmind/types';

export type IPullDataCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
  packagesSlugs: string[]; // Package slugs to pull content from
};

export type IPullDataResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  errors: string[];
};

export type IPullDataUseCase = IPublicUseCase<
  IPullDataCommand,
  IPullDataResult
>;
