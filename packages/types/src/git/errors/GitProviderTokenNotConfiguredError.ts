import { GitError } from './GitError';

/**
 * The provider exists but carries no usable credential, so the operation
 * cannot reach the remote. Distinct from `GitProviderMissingTokenError`,
 * whose message is specific to adding a repository: this one is thrown by any
 * read that needs a token on a token-authenticated provider.
 */
export class GitProviderTokenNotConfiguredError extends GitError {
  constructor(public readonly gitProviderId: string) {
    super(
      'invalid_input',
      'git_provider_token_not_configured',
      { gitProviderId },
      'Git provider token not configured',
    );
    this.name = 'GitProviderTokenNotConfiguredError';
  }
}
