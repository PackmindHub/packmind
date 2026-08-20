import { ModifiedLine } from '../entities/DiffMode';

export type GitRemoteResult = {
  gitRemoteUrl: string;
};

export type GitBranchesResult = {
  branches: string[];
};

export type GitCurrentBranchResult = {
  /**
   * The checked-out branch, or the literal `HEAD` when none is — see `detached`.
   * Kept as a plain string so callers can still name what git reported.
   */
  branch: string;
  /**
   * True when HEAD points straight at a commit instead of a branch: a rebase in
   * flight, `git checkout <sha>`, or a CI job that checked out a pull request
   * merge ref. There is no branch to track or record against in that state.
   */
  detached: boolean;
};

export interface IGitService {
  getGitRepositoryRoot(path: string): string;

  tryGetGitRepositoryRoot(path: string): string | null;

  getGitRepositoryRootSync(cwd: string): string | null;

  getCurrentBranch(repoPath: string): GitCurrentBranchResult;

  getCurrentBranches(repoPath: string): GitBranchesResult;

  /**
   * Whether `branch` exists in the repository, either as a local branch or as
   * a remote-tracking branch. A branch that exists on the remote but was never
   * fetched is unknown here.
   */
  branchExists(repoPath: string, branch: string): boolean;

  getGitRemoteUrl(repoPath: string, origin?: string): GitRemoteResult;

  /**
   * Gets files that have been modified (staged + unstaged) compared to HEAD.
   * Returns absolute file paths.
   */
  getModifiedFiles(repoPath: string): string[];

  /**
   * Gets untracked files (new files not yet added to git).
   * Returns absolute file paths.
   */
  getUntrackedFiles(repoPath: string): string[];

  /**
   * Gets line-level diff information for modified files.
   * For untracked files, all lines are considered modified (new file).
   * Returns ModifiedLine objects with absolute file paths.
   */
  getModifiedLines(repoPath: string): ModifiedLine[];
}
