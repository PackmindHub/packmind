import { GitBranchComparison, GitCommit } from '@packmind/types';

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
   * Delete a branch on the repository. No-op when the branch is already
   * absent (404 from the provider). Used by the marketplace accept-drift
   * flow to retire the rolling `packmind/sync` branch so the next publish
   * starts from a clean merge-base against the default branch.
   *
   * @param targetBranch - The branch name to delete
   */
  deleteBranch(targetBranch: string): Promise<void>;

  /**
   * Open a pull request from `head` to the repository's configured base
   * branch, or update the matching open PR when one already exists
   * (rolling-PR semantics).
   *
   * On the update path the existing PR's title and body are refreshed so a
   * recomputed description (e.g. the marketplace sync PR's change summary)
   * replaces the previous one. A failure to refresh is swallowed by the
   * implementations — the caller still gets the existing PR's URL.
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
   * File-level diff of `head` against `base`, i.e. what a pull request from
   * `head` into `base` would change.
   *
   * Used by the marketplace sync PR to describe its own contents. Returns an
   * empty, non-truncated comparison when either branch is missing — an absent
   * branch means "nothing to compare", not an error.
   *
   * @param base - The branch changes are measured against (the merge target)
   * @param head - The branch carrying the changes
   */
  compareBranches(base: string, head: string): Promise<GitBranchComparison>;

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
