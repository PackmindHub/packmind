import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type FindOrCreateGitRepoCommand = PackmindCommand & {
  owner: string;
  repo: string;
  branch: string;
  providerVendor?: string;
  gitRemoteUrl?: string;
};

export type FindOrCreateGitRepoResponse = GitRepo;

export type IFindOrCreateGitRepoUseCase = IUseCase<
  FindOrCreateGitRepoCommand,
  FindOrCreateGitRepoResponse
>;
