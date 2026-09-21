export class MarketplaceAlreadyLinkedError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      `The marketplace ${owner}/${repo} has already been linked to your organization`,
    );
    this.name = 'MarketplaceAlreadyLinkedError';
  }
}
