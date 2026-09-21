import { GitInternalError } from './GitInternalError';

/**
 * Exchanging the App JWT for an installation token failed. The response body
 * is deliberately absent from both the log and the message — it may carry
 * App-level secrets — so only the status, when GitHub answered at all, makes
 * it into the message.
 */
export class GithubAppTokenExchangeFailedError extends GitInternalError {
  constructor(
    gitProviderId: string,
    installationId: number,
    public readonly cause: unknown,
    status?: number,
  ) {
    super(
      'github_app_token_exchange_failed',
      { gitProviderId, installationId, status },
      status === undefined
        ? 'Failed to exchange App JWT for installation token'
        : `Failed to exchange App JWT for installation token (status ${status})`,
    );
    this.name = 'GithubAppTokenExchangeFailedError';
  }
}
