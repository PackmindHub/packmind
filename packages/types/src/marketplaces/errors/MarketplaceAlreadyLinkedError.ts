import { MarketplacesError } from './MarketplacesError';

export class MarketplaceAlreadyLinkedError extends MarketplacesError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'conflict',
      'marketplace_already_linked',
      { gitRepoOwner: owner, gitRepoName: repo },
      `The marketplace ${owner}/${repo} has already been linked to your organization`,
    );
    this.name = 'MarketplaceAlreadyLinkedError';
  }
}
