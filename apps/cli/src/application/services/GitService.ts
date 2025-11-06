import { exec } from 'child_process';
import { promisify } from 'util';
import { PackmindLogger } from '@packmind/logger';

const execAsync = promisify(exec);

const origin = 'GitService';

export type GitRemoteResult = {
  gitRemoteUrl: string;
};

export type GitBranchesResult = {
  branches: string[];
};

export class GitService {
  private readonly logger: PackmindLogger;

  constructor(logger: PackmindLogger = new PackmindLogger(origin)) {
    this.logger = logger;
  }

  public async getGitRepositoryRoot(path: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel', {
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

  public async getCurrentBranches(
    repoPath: string,
  ): Promise<GitBranchesResult> {
    try {
      const { stdout } = await execAsync('git branch -a --contains HEAD', {
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
      const { stdout } = await execAsync('git remote -v', {
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
      const [, host, path] = sshMatch;
      const cleanPath = path.replace(/\.git$/, '');
      return `${host}/${cleanPath}`;
    }

    // Convert HTTPS URLs to normalized format
    // https://github.com/PackmindHub/packmind-monorepo.git -> github.com/PackmindHub/packmind-monorepo
    const httpsMatch = url.match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (httpsMatch) {
      const [, host, path] = httpsMatch;
      const cleanPath = path.replace(/\.git$/, '');
      return `${host}/${cleanPath}`;
    }

    // Return as-is if no normalization is needed
    return url;
  }
}
