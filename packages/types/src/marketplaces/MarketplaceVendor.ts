/**
 * Marketplace vendor discriminator.
 *
 * Typed as a discriminated union to stay extensible — additional vendors
 * (e.g. `'cursor'`) are appended here without touching consumers.
 *
 * v1 ships with `'anthropic'` (Claude Code) and `'copilot'` (GitHub Copilot).
 * A vendor is what a descriptor declares itself to be; the face that owns the
 * descriptor path is a separate axis — see `MarketplaceFaceId`.
 */
export type MarketplaceVendor = 'anthropic' | 'copilot';
