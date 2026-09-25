import { MARKETPLACE_DESCRIPTOR_PATHS } from '../MarketplaceDescriptorFilename';
import { MarketplacesError } from './MarketplacesError';

export class MarketplaceDescriptorNotFoundError extends MarketplacesError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'invalid_input',
      'marketplace_descriptor_not_found',
      { gitRepoOwner: owner, gitRepoName: repo },
      `No marketplace descriptor found in repository ${owner}/${repo}. Looked for: ${MARKETPLACE_DESCRIPTOR_PATHS.join(', ')}`,
    );
    this.name = 'MarketplaceDescriptorNotFoundError';
  }
}
