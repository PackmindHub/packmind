/**
 * Ordered candidate paths for the marketplace descriptor.
 *
 * The official Claude Code layout places the manifest at
 * `.claude-plugin/marketplace.json` in the repository root
 * (https://code.claude.com/docs/en/plugin-marketplaces). Some ad-hoc repos
 * keep a bare `marketplace.json` at the root instead, so we accept it as a
 * fallback. `.github/plugin/marketplace.json` is the equivalent candidate for
 * a GitHub Copilot marketplace.
 *
 * A repo's marketplace config targets either GitHub Copilot or Claude Code,
 * never both, so detection stays purely path-based — first existing file
 * wins — and is not content-based. The descriptor lookup probes these paths
 * in this exact order (deliberately not alphabetical); if somehow more than
 * one candidate file exists, the earlier entry in this list wins.
 *
 * Single source of truth — used by `LinkMarketplaceUseCase`,
 * `ValidateMarketplaceUrlUseCase` (at link / validation time) and
 * `MarketplaceReconciliationDelayedJob` (re-fetch for health checks), all via
 * `fetchMarketplaceDescriptorFile`.
 */
export const MARKETPLACE_DESCRIPTOR_PATHS = [
  '.claude-plugin/marketplace.json',
  'marketplace.json',
  '.github/plugin/marketplace.json',
] as const;

/**
 * Primary (official) descriptor path. Used for display in errors and logs; the
 * full lookup probes every entry in `MARKETPLACE_DESCRIPTOR_PATHS` in order.
 */
export const MARKETPLACE_DESCRIPTOR_FILENAME = MARKETPLACE_DESCRIPTOR_PATHS[0];
