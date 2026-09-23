import { GitError } from './GitError';

/**
 * A provider that exists in another organization must be indistinguishable
 * from one that does not exist at all: same `not_found` kind, same
 * `git_provider_not_found` reason and the very same message as
 * `GitProviderNotFoundError`, so a caller can never confirm an id is real by
 * probing another tenant. The organization the lookup was scoped to stays in
 * the context, for the log only.
 */
export class GitProviderOrganizationMismatchError extends GitError {
  constructor(
    public readonly gitProviderId: string,
    public readonly organizationId: string,
  ) {
    super(
      'not_found',
      'git_provider_not_found',
      { gitProviderId, organizationId },
      'Git provider not found',
    );
    this.name = 'GitProviderOrganizationMismatchError';
  }
}
