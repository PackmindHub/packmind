/**
 * Filename of the marketplace descriptor that Packmind expects at the root of
 * every linked marketplace repository.
 *
 * Single source of truth — used by both `LinkMarketplaceUseCase` (when
 * fetching the descriptor at link time) and `MarketplaceReconciliationDelayedJob`
 * (when re-fetching for health checks).
 */
export const MARKETPLACE_DESCRIPTOR_FILENAME = 'marketplace.json';
