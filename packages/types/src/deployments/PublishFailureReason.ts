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
 * - `standards_only`: the package lost its last skill/recipe between enqueue
 *   and job execution, so rendering it now would produce an empty
 *   (manifest-only) plugin. The publish is failed instead of committed.
 * - `vendor_mismatch`: the descriptor in the repository now declares a
 *   different vendor than the one the marketplace was linked with. Packmind
 *   refuses to auto-migrate an existing marketplace config, so the publish
 *   fails instead of overwriting it.
 * - `other`: catch-all for unexpected failures (network, Git, etc.).
 */
export type PublishFailureReason =
  | 'descriptor_missing'
  | 'name_conflict_unmanaged'
  | 'invalid_token'
  | 'standards_only'
  | 'vendor_mismatch'
  | 'other';
