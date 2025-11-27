import { exec, execSync, ExecOptions } from 'child_process';
import { promisify } from 'util';
import { PackmindLogger } from '@packmind/logger';
import { ModifiedLine } from '../../domain/entities/DiffMode';
import * as path from 'path';

const execAsync = promisify(exec);

const origin = 'GitService';

export type GitRunnerOptions = ExecOptions & { maxBuffer?: number };
export type GitRunnerResult = { stdout: string; stderr: string };
export type GitRunner = (
  command: string,
  options?: GitRunnerOptions,
) => Promise<GitRunnerResult>;

export type GitRemoteResult = {
  gitRemoteUrl: string;
};

export type GitBranchesResult = {
  branches: string[];
};

export class GitService {
  private readonly logger: PackmindLogger;

  constructor(
    logger: PackmindLogger = new PackmindLogger(origin),
    private readonly gitRunner: GitRunner = async (cmd, opts) => {
      const result = await execAsync(`git ${cmd}`, opts);
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
      };
    },
  ) {
    this.logger = logger;
  }

  public async getGitRepositoryRoot(path: string): Promise<string> {
    try {
      const { stdout } = await this.gitRunner('rev-parse --show-toplevel', {
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

  public async tryGetGitRepositoryRoot(path: string): Promise<string | null> {
    try {
      return await this.getGitRepositoryRoot(path);
    } catch {
      return null;
    }
  }

  public getGitRepositoryRootSync(cwd: string): string | null {
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

  public async getCurrentBranches(
    repoPath: string,
  ): Promise<GitBranchesResult> {
    try {
      const { stdout } = await this.gitRunner('branch -a --contains HEAD', {
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

  public async getGitRemoteUrl(
    repoPath: string,
    origin?: string,
  ): Promise<GitRemoteResult> {
    try {
      const { stdout } = await this.gitRunner('remote -v', {
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
    // Convert SSH URLs to a normalized format
    // git@github.com:PackmindHub/packmind-monorepo.git -> github.com/PackmindHub/packmind-monorepo
    const sshMatch = url.match(/^git@([^:]+):(.+)$/);
    if (sshMatch) {
      const [, host, urlPath] = sshMatch;
      const cleanPath = urlPath.replace(/\.git$/, '');
      return `${host}/${cleanPath}`;
    }

    // Convert HTTPS URLs to normalized format
    // https://github.com/PackmindHub/packmind-monorepo.git -> github.com/PackmindHub/packmind-monorepo
    const httpsMatch = url.match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (httpsMatch) {
      const [, host, urlPath] = httpsMatch;
      const cleanPath = urlPath.replace(/\.git$/, '');
      return `${host}/${cleanPath}`;
    }

    // Return as-is if no normalization is needed
    return url;
  }

  /**
   * Gets files that have been modified (staged + unstaged) compared to HEAD.
   * Returns absolute file paths.
   */
  public async getModifiedFiles(repoPath: string): Promise<string[]> {
    const gitRoot = await this.getGitRepositoryRoot(repoPath);

    // Get tracked modified files (staged + unstaged)
    const trackedFiles = await this.getTrackedModifiedFiles(gitRoot);

    // Get untracked files
    const untrackedFiles = await this.getUntrackedFiles(gitRoot);

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
   * Gets tracked files that have been modified (staged + unstaged) compared to HEAD.
   * Returns absolute file paths.
   */
  private async getTrackedModifiedFiles(gitRoot: string): Promise<string[]> {
    try {
      const { stdout } = await this.gitRunner('diff --name-only HEAD', {
        cwd: gitRoot,
      });

      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((relativePath) => path.join(gitRoot, relativePath));
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
  private async getStagedFilesWithoutHead(gitRoot: string): Promise<string[]> {
    const { stdout } = await this.gitRunner('diff --cached --name-only', {
      cwd: gitRoot,
    });

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((relativePath) => path.join(gitRoot, relativePath));
  }

  /**
   * Gets untracked files (new files not yet added to git).
   * Returns absolute file paths.
   */
  public async getUntrackedFiles(repoPath: string): Promise<string[]> {
    const gitRoot = await this.getGitRepositoryRoot(repoPath);

    const { stdout } = await this.gitRunner(
      'ls-files --others --exclude-standard',
      {
        cwd: gitRoot,
      },
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((relativePath) => path.join(gitRoot, relativePath));
  }

  /**
   * Gets line-level diff information for modified files.
   * For untracked files, all lines are considered modified (new file).
   * Returns ModifiedLine objects with absolute file paths.
   */
  public async getModifiedLines(repoPath: string): Promise<ModifiedLine[]> {
    const gitRoot = await this.getGitRepositoryRoot(repoPath);
    const modifiedLines: ModifiedLine[] = [];

    // Get tracked file modifications from unified diff
    const trackedModifications = await this.getTrackedModifiedLines(gitRoot);
    modifiedLines.push(...trackedModifications);

    // For untracked files, count all lines as modified
    const untrackedFiles = await this.getUntrackedFiles(gitRoot);
    for (const filePath of untrackedFiles) {
      const lineCount = await this.countFileLines(filePath);
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

  /**
   * Parses git diff output to extract line-level modifications.
   */
  private async getTrackedModifiedLines(
    gitRoot: string,
  ): Promise<ModifiedLine[]> {
    try {
      const { stdout } = await this.gitRunner('diff HEAD --unified=0', {
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
  private async getStagedModifiedLinesWithoutHead(
    gitRoot: string,
  ): Promise<ModifiedLine[]> {
    const { stdout } = await this.gitRunner('diff --cached --unified=0', {
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
        currentFile = path.join(gitRoot, fileMatch[2]);
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
  private async countFileLines(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`wc -l < "${filePath}"`);
      const count = parseInt(stdout.trim(), 10);
      // wc -l returns 0 for files without trailing newline, but file has content
      // Add 1 if file has content but no trailing newline
      if (count === 0) {
        const { stdout: content } = await execAsync(`head -c 1 "${filePath}"`);
        return content.length > 0 ? 1 : 0;
      }
      return count;
    } catch {
      return 0;
    }
  }
}
