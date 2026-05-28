/**
 * Health state of a linked marketplace, computed by the periodic
 * reconciliation job.
 *
 * - `healthy`: descriptor matches the snapshot stored at link time.
 * - `drift`: descriptor was successfully fetched but differs from the
 *   snapshot — admins should review.
 * - `unreachable`: the descriptor could not be fetched (network error,
 *   provider down, repo removed, etc.).
 */
export type MarketplaceState = 'healthy' | 'drift' | 'unreachable';
