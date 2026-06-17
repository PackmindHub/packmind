/**
 * Marketplace entity re-exports for the deployments domain.
 *
 * The canonical `Marketplace` type lives in `@packmind/types` so it can be
 * shared with the API, frontend, and ports. This file re-exports the type,
 * the branded `MarketplaceId`, and the `createMarketplaceId` factory so
 * domain code in `@packmind/deployments` can import them from the standard
 * `domain/entities` location alongside other deployments entities.
 */
export {
  Marketplace,
  MarketplaceId,
  createMarketplaceId,
  MarketplaceVendor,
  MarketplaceState,
  MarketplaceDescriptor,
  PluginRef,
  MARKETPLACE_DESCRIPTOR_FILENAME,
} from '@packmind/types';
