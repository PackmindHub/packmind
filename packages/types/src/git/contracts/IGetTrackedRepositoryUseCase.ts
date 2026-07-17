import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type GetTrackedRepositoryCommand = PackmindCommand & {
  owner: string;
  repo: string;
};

export type GetTrackedRepositoryResponse = GitRepo | null;

export type IGetTrackedRepositoryUseCase = IUseCase<
  GetTrackedRepositoryCommand,
  GetTrackedRepositoryResponse
>;
