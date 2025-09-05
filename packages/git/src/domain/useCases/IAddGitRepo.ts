import { PackmindCommand, IUseCase } from '@packmind/shared';
import { GitRepo } from '../entities/GitRepo';
import { GitProviderId } from '../entities/GitProvider';

export type AddGitRepoCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
};

export type IAddGitRepoUseCase = IUseCase<AddGitRepoCommand, GitRepo>;
