// Error.captureStackTrace is V8-only, so it is absent from the standard Error type.
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

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitRepoAlreadyExistsError);
    }
  }
}

export class GitProviderNotFoundError extends Error {
  constructor(public readonly gitProviderId: string) {
    super(`Git provider with ID '${gitProviderId}' not found`);
    this.name = 'GitProviderNotFoundError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitProviderNotFoundError);
    }
  }
}

export class GitRepoNotFoundError extends Error {
  constructor(public readonly gitRepoId: string) {
    super(`Git repository with ID '${gitRepoId}' not found`);
    this.name = 'GitRepoNotFoundError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitRepoNotFoundError);
    }
  }
}

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

export class InvalidGitProviderCredentialsError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'InvalidGitProviderCredentialsError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, InvalidGitProviderCredentialsError);
    }
  }
}

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

/** CLI-managed: created automatically by `packmind`, not configurable from the UI. */
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

/** Tracking is unique per (organization, owner, repo), not per branch. */
export class RepositoryAlreadyTrackedError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly trackedBranch: string,
  ) {
    super(
      `Repository ${owner}/${repo} is already tracked on branch '${trackedBranch}'`,
    );
    this.name = 'RepositoryAlreadyTrackedError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, RepositoryAlreadyTrackedError);
    }
  }
}

export class NoTrackedRepositoryError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      'Nothing is tracked yet — run `packmind init` or `packmind git track` to start tracking.',
    );
    this.name = 'NoTrackedRepositoryError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, NoTrackedRepositoryError);
    }
  }
}

/**
 * Mapped to 409, deliberately not 404: the CLI already reads any 404 on the
 * tracking routes as "the feature is unavailable for your account" and would
 * print the wrong message.
 */
export class RepositoryNotTrackableError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      `Repository ${owner}/${repo} is not connected to Packmind, so its tracking cannot be removed`,
    );
    this.name = 'RepositoryNotTrackableError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, RepositoryNotTrackableError);
    }
  }
}

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

/**
 * Linking a repo that is already a standard (non-marketplace) GitRepo would
 * create a cross-type collision, so the link is rejected and the admin resolves
 * the conflict explicitly.
 */
export class GitRepoAlreadyLinkedAsStandardError extends Error {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
  ) {
    super(
      `Repository ${owner}/${repo} is already linked as a standard Git repository in this organization`,
    );
    this.name = 'GitRepoAlreadyLinkedAsStandardError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, GitRepoAlreadyLinkedAsStandardError);
    }
  }
}
