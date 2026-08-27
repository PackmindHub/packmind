import { MarketplaceVendor } from '../MarketplaceVendor';

/**
 * Error thrown when a marketplace's descriptor now declares a different
 * vendor than the one it was originally linked with.
 *
 * Packmind does not silently reconcile a vendor change — the deploy fails so
 * an operator consciously reverts the descriptor or unlinks/relinks the
 * marketplace to change its type.
 */
export class MarketplaceVendorMismatchError extends Error {
  constructor(
    public readonly marketplaceName: string,
    public readonly previousVendor: MarketplaceVendor,
    public readonly currentVendor: MarketplaceVendor,
  ) {
    super(
      `Marketplace "${marketplaceName}" is linked in the "${previousVendor}" format but its descriptor now declares "${currentVendor}". Packmind will not overwrite or auto-migrate an existing marketplace config — revert the descriptor or unlink and relink the marketplace to change its type.`,
    );
    this.name = 'MarketplaceVendorMismatchError';
  }
}
