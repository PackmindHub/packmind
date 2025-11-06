import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitRepoId } from '../GitRepoId';

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
