import { GitInternalError } from './GitInternalError';

/**
 * The provider call behind a directory existence check failed. What went
 * wrong downstream is arbitrary — a rate limit, a revoked token, a network
 * fault — and none of it is the caller's to correct, so it stays a 500 with
 * the original failure carried in `cause`.
 */
export class DirectoryExistenceCheckFailedError extends GitInternalError {
  constructor(
    gitRepoId: string,
    directoryPath: string,
    branch: string,
    public readonly cause: unknown,
  ) {
    super(
      'directory_existence_check_failed',
      { gitRepoId, directoryPath, branch },
      `Failed to check directory existence: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'DirectoryExistenceCheckFailedError';
  }
}
