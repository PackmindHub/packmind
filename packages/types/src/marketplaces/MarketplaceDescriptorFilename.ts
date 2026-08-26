import { MarketplaceVendor } from './MarketplaceVendor';

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
 * This module exports two things, kept in sync by hand:
 *  - `MARKETPLACE_DESCRIPTOR_PATHS` (below): a flat, vendor-blind list of the
 *    same paths, kept for anything that only needs "the paths" — display in
 *    error messages/logs, or existing code that predates vendor-aware
 *    fetching. It is effectively DERIVED from `MARKETPLACE_DESCRIPTOR_CANDIDATES`
 *    and must be kept in the same order and cardinality.
 *  - `MARKETPLACE_DESCRIPTOR_CANDIDATES` (below): the canonical source of
 *    truth for vendor-aware fetching, pairing each path with the vendor it
 *    unambiguously implies. `fetchMarketplaceDescriptorFile` iterates this
 *    list so a caller learns which vendor produced the content it fetched,
 *    without having to re-derive it from the content itself (see
 *    `MarketplaceDescriptorParserRegistry.parseForVendor`).
 *
 * A genuinely new candidate path must be added to
 * `MARKETPLACE_DESCRIPTOR_CANDIDATES` first, with `MARKETPLACE_DESCRIPTOR_PATHS`
 * updated to match — do not add a path to only one of the two.
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

/**
 * Ordered candidate paths for the marketplace descriptor, each paired with
 * the vendor it unambiguously implies. Same paths, same order as
 * `MARKETPLACE_DESCRIPTOR_PATHS` above — see that constant's doc comment for
 * why both exist and the invariant that keeps them in sync.
 *
 * `fetchMarketplaceDescriptorFile` probes these in order and returns the
 * `vendor` of the first candidate that exists, so a caller can dispatch
 * parsing via `MarketplaceDescriptorParserRegistry.parseForVendor` instead of
 * sniffing the content for a `vendor` field that pre-existing or
 * hand-crafted descriptors may never declare.
 */
export const MARKETPLACE_DESCRIPTOR_CANDIDATES: ReadonlyArray<{
  vendor: MarketplaceVendor;
  path: string;
}> = [
  { vendor: 'anthropic', path: '.claude-plugin/marketplace.json' },
  { vendor: 'anthropic', path: 'marketplace.json' },
  { vendor: 'github', path: '.github/plugin/marketplace.json' },
] as const;
