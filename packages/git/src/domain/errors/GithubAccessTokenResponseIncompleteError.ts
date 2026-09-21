import { GitInternalError } from './GitInternalError';

/**
 * GitHub answered the `access_tokens` exchange without a token or without an
 * expiry. The response is not ours to fix and no request payload changes it,
 * so it stays a 500.
 */
export class GithubAccessTokenResponseIncompleteError extends GitInternalError {
  constructor(gitProviderId: string, installationId: number) {
    super(
      'github_access_token_response_incomplete',
      { gitProviderId, installationId },
      'GitHub access_tokens response missing token or expires_at',
    );
    this.name = 'GithubAccessTokenResponseIncompleteError';
  }
}
