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
