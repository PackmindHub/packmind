/**
 * Ordered candidate paths for the Claude Code marketplace descriptor.
 *
 * The official layout places the manifest at `.claude-plugin/marketplace.json`
 * in the repository root
 * (https://code.claude.com/docs/en/plugin-marketplaces). Some ad-hoc repos
 * keep a bare `marketplace.json` at the root instead, so we accept it as a
 * fallback. The descriptor lookup probes these paths in order and the first
 * existing file wins.
 *
 * Single source of truth — used by `LinkMarketplaceUseCase`,
 * `ValidateMarketplaceUrlUseCase` (at link / validation time) and
 * `MarketplaceReconciliationDelayedJob` (re-fetch for health checks), all via
 * `fetchMarketplaceDescriptorFile`.
 */
export const MARKETPLACE_DESCRIPTOR_PATHS = [
  '.claude-plugin/marketplace.json',
  'marketplace.json',
] as const;

/**
 * Primary (official) descriptor path. Used for display in errors and logs; the
 * full lookup probes every entry in `MARKETPLACE_DESCRIPTOR_PATHS` in order.
 */
export const MARKETPLACE_DESCRIPTOR_FILENAME = MARKETPLACE_DESCRIPTOR_PATHS[0];
