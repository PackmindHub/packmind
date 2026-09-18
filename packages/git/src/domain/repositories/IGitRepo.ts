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
   * Batched sibling of `listFilesInDirectory`: the files under each of
   * `paths`, concatenated in the order the paths were given. Overlapping
   * paths (`a` and `a/b`) report the nested files under both, exactly as
   * calling the singular form for each would.
   *
   * Implementations that can serve every path from a single provider listing
   * MUST do so: on GitHub the singular form walks
   * `ref -> commit -> tree?recursive=1` per call, so expanding a directory
   * deletion would otherwise cost requests proportional to the number of
   * directories to answer a question one recursive tree already answers.
   */
  listFilesInDirectories(
    paths: string[],
    branch: string,
  ): Promise<{ path: string }[]>;

  /** No-op when the target branch already exists. */
  createBranchFromBase(targetBranch: string): Promise<void>;

  /** No-op when the branch is already absent (404 from the provider). */
  deleteBranch(targetBranch: string): Promise<void>;

  /**
   * Open a pull request from `head` to the repository's configured base
   * branch, or update the matching open PR when one already exists
   * (rolling-PR semantics).
   *
   * On the update path the existing PR's title and body are refreshed so a
   * recomputed description replaces the previous one. A failure to refresh is
   * swallowed — the caller still gets the existing PR's URL.
   */
  openOrUpdatePullRequest(command: {
    head: string;
    title: string;
    body?: string;
  }): Promise<{ url: string; number: number; wasCreated: boolean }>;

  /**
   * Open pull request from `head` to the repository's configured base branch,
   * or `null` when none is open.
   */
  findOpenPullRequest(
    head: string,
  ): Promise<{ url: string; number: number } | null>;

  /**
   * File-level diff of `head` against `base`, i.e. what a pull request from
   * `head` into `base` would change. Returns an empty, non-truncated
   * comparison when either branch is missing — an absent branch means
   * "nothing to compare", not an error.
   */
  compareBranches(base: string, head: string): Promise<GitBranchComparison>;

  /**
   * Probe whether the repository is currently reachable with the configured
   * credentials, mapping provider exceptions onto the failure modes callers
   * report instead of letting them leak.
   */
  checkRepositoryExists(): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }>;
}
