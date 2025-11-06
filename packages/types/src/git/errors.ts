/**
 * Git-related domain errors for business logic violations
 */

// Type guard for V8-specific Error.captureStackTrace
interface ErrorWithCaptureStackTrace {
  captureStackTrace: (
    error: Error,
    constructor: new (...args: unknown[]) => unknown,
  ) => void;
}

function hasCaptureStackTrace(
  error: typeof Error,
): error is typeof Error & ErrorWithCaptureStackTrace {
  return (
    typeof (error as unknown as ErrorWithCaptureStackTrace)
      .captureStackTrace === 'function'
  );
}

/**
 * Error thrown when attempting to add a repository with a branch that already exists in the organization
 */
export class GitRepoAlreadyExistsError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly branch: string,
    public readonly organizationId: string,
  ) {
    super(
      `Repository ${owner}/${repo} on branch '${branch}' already exists in this organization`,
    );
    this.name = 'GitRepoAlreadyExistsError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitRepoAlreadyExistsError);
    }
  }
}

/**
 * Error thrown when a git provider is not found
 */
export class GitProviderNotFoundError extends Error {
  constructor(public readonly gitProviderId: string) {
    super(`Git provider with ID '${gitProviderId}' not found`);
    this.name = 'GitProviderNotFoundError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderNotFoundError);
    }
  }
}

/**
 * Error thrown when a git provider doesn't belong to the specified organization
 */
export class GitProviderOrganizationMismatchError extends Error {
  constructor(
    public readonly gitProviderId: string,
    public readonly organizationId: string,
  ) {
    super(
      `Git provider '${gitProviderId}' does not belong to organization '${organizationId}'`,
    );
    this.name = 'GitProviderOrganizationMismatchError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderOrganizationMismatchError);
    }
  }
}

/**
 * Error thrown when attempting to delete a git provider that still has associated repositories
 */
export class GitProviderHasRepositoriesError extends Error {
  constructor(
    public readonly gitProviderId: string,
    public readonly repositoryCount: number,
  ) {
    super(
      `Cannot delete git provider: ${repositoryCount} repositories are still associated with this provider.`,
    );
    this.name = 'GitProviderHasRepositoriesError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderHasRepositoriesError);
    }
  }
}
