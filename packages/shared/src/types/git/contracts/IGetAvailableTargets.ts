import { IUseCase, PackmindCommand } from '@packmind/types';
import { GitRepo } from '../GitRepo';

export type GetAvailableRemoteDirectoriesCommand = PackmindCommand & {
  gitRepo: GitRepo;
  path?: string;
};

export type IGetAvailableRemoteDirectoriesUseCase = IUseCase<
  GetAvailableRemoteDirectoriesCommand,
  string[]
>;
