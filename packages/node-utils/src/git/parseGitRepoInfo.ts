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
