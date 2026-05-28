import { MarketplaceVendor } from './MarketplaceVendor';
import { PluginRef } from './PluginRef';

/**
 * Normalized representation of a marketplace descriptor file (e.g.
 * `marketplace.json`) once parsed by a vendor-specific parser.
 *
 * `raw` preserves the original JSON object so the reconciliation job can
 * deep-compare against future fetches without re-parsing.
 */
export type MarketplaceDescriptor = {
  vendor: MarketplaceVendor;
  name: string;
  version?: string;
  plugins: PluginRef[];
  raw: unknown;
};
