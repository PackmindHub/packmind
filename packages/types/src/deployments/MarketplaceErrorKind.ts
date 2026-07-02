/**
 * Sub-classification of a marketplace fetch failure, set by the reconcile
 * job so the UI can show a specific message without inspecting raw errors.
 *
 * Orthogonal to `MarketplaceState`: it is only meaningful when the state is
 * `unreachable`, and is `null` on every successful (healthy/drift) check.
 *
 * - `auth_failed`: the configured credentials are invalid/expired (401/403).
 * - `repo_not_found`: the upstream repository is gone / renamed (404 on repo).
 * - `network_transient`: a recoverable network/timeout blip.
 */
export type MarketplaceErrorKind =
  | 'auth_failed'
  | 'repo_not_found'
  | 'network_transient';
