/**
 * Health state of a linked marketplace, computed by the periodic
 * reconciliation job (and by the publish use case when descriptor problems
 * are detected at publish time).
 *
 * - `healthy`: descriptor matches the snapshot stored at link time.
 * - `drift`: descriptor was successfully fetched but differs from the
 *   snapshot — admins should review.
 * - `unreachable`: the descriptor could not be fetched (network error,
 *   provider down, repo removed, etc.).
 * - `bad_format`: the descriptor was reachable but missing or unparseable
 *   (broken contract — admins must fix `marketplace.json`).
 */
export type MarketplaceState =
  | 'healthy'
  | 'drift'
  | 'unreachable'
  | 'bad_format';
