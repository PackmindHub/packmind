/**
 * Marketplace vendor discriminator.
 *
 * Typed as a discriminated union to stay extensible — additional vendors
 * (e.g. `'cursor'`) are appended here without touching consumers.
 *
 * v1 ships with `'anthropic'` only.
 */
export type MarketplaceVendor = 'anthropic';
