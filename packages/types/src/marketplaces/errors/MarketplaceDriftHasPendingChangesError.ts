/**
 * Error thrown when `AcceptMarketplaceDriftUseCase` refuses to accept the
 * descriptor because in-flight `pending_merge` or `to_be_removed`
 * distributions are still riding on the rolling `packmind/sync` PR.
 *
 * Accepting drift retires that branch so the next publish gets a clean
 * merge-base — but doing so while pending operations are staged on it would
 * silently strand their content. The caller must merge or cancel the
 * pending sync PR first.
 */
export class MarketplaceDriftHasPendingChangesError extends Error {
  constructor(
    public readonly pendingMergeCount: number,
    public readonly pendingRemovalCount: number,
  ) {
    super(
      `Cannot accept marketplace drift: ${pendingMergeCount} pending publish(es) and ${pendingRemovalCount} pending removal(s) are still staged on the sync branch`,
    );
    this.name = 'MarketplaceDriftHasPendingChangesError';
  }
}
