import { PackmindCommand, IUseCase } from '@packmind/types';
import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';

export type AddGitRepoCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  allowTokenlessProvider?: boolean;
};

export type IAddGitRepoUseCase = IUseCase<AddGitRepoCommand, GitRepo>;
