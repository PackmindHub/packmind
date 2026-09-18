import { MarketplaceVendor } from './MarketplaceVendor';

/**
 * Ordered candidate paths for the marketplace descriptor. `.claude-plugin/`
 * is the official Claude Code layout; a bare `marketplace.json` at the root is
 * accepted because ad-hoc repos use it, and `.github/plugin/` is the GitHub
 * Copilot equivalent.
 *
 * A repo's marketplace config targets either Copilot or Claude Code, never
 * both, so detection is purely path-based: the descriptor lookup probes these
 * in this exact order (deliberately not alphabetical) and the first existing
 * file wins, earlier entries beating later ones.
 *
 * Kept in the same order and cardinality as
 * `MARKETPLACE_DESCRIPTOR_CANDIDATES`, by hand — a new path must be added to
 * both, never to only one.
 */
export const MARKETPLACE_DESCRIPTOR_PATHS = [
  '.claude-plugin/marketplace.json',
  'marketplace.json',
  '.github/plugin/marketplace.json',
] as const;

/**
 * Primary (official) descriptor path, for display in errors and logs. The real
 * lookup probes every entry of `MARKETPLACE_DESCRIPTOR_PATHS` in order, so this
 * naming one path is a simplification the messages accept.
 */
export const MARKETPLACE_DESCRIPTOR_FILENAME = MARKETPLACE_DESCRIPTOR_PATHS[0];

/**
 * The same paths in the same order as `MARKETPLACE_DESCRIPTOR_PATHS`, each
 * paired with the vendor its location unambiguously implies.
 *
 * Pairing them here is what lets a caller dispatch parsing through
 * `MarketplaceDescriptorParserRegistry.parseForVendor` on the strength of the
 * path alone, rather than sniffing the content for a `vendor` field that
 * pre-existing or hand-crafted descriptors may never declare.
 */
export const MARKETPLACE_DESCRIPTOR_CANDIDATES: ReadonlyArray<{
  vendor: MarketplaceVendor;
  path: string;
}> = [
  { vendor: 'anthropic', path: '.claude-plugin/marketplace.json' },
  { vendor: 'anthropic', path: 'marketplace.json' },
  { vendor: 'github', path: '.github/plugin/marketplace.json' },
] as const;
