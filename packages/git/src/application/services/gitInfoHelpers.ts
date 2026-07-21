import { GitProviderVendor } from '@packmind/types';

export type { GitProviderVendor };

/**
 * Parse a git remote URL to extract the provider vendor type
 * @param gitRemoteUrl The git remote URL (e.g., https://github.com/owner/repo.git)
 * @returns 'github', 'gitlab', or 'unknown' based on the URL
 */
export function parseGitProviderVendor(
  gitRemoteUrl: string,
): GitProviderVendor {
  // Normalize URL - handle both HTTPS and SSH formats
  const normalizedUrl = gitRemoteUrl.toLowerCase();

  if (normalizedUrl.includes('github.com')) {
    return 'github';
  }

  if (normalizedUrl.includes('gitlab.com')) {
    return 'gitlab';
  }

  return 'unknown';
}

/**
 * Parse a git remote URL to extract owner and repo
 * @param gitRemoteUrl The git remote URL
 * @returns Object with owner and repo
 */
export function parseGitRepoInfo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  // Handle HTTPS format: https://host.com/owner/repo.git or https://host.com/owner/repo
  // Handle SSH format: git@host.com:owner/repo.git or git@host.com:owner/repo
  // Also handles trailing slashes (e.g., https://host.com/owner/repo/)
  // Generic pattern that works for any git host
  const match = gitRemoteUrl.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/i);

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
}

/**
 * Extract the base URL from a git remote URL
 * @param gitRemoteUrl The git remote URL
 * @returns The base URL (e.g., https://bitbucket.org)
 */
export function extractBaseUrl(gitRemoteUrl: string): string {
  // Handle HTTPS format: https://host.com/owner/repo.git
  const httpsMatch = gitRemoteUrl.match(/^(https?:\/\/[^/]+)/i);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  // Handle SSH format: git@host.com:owner/repo.git
  const sshMatch = gitRemoteUrl.match(/^git@([^:]+):/i);
  if (sshMatch) {
    return `https://${sshMatch[1]}`;
  }

  // Fallback: return the original URL
  return gitRemoteUrl;
}
