import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';
import { GitProviderId } from '../GitProvider';

export type AddGitRepoCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
};

export type IAddGitRepoUseCase = IUseCase<AddGitRepoCommand, GitRepo>;
