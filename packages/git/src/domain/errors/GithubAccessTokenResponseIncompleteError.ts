import { GitUpstreamError } from './GitUpstreamError';

/**
 * GitHub answered the `access_tokens` exchange without a token or without an
 * expiry. The response is not ours to fix and no request payload changes it:
 * a malformed body from upstream is what 502 literally means.
 */
export class GithubAccessTokenResponseIncompleteError extends GitUpstreamError {
  constructor(gitProviderId: string, installationId: number) {
    super(
      'upstream_unavailable',
      'github_access_token_response_incomplete',
      { gitProviderId, installationId },
      'GitHub access_tokens response missing token or expires_at',
    );
    this.name = 'GithubAccessTokenResponseIncompleteError';
  }
}
