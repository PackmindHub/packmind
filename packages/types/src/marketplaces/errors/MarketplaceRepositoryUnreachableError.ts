import { MarketplacesUpstreamError } from './MarketplacesUpstreamError';

/**
 * Error thrown when fetching a marketplace repository or its descriptor fails
 * at the transport level — the third party's fault, not ours and not the
 * caller's (see `MarketplaceUrlNotReachableError` for caller-correctable cases).
 *
 * Neither a bad descriptor nor a 500: answers 502, the standard bucket for
 * "the thing behind us didn't answer".
 */
export class MarketplaceRepositoryUnreachableError extends MarketplacesUpstreamError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'upstream_unavailable',
      'marketplace_repository_unreachable',
      { gitRepoOwner: owner, gitRepoName: repo },
      `Could not reach the Git repository "${owner}/${repo}". The Git host did not answer or was unreachable. Try again in a moment.`,
    );
    this.name = 'MarketplaceRepositoryUnreachableError';
  }
}
