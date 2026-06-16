import { MarketplaceVendor } from './MarketplaceVendor';
import { PluginRef } from './PluginRef';

/**
 * Normalized representation of a marketplace descriptor file (e.g.
 * `marketplace.json`) once parsed by a vendor-specific parser.
 *
 * `raw` preserves the original JSON object so the reconciliation job can
 * deep-compare against future fetches without re-parsing.
 *
 * The descriptor intentionally carries ONLY vendor-standard fields. Any
 * Packmind-specific managed-plugin state lives in the standalone
 * `packmind-lock.json` file at the marketplace repo root (see
 * `PackmindMarketplaceLock`).
 */
export type MarketplaceDescriptor = {
  vendor: MarketplaceVendor;
  name: string;
  version?: string;
  plugins: PluginRef[];
  /**
   * Plugin slugs Packmind expects to find in the descriptor but that were
   * absent on the latest reconciliation sweep AND not covered by a
   * `to_be_removed` distribution. Populated by
   * `MarketplaceReconciliationDelayedJob` to drive the "Drift detected"
   * indicator on the marketplace details view.
   */
  driftedPluginSlugs?: string[];
  raw: unknown;
};
