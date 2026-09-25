import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when no registered `IMarketplaceDescriptorParser` claims the
 * marketplace descriptor content (i.e. the vendor format is not supported).
 */
export class UnknownMarketplaceDescriptorError extends MarketplacesError {
  constructor() {
    super(
      'invalid_input',
      'unknown_marketplace_descriptor',
      {},
      'No registered marketplace descriptor parser recognised the provided content',
    );
    this.name = 'UnknownMarketplaceDescriptorError';
  }
}
