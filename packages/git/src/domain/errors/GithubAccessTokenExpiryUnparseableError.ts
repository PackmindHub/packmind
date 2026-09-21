import { GitUpstreamError } from './GitUpstreamError';

/**
 * The `expires_at` GitHub returned for an installation token could not be
 * parsed, so there is no honest lifetime to cache the token against. GitHub
 * handed us a body we cannot read, which is a 502 rather than our invariant
 * breaking.
 */
export class GithubAccessTokenExpiryUnparseableError extends GitUpstreamError {
  constructor(
    gitProviderId: string,
    installationId: number,
    expiresAt: string,
  ) {
    super(
      'upstream_unavailable',
      'github_access_token_expiry_unparseable',
      { gitProviderId, installationId, expiresAt },
      `GitHub access_tokens returned an unparseable expires_at: ${expiresAt}`,
    );
    this.name = 'GithubAccessTokenExpiryUnparseableError';
  }
}
