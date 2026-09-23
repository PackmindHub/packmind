import { MARKETPLACE_DESCRIPTOR_PATHS } from '../MarketplaceDescriptorFilename';

export class MarketplaceDescriptorNotFoundError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      `No marketplace descriptor found in repository ${owner}/${repo}. Looked for: ${MARKETPLACE_DESCRIPTOR_PATHS.join(', ')}`,
    );
    this.name = 'MarketplaceDescriptorNotFoundError';
  }
}
