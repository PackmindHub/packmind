import { GitCommit } from '@packmind/types';

export type CommitFile = {
  path: string;
  content: string;
  permissions?: string;
};

export interface IGitRepo {
  commitFiles(
    files: CommitFile[],
    commitMessage: string,
    deleteFiles?: { path: string }[],
  ): Promise<Omit<GitCommit, 'id'>>;

  handlePushHook(
    payload: unknown,
    fileMatcher: RegExp,
  ): Promise<
    {
      filepath: string;
      fileContent: string;
      author: string | null;
      gitSha: string | null;
      gitRepo: string | null;
      message: string | null;
    }[]
  >;

  getFileOnRepo(
    path: string,
    branch?: string,
  ): Promise<{
    sha: string;
    content: string;
    execute_filemode?: boolean;
  } | null>;

  listDirectoriesOnRepo(
    name: string,
    owner: string,
    branch: string,
    path?: string,
  ): Promise<string[]>;

  checkDirectoryExists(directoryPath: string, branch: string): Promise<boolean>;

  listFilesInDirectory(
    path: string,
    branch: string,
  ): Promise<{ path: string }[]>;

  /**
   * Ensure a target branch exists on the repository, creating it from the
   * repository's configured base branch when missing.
   *
   * No-op when the target branch already exists.
   *
   * @param targetBranch - The branch name to ensure exists
   */
  createBranchFromBase(targetBranch: string): Promise<void>;

  /**
   * Open a pull request from `head` to the repository's configured base
   * branch, or return the matching open PR when one already exists
   * (rolling-PR semantics).
   *
   * @param command - PR head / title / body
   * @returns The PR URL, provider-side number, and whether it was created
   */
  openOrUpdatePullRequest(command: {
    head: string;
    title: string;
    body?: string;
  }): Promise<{ url: string; number: number; wasCreated: boolean }>;

  /**
   * Find an OPEN pull request whose head is `head` targeting the repo's
   * configured base branch. Returns `null` when none is open. Used by the
   * marketplace reconcile to surface a pending "Packmind sync" PR.
   */
  findOpenPullRequest(
    head: string,
  ): Promise<{ url: string; number: number } | null>;

  /**
   * Probe whether the repository is currently reachable with the configured
   * credentials. Distinguishes the three failure modes the marketplaces page
   * surfaces, so the caller never has to infer them from raw exceptions.
   */
  checkRepositoryExists(): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }>;
}
