import { GitInternalError } from './GitInternalError';

/**
 * The provider call behind the remote directory listing failed. Same shape
 * as the directory existence check: the downstream failure is arbitrary and
 * not the caller's to correct, so it stays a 500 and keeps the original
 * error in `cause`.
 */
export class AvailableRemoteDirectoriesFailedError extends GitInternalError {
  constructor(
    organizationId: string,
    gitRepoId: string,
    public readonly cause: unknown,
  ) {
    super(
      'available_remote_directories_failed',
      { organizationId, gitRepoId },
      `Failed to get available targets: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'AvailableRemoteDirectoriesFailedError';
  }
}
