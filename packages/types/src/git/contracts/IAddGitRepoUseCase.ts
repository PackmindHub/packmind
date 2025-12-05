import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';
import { GitProviderId } from '../GitProvider';

export type AddGitRepoCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  /**
   * When true, skips the validation that ensures the git provider has a token.
   * This is used by internal use cases like NotifyDistributionUseCase that need
   * to create repos for tokenless providers (e.g., auto-created from packmind-cli).
   * Default: false
   */
  allowTokenlessProvider?: boolean;
};

export type IAddGitRepoUseCase = IUseCase<AddGitRepoCommand, GitRepo>;
