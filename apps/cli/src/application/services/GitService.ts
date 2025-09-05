import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type GitRemoteResult = {
  gitRemoteUrl: string;
};

export class GitService {
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
