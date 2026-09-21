import { GitInternalError } from './GitInternalError';

/**
 * The `expires_at` GitHub returned for an installation token could not be
 * parsed, so there is no honest lifetime to cache the token against.
 */
export class GithubAccessTokenExpiryUnparseableError extends GitInternalError {
  constructor(
    gitProviderId: string,
    installationId: number,
    expiresAt: string,
  ) {
    super(
      'github_access_token_expiry_unparseable',
      { gitProviderId, installationId, expiresAt },
      `GitHub access_tokens returned an unparseable expires_at: ${expiresAt}`,
    );
    this.name = 'GithubAccessTokenExpiryUnparseableError';
  }
}
