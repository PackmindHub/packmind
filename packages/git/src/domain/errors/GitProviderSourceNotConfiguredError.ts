import { GitInternalError } from './GitInternalError';

/**
 * A persisted provider with no `source`. Every write path requires one, so a
 * row without it is our own broken invariant: the caller neither caused it
 * nor can correct it, and no request payload would make the read succeed.
 */
export class GitProviderSourceNotConfiguredError extends GitInternalError {
  constructor(public readonly gitProviderId: string) {
    super(
      'git_provider_source_not_configured',
      { gitProviderId },
      'Git provider source not configured',
    );
    this.name = 'GitProviderSourceNotConfiguredError';
  }
}
