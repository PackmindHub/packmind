import { GitProviderVendor } from '@packmind/types';

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
