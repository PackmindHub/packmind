import { GitProviderVendor } from '@packmind/types';

/**
 * Recognises only the hosted github.com and gitlab.com; a self-hosted instance
 * on any other domain comes back as 'unknown'.
 */
export function parseGitProviderVendor(
  gitRemoteUrl: string,
): GitProviderVendor {
  const normalizedUrl = gitRemoteUrl.toLowerCase();

  if (normalizedUrl.includes('github.com')) {
    return 'github';
  }

  if (normalizedUrl.includes('gitlab.com')) {
    return 'gitlab';
  }

  return 'unknown';
}
