import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type SetTrackedRepositoryCommand = PackmindCommand & {
  owner: string;
  repo: string;
  branch: string;
  origin: 'init' | 'track';
  providerVendor?: string;
  gitRemoteUrl?: string;
};

export type SetTrackedRepositoryResponse = GitRepo;

export type ISetTrackedRepositoryUseCase = IUseCase<
  SetTrackedRepositoryCommand,
  SetTrackedRepositoryResponse
>;
