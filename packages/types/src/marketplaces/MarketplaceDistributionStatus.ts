/**
 * Lifecycle states of a marketplace plugin distribution.
 *
 * Shares the `in_progress | success | failure | no_changes` semantics of the
 * code-repository `DistributionStatus`, extended with the marketplace-only
 * states driven by the rolling sync PR and the removal flow:
 * - `pending_merge`: the publish landed on the rolling sync branch but has
 *   not been confirmed on the marketplace's default branch yet.
 * - `to_be_removed`: a removal request landed on the rolling sync branch and
 *   awaits confirmation by the reconciliation sweep.
 * - `removed`: the reconciliation sweep confirmed the plugin is gone from the
 *   marketplace descriptor.
 *
 * String values are persisted as-is in `marketplace_distributions.status`.
 */
export enum MarketplaceDistributionStatus {
  in_progress = 'in_progress',
  pending_merge = 'pending_merge',
  success = 'success',
  failure = 'failure',
  no_changes = 'no_changes',
  to_be_removed = 'to_be_removed',
  removed = 'removed',
}
