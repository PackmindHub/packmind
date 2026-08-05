import { MarketplaceFaceHealth } from './MarketplaceFaceHealth';
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
   * Plugin slugs Packmind expects to serve but that were absent from EVERY
   * readable face on the latest reconciliation sweep AND not covered by a
   * `to_be_removed` distribution — i.e. the plugin left the marketplace
   * altogether. Populated by `MarketplaceReconciliationDelayedJob` to drive the
   * "Drift detected" indicator on the marketplace details view, and consumed by
   * `AcceptMarketplaceDriftUseCase` to mark those distributions `removed`.
   *
   * Slugs missing from only SOME faces are deliberately excluded and reported
   * in `partiallyServedPluginSlugs` instead: accepting the drift of a plugin
   * that is still listed in another face's catalogue would mark it removed while
   * it is demonstrably still served.
   */
  driftedPluginSlugs?: string[];
  /**
   * Plugin slugs present in at least one readable face's descriptor and absent
   * from at least one other. The marketplace is in `drift`, but the remedy is a
   * resync (republish the missing face's descriptor), NOT accepting a removal —
   * these slugs are never eligible for `AcceptMarketplaceDriftUseCase`.
   */
  partiallyServedPluginSlugs?: string[];
  /**
   * Per-face outcome of the latest reconciliation sweep, for the faces the
   * marketplace is expected to serve (`Marketplace.faces`). Absent on rows that
   * have not been reconciled since multi-face reconciliation shipped.
   */
  faceHealth?: MarketplaceFaceHealth[];
  raw: unknown;
};
