import { PackmindUpstreamError, UpstreamErrorKind } from '../../errors';

export type MarketplacesUpstreamErrorReason =
  'marketplace_repository_unreachable';

export type MarketplacesUpstreamErrorContext = {
  gitRepoOwner?: string;
  gitRepoName?: string;
};

/**
 * Base for the marketplace failures that belong to the git host rather than
 * to us or to the caller, in the same shape as `GitUpstreamError`: a literal
 * `reason` union and a typed `context`, plus the upstream `kind`.
 *
 * It lives beside `MarketplacesError` in types because the marketplace use
 * cases that raise it are not in this repository.
 */
export class MarketplacesUpstreamError extends PackmindUpstreamError {
  declare readonly reason: MarketplacesUpstreamErrorReason;
  declare readonly context: MarketplacesUpstreamErrorContext;

  constructor(
    kind: UpstreamErrorKind,
    reason: MarketplacesUpstreamErrorReason,
    context: MarketplacesUpstreamErrorContext,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(kind, reason, context, message, retryAfterSeconds);
    this.name = 'MarketplacesUpstreamError';
  }
}
