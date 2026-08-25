/**
 * Marketplace vendor discriminator.
 *
 * Typed as a discriminated union to stay extensible — additional vendors
 * (e.g. `'cursor'`) are appended here without touching consumers.
 *
 * v1 shipped with `'anthropic'` only; `'github'` (GitHub Copilot) was added
 * alongside it.
 */
export type MarketplaceVendor = 'anthropic' | 'github';
