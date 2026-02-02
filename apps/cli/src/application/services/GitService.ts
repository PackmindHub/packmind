import { execSync, ExecSyncOptions } from 'child_process';
import { PackmindLogger } from '@packmind/logger';
import { ModifiedLine } from '../../domain/entities/DiffMode';
import * as path from 'path';
import { normalizePath } from '../utils/pathUtils';
import {
  GitBranchesResult,
  GitCurrentBranchResult,
  GitRemoteResult,
  IGitService,
} from '../../domain/services/IGitService';

const origin = 'GitService';

export type GitRunnerOptions = ExecSyncOptions & { maxBuffer?: number };
export type GitRunnerResult = { stdout: string };
export type GitRunner = (
  command: string,
  options?: GitRunnerOptions,
) => GitRunnerResult;

export class GitService implements IGitService {
  private readonly logger: PackmindLogger;

  constructor(
    logger: PackmindLogger = new PackmindLogger(origin),
    private readonly gitRunner: GitRunner = (cmd, opts) => {
      const stdout = execSync(`git ${cmd}`, {
        ...opts,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout };
    },
  ) {
    this.logger = logger;
  }

  getGitRepositoryRoot(path: string): string {
    try {
      const { stdout } = this.gitRunner('rev-parse --show-toplevel', {
        cwd: path,
      });

      const gitRoot = stdout.trim();
      this.logger.debug('Resolved git repository root', {
        inputPath: path,
        gitRoot,
      });

      return gitRoot;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get Git repository root. The path '${path}' does not appear to be inside a Git repository.\n${error.message}`,
        );
      }
      throw new Error('Failed to get Git repository root: Unknown error');
    }
  }

  tryGetGitRepositoryRoot(path: string): string | null {
    try {
      return this.getGitRepositoryRoot(path);
    } catch {
      return null;
    }
  }

  getGitRepositoryRootSync(cwd: string): string | null {
    try {
      const result = execSync('git rev-parse --show-toplevel', {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
      return result.trim();
    } catch {
      return null;
    }
  }

  getCurrentBranch(repoPath: string): GitCurrentBranchResult {
    try {
      const { stdout } = this.gitRunner('rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
      });

      const branch = stdout.trim();
      this.logger.debug('Resolved current branch', {
        repoPath,
        branch,
      });

      return { branch };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get current Git branch. The path '${repoPath}' does not appear to be inside a Git repository.\n${error.message}`,
        );
      }
      throw new Error('Failed to get current Git branch: Unknown error');
    }
  }

  getCurrentBranches(repoPath: string): GitBranchesResult {
    try {
      const { stdout } = this.gitRunner('branch -a --contains HEAD', {
        cwd: repoPath,
      });

      const branches = this.parseBranches(stdout);

      return { branches };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get Git branches. packmind-cli lint must be run in a Git repository.\n${error.message}`,
        );
      }
      throw new Error('Failed to get Git branches: Unknown error');
    }
  }

  getGitRemoteUrl(repoPath: string, origin?: string): GitRemoteResult {
    try {
      const { stdout } = this.gitRunner('remote -v', {
        cwd: repoPath,
      });

      const remotes = this.parseRemotes(stdout);

      if (remotes.length === 0) {
        throw new Error('No Git remotes found in the repository');
      }

      let selectedRemote: string;

      if (origin) {
        // Use specified remote name
        const foundRemote = remotes.find((remote) => remote.name === origin);
        if (!foundRemote) {
          throw new Error(`Remote '${origin}' not found in repository`);
        }
        selectedRemote = foundRemote.url;
      } else if (remotes.length === 1) {
        // Use the only available remote
        selectedRemote = remotes[0].url;
      } else {
        // Multiple remotes available, use 'origin' as default
        const originRemote = remotes.find((remote) => remote.name === 'origin');
        if (!originRemote) {
          throw new Error(
            "Multiple remotes found but no 'origin' remote. Please specify the remote name.",
          );
        }
        selectedRemote = originRemote.url;
      }

      return {
        gitRemoteUrl: this.normalizeGitUrl(selectedRemote),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get Git remote URL. packmind-cli lint must be run in a Git repository.\n${error.message}`,
        );
      }
      throw new Error('Failed to get Git remote URL: Unknown error');
    }
  }

  /**
   * Gets files that have been modified (staged + unstaged) compared to HEAD.
   * Returns absolute file paths.
   */
  getModifiedFiles(repoPath: string): string[] {
    const gitRoot = this.getGitRepositoryRoot(repoPath);

    // Get tracked modified files (staged + unstaged)
    const trackedFiles = this.getTrackedModifiedFiles(gitRoot);

    // Get untracked files
    const untrackedFiles = this.getUntrackedFiles(gitRoot);

    // Combine and deduplicate
    const allFiles = [...new Set([...trackedFiles, ...untrackedFiles])];

    this.logger.debug('Found modified files', {
      trackedCount: trackedFiles.length,
      untrackedCount: untrackedFiles.length,
      totalCount: allFiles.length,
    });

    return allFiles;
  }

  /**
   * Gets untracked files (new files not yet added to git).
   * Returns absolute file paths.
   */
  getUntrackedFiles(repoPath: string): string[] {
    const gitRoot = this.getGitRepositoryRoot(repoPath);

    const { stdout } = this.gitRunner('ls-files --others --exclude-standard', {
      cwd: gitRoot,
    });

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((relativePath) => normalizePath(path.join(gitRoot, relativePath)));
  }

  /**
   * Gets line-level diff information for modified files.
   * For untracked files, all lines are considered modified (new file).
   * Returns ModifiedLine objects with absolute file paths.
   */
  getModifiedLines(repoPath: string): ModifiedLine[] {
    const gitRoot = this.getGitRepositoryRoot(repoPath);
    const modifiedLines: ModifiedLine[] = [];

    // Get tracked file modifications from unified diff
    const trackedModifications = this.getTrackedModifiedLines(gitRoot);
    modifiedLines.push(...trackedModifications);

    // For untracked files, count all lines as modified
    const untrackedFiles = this.getUntrackedFiles(gitRoot);
    for (const filePath of untrackedFiles) {
      const lineCount = this.countFileLines(filePath);
      if (lineCount > 0) {
        modifiedLines.push({
          file: filePath,
          startLine: 1,
          lineCount,
        });
      }
    }

    this.logger.debug('Found modified lines', {
      trackedEntries: trackedModifications.length,
      untrackedFiles: untrackedFiles.length,
      totalEntries: modifiedLines.length,
    });

    return modifiedLines;
  }

  private parseRemotes(gitRemoteOutput: string): Array<{
    name: string;
    url: string;
    type: string;
  }> {
    const lines = gitRemoteOutput.trim().split('\n');
    const remotes: Array<{ name: string; url: string; type: string }> = [];

    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
      if (match) {
        const [, name, url, type] = match;
        // Only include fetch remotes to avoid duplicates
        if (type === 'fetch') {
          remotes.push({ name, url, type });
        }
      }
    }

    return remotes;
  }

  private parseBranches(gitBranchOutput: string): string[] {
    const lines = gitBranchOutput.trim().split('\n');
    const branchNames = new Set<string>();

    for (const line of lines) {
      let branchName = line.trim();

      // Remove the asterisk prefix for current branch
      if (branchName.startsWith('* ')) {
        branchName = branchName.substring(2).trim();
      }

      // Remove "remotes/origin/" prefix
      if (branchName.startsWith('remotes/origin/')) {
        branchName = branchName.substring('remotes/origin/'.length);
      }

      // Remove "remotes/" prefix for other remotes
      if (branchName.startsWith('remotes/')) {
        const parts = branchName.split('/');
        if (parts.length > 2) {
          branchName = parts.slice(2).join('/');
        }
      }

      // Skip HEAD references
      if (branchName.includes('HEAD ->')) {
        continue;
      }

      if (branchName) {
        branchNames.add(branchName);
      }
    }

    return Array.from(branchNames);
  }

  private normalizeGitUrl(url: string): string {
    // Return the URL as-is - the backend handles both SSH and HTTPS formats
    // and needs the protocol information to extract the base URL correctly.
    // Only remove the .git suffix for consistency.
    return url.replace(/\.git$/, '');
  }

  /**
   * Gets tracked files that have been modified (staged + unstaged) compared to HEAD.
   * Returns absolute file paths.
   */
  private getTrackedModifiedFiles(gitRoot: string): string[] {
    try {
      const { stdout } = this.gitRunner('diff --name-only HEAD', {
        cwd: gitRoot,
      });

      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((relativePath) => normalizePath(path.join(gitRoot, relativePath)));
    } catch (error) {
      // If HEAD doesn't exist (first commit scenario), get all staged files
      if (
        error instanceof Error &&
        error.message.includes('unknown revision')
      ) {
        this.logger.debug(
          'HEAD does not exist (first commit), getting staged files only',
        );
        return this.getStagedFilesWithoutHead(gitRoot);
      }
      throw error;
    }
  }

  /**
   * Gets staged files when HEAD doesn't exist (first commit scenario).
   */
  private getStagedFilesWithoutHead(gitRoot: string): string[] {
    const { stdout } = this.gitRunner('diff --cached --name-only', {
      cwd: gitRoot,
    });

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((relativePath) => normalizePath(path.join(gitRoot, relativePath)));
  }

  /**
   * Parses git diff output to extract line-level modifications.
   */
  private getTrackedModifiedLines(gitRoot: string): ModifiedLine[] {
    try {
      const { stdout } = this.gitRunner('diff HEAD --unified=0', {
        cwd: gitRoot,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large diffs
      });

      return this.parseDiffOutput(stdout, gitRoot);
    } catch (error) {
      // If HEAD doesn't exist (first commit scenario), get staged diff
      if (
        error instanceof Error &&
        error.message.includes('unknown revision')
      ) {
        this.logger.debug(
          'HEAD does not exist (first commit), getting staged diff only',
        );
        return this.getStagedModifiedLinesWithoutHead(gitRoot);
      }
      throw error;
    }
  }

  /**
   * Gets modified lines from staged files when HEAD doesn't exist.
   */
  private getStagedModifiedLinesWithoutHead(gitRoot: string): ModifiedLine[] {
    const { stdout } = this.gitRunner('diff --cached --unified=0', {
      cwd: gitRoot,
      maxBuffer: 50 * 1024 * 1024,
    });

    return this.parseDiffOutput(stdout, gitRoot);
  }

  /**
   * Parses unified diff output to extract modified line ranges.
   * Format: @@ -oldStart,oldCount +newStart,newCount @@
   */
  private parseDiffOutput(diffOutput: string, gitRoot: string): ModifiedLine[] {
    const modifiedLines: ModifiedLine[] = [];
    const lines = diffOutput.split('\n');
    let currentFile: string | null = null;

    for (const line of lines) {
      // Match file header: diff --git a/path b/path
      const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (fileMatch) {
        currentFile = normalizePath(path.join(gitRoot, fileMatch[2]));
        continue;
      }

      // Match hunk header: @@ -old +new @@
      // Format: @@ -10,5 +10,7 @@ or @@ -10 +10 @@ (single line)
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch && currentFile) {
        const startLine = parseInt(hunkMatch[1], 10);
        const lineCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;

        // Only add if there are actually added/modified lines (lineCount > 0)
        if (lineCount > 0) {
          modifiedLines.push({
            file: currentFile,
            startLine,
            lineCount,
          });
        }
      }
    }

    return modifiedLines;
  }

  /**
   * Counts the number of lines in a file.
   */
  private countFileLines(filePath: string): number {
    try {
      const stdout = execSync(`wc -l < "${filePath}"`, { encoding: 'utf-8' });
      const count = parseInt(stdout.trim(), 10);
      // wc -l returns 0 for files without trailing newline, but file has content
      // Add 1 if file has content but no trailing newline
      if (count === 0) {
        const content = execSync(`head -c 1 "${filePath}"`, {
          encoding: 'utf-8',
        });
        return content.length > 0 ? 1 : 0;
      }
      return count;
    } catch {
      return 0;
    }
  }
}
