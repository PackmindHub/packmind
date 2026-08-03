import { MARKETPLACE_DESCRIPTOR_FILENAME } from '../MarketplaceDescriptorFilename';

/**
 * Error thrown when the target Git repository does not expose a marketplace
 * descriptor file (`marketplace.json`).
 */
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
