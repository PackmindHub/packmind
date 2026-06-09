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

/**
 * Error thrown when attempting to add a repository to a git provider that has no token configured
 */
export class GitProviderMissingTokenError extends Error {
  constructor(public readonly gitProviderId: string) {
    super(
      `Git provider '${gitProviderId}' has no token configured. Cannot add repositories to providers without authentication.`,
    );
    this.name = 'GitProviderMissingTokenError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderMissingTokenError);
    }
  }
}

/**
 * Error thrown when attempting to update a target's path when its git provider has no token configured
 */
export class TargetPathUpdateForbiddenError extends Error {
  constructor(public readonly targetId: string) {
    super(
      `Cannot update path for target '${targetId}'. The associated git provider has no token configured.`,
    );
    this.name = 'TargetPathUpdateForbiddenError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, TargetPathUpdateForbiddenError);
    }
  }
}

/**
 * Error thrown when the provided git provider credential combination is invalid
 * for the given auth method and edition.
 */
export class InvalidGitProviderCredentialsError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'InvalidGitProviderCredentialsError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, InvalidGitProviderCredentialsError);
    }
  }
}

/**
 * Error thrown when the OrganizationGitHubApp bound to a GitProvider has been
 * revoked. Distribution and other GitHub-App-authenticated operations cannot
 * proceed; the user must re-install via the currently active App.
 */
export class GitHubAppRevokedError extends Error {
  constructor(public readonly providerId: string) {
    super(
      `The GitHub App bound to provider ${providerId} has been revoked. Re-install the current GitHub App to restore access.`,
    );
    this.name = 'GitHubAppRevokedError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitHubAppRevokedError);
    }
  }
}

/**
 * Error thrown when a non-empty display name collides (case-insensitively) with
 * another git provider in the same organization.
 */
export class GitProviderDisplayNameAlreadyUsedError extends Error {
  constructor(
    public readonly displayName: string,
    public readonly organizationId: string,
  ) {
    super(
      `A connection with display name '${displayName}' already exists in this organization`,
    );
    this.name = 'GitProviderDisplayNameAlreadyUsedError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderDisplayNameAlreadyUsedError);
    }
  }
}

/**
 * Error thrown when attempting to edit the display name of a CLI-managed git
 * provider (one created automatically by `packmind-cli` and not configurable
 * from the UI).
 */
export class GitProviderDisplayNameNotEditableError extends Error {
  constructor(public readonly gitProviderId: string) {
    super(
      `Display name is not editable on CLI-managed git provider '${gitProviderId}'`,
    );
    this.name = 'GitProviderDisplayNameNotEditableError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderDisplayNameNotEditableError);
    }
  }
}

/**
 * Error thrown when attempting to use a git remote URL with an unsupported provider
 */
export class UnsupportedGitProviderError extends Error {
  constructor(public readonly gitRemoteUrl: string) {
    super(
      `Unsupported git provider for URL '${gitRemoteUrl}'. Only GitHub is currently supported.`,
    );
    this.name = 'UnsupportedGitProviderError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, UnsupportedGitProviderError);
    }
  }
}
