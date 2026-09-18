import { MARKETPLACE_DESCRIPTOR_FILENAME } from '../MarketplaceDescriptorFilename';

export class MarketplaceDescriptorNotFoundError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      `Marketplace descriptor "${MARKETPLACE_DESCRIPTOR_FILENAME}" not found in repository ${owner}/${repo}`,
    );
    this.name = 'MarketplaceDescriptorNotFoundError';
  }
}
