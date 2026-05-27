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

export class InvalidManifestStateError extends Error {
  constructor() {
    super('The manifest state token is invalid or has expired');
    this.name = 'InvalidManifestStateError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, InvalidManifestStateError);
    }
  }
}

export class AppAlreadyRegisteredError extends Error {
  constructor() {
    super(
      'A GitHub App is already registered for this Packmind instance. Only one App per instance is supported.',
    );
    this.name = 'AppAlreadyRegisteredError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, AppAlreadyRegisteredError);
    }
  }
}

export class NoGitHubAppRegisteredError extends Error {
  constructor() {
    super('No GitHub App is registered for this Packmind instance');
    this.name = 'NoGitHubAppRegisteredError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, NoGitHubAppRegisteredError);
    }
  }
}

export class GitHubInstallationNotFoundError extends Error {
  constructor(public readonly installationId: number) {
    super(
      `GitHub App installation '${installationId}' was not found or is not accessible`,
    );
    this.name = 'GitHubInstallationNotFoundError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitHubInstallationNotFoundError);
    }
  }
}

export class NotAGitHubAppProviderError extends Error {
  constructor(public readonly gitProviderId: string) {
    super(
      `Git provider '${gitProviderId}' is not a GitHub App provider or has no installation linked`,
    );
    this.name = 'NotAGitHubAppProviderError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, NotAGitHubAppProviderError);
    }
  }
}
