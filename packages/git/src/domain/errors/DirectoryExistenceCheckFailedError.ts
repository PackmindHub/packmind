import { GitUpstreamError } from './GitUpstreamError';

/**
 * The provider call behind a directory existence check failed with something
 * nothing upstream of it had already named. The use case now re-throws an
 * already-attributed failure untouched, so what is left to wrap is an
 * unclassified failure of a call to a git provider — which makes
 * `upstream_unavailable` the honest default rather than a 500 with our stack
 * on someone else's outage. The original failure is carried in `cause`.
 */
export class DirectoryExistenceCheckFailedError extends GitUpstreamError {
  constructor(
    gitRepoId: string,
    directoryPath: string,
    branch: string,
    public readonly cause: unknown,
  ) {
    super(
      'upstream_unavailable',
      'directory_existence_check_failed',
      { gitRepoId, directoryPath, branch },
      `Failed to check directory existence: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'DirectoryExistenceCheckFailedError';
  }
}
