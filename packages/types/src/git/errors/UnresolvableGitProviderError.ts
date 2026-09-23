import { GitError } from './GitError';

/**
 * No provider could be resolved for the repository, and the command carried
 * nothing to build one from: for a vendor we do not know by name, the remote
 * url is the only thing that identifies the instance. The caller can correct
 * it by supplying `gitRemoteUrl`.
 */
export class UnresolvableGitProviderError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'invalid_input',
      'unresolvable_git_provider',
      { owner, repo },
      'Cannot resolve a git provider: a gitRemoteUrl is required for unknown providers',
    );
    this.name = 'UnresolvableGitProviderError';
  }
}
