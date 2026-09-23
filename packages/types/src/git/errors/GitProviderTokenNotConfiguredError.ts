import { GitError } from './GitError';

/**
 * The provider exists but carries no usable credential, so the operation
 * cannot reach the remote. Distinct from `GitProviderMissingTokenError`,
 * whose message is specific to adding a repository: this one is thrown by any
 * read that needs a token on a token-authenticated provider.
 *
 * `gitProviderId` is optional because a candidate credential set being probed
 * before it is saved has no id yet; the key is then absent from the context
 * rather than present and empty, which would read as a real id in the log.
 */
export class GitProviderTokenNotConfiguredError extends GitError {
  constructor(public readonly gitProviderId?: string) {
    super(
      'invalid_input',
      'git_provider_token_not_configured',
      gitProviderId ? { gitProviderId } : {},
      'Git provider token not configured',
    );
    this.name = 'GitProviderTokenNotConfiguredError';
  }
}
