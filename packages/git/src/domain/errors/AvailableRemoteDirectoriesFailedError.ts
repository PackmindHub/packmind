import { GitUpstreamError } from './GitUpstreamError';

/**
 * The provider call behind the remote directory listing failed. Same shape
 * and same reasoning as the directory existence check: everything the caller
 * or we could be blamed for is re-thrown by the use case with its own
 * attribution intact, so what reaches this wrapper is an unclassified
 * failure of a call to a git provider — a 502, with the original error kept
 * in `cause`.
 */
export class AvailableRemoteDirectoriesFailedError extends GitUpstreamError {
  constructor(
    organizationId: string,
    gitRepoId: string,
    public readonly cause: unknown,
  ) {
    super(
      'upstream_unavailable',
      'available_remote_directories_failed',
      { organizationId, gitRepoId },
      `Failed to get available targets: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'AvailableRemoteDirectoriesFailedError';
  }
}
