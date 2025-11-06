import { IUseCase, PackmindCommand } from '@packmind/types';
import { GitRepoId } from '../GitRepo';

export type CheckDirectoryExistenceCommand = PackmindCommand & {
  gitRepoId: GitRepoId;
  directoryPath: string;
  branch: string;
};

export type CheckDirectoryExistenceResult = {
  exists: boolean;
  path: string;
  branch: string;
};

export type ICheckDirectoryExistenceUseCase = IUseCase<
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult
>;
