import { ModifiedLine } from '../entities/DiffMode';

export type GitRemoteResult = {
  gitRemoteUrl: string;
};

export type GitBranchesResult = {
  branches: string[];
};

export type GitCurrentBranchResult = {
  branch: string;
};

export interface IGitService {
  getGitRepositoryRoot(path: string): string;

  tryGetGitRepositoryRoot(path: string): string | null;

  getGitRepositoryRootSync(cwd: string): string | null;

  getCurrentBranch(repoPath: string): GitCurrentBranchResult;

  getCurrentBranches(repoPath: string): GitBranchesResult;

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
