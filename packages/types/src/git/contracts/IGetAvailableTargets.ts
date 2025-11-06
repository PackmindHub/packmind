import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type GetAvailableRemoteDirectoriesCommand = PackmindCommand & {
  gitRepo: GitRepo;
  path?: string;
};

export type IGetAvailableRemoteDirectoriesUseCase = IUseCase<
  GetAvailableRemoteDirectoriesCommand,
  string[]
>;
