/**
 * Error thrown when an organization attempts to link a marketplace that is
 * already linked to the same organization.
 *
 * The message follows the contract defined in the GH-541 functional spec
 * (AC-5) and must remain stable for downstream UI/API consumers.
 */
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
