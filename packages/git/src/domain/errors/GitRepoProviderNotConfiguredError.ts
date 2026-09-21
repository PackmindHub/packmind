import { GitInternalError } from './GitInternalError';

/**
 * A persisted repository with no `providerId`. Every read of it goes through
 * a provider, so a row without one is our own broken invariant: no request
 * payload would make the lookup succeed.
 */
export class GitRepoProviderNotConfiguredError extends GitInternalError {
  constructor(public readonly gitRepoId: string) {
    super(
      'git_repo_provider_not_configured',
      { gitRepoId },
      'Git repository must have a provider ID',
    );
    this.name = 'GitRepoProviderNotConfiguredError';
  }
}
