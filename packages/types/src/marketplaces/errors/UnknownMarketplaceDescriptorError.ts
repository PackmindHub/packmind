/**
 * Error thrown when no registered `IMarketplaceDescriptorParser` claims the
 * marketplace descriptor content (i.e. the vendor format is not supported).
 */
export class UnknownMarketplaceDescriptorError extends Error {
  constructor() {
    super(
      'No registered marketplace descriptor parser recognised the provided content',
    );
    this.name = 'UnknownMarketplaceDescriptorError';
  }
}
