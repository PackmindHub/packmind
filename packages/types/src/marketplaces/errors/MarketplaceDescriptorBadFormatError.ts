import { MARKETPLACE_DESCRIPTOR_FILENAME } from '../MarketplaceDescriptorFilename';
import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when the marketplace descriptor file was reachable but
 * cannot be parsed into a `MarketplaceDescriptor` (malformed JSON,
 * unknown vendor, missing required fields, etc.) at publish time.
 *
 * The publish use case sets the marketplace state to `bad_format` before
 * raising this error so admins see the broken contract in the marketplace
 * list.
 */
export class MarketplaceDescriptorBadFormatError extends MarketplacesError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly detail?: string,
  ) {
    super(
      'invalid_input',
      'marketplace_descriptor_bad_format',
      { gitRepoOwner: owner, gitRepoName: repo },
      `Marketplace descriptor "${MARKETPLACE_DESCRIPTOR_FILENAME}" in repository ${owner}/${repo} is missing or has a bad format${
        detail ? `: ${detail}` : ''
      }`,
    );
    this.name = 'MarketplaceDescriptorBadFormatError';
  }
}
