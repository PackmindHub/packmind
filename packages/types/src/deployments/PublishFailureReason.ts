/**
 * Categorical reason a marketplace publish attempt failed.
 *
 * Surfaced on `MarketplaceDistribution.failureReason` and on
 * `PluginPublishFailedEvent` so the UI, analytics, and listeners can branch
 * on a stable, low-cardinality value without parsing error messages.
 *
 * - `descriptor_missing`: `marketplace.json` could not be located or parsed.
 * - `name_conflict_unmanaged`: an unmanaged plugin on the marketplace already
 *   exposes the same name as the package being published.
 * - `invalid_token`: the Git provider token was missing/expired/invalid.
 * - `other`: catch-all for unexpected failures (network, Git, etc.).
 */
export type PublishFailureReason =
  | 'descriptor_missing'
  | 'name_conflict_unmanaged'
  | 'invalid_token'
  | 'other';
