import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';
import { GitProviderId } from '../GitProvider';

export type AddGitRepoCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  /**
   * Skips the check that the git provider has a token. Needed by the internal
   * notify-distribution flow, which records distributions against the tokenless
   * providers the CLI auto-creates. Not for request-driven paths.
   * Default: false
   */
  allowTokenlessProvider?: boolean;
};

export type AddGitRepoResponse = GitRepo;

export type IAddGitRepoUseCase = IUseCase<
  AddGitRepoCommand,
  AddGitRepoResponse
>;
