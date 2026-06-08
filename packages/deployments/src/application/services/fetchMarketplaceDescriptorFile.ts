import {
  GitRepo,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_PATHS,
} from '@packmind/types';

/**
 * A marketplace descriptor file located on a git repository, plus the path it
 * was found at (so callers can log which candidate matched).
 */
export interface MarketplaceDescriptorFile {
  path: string;
  sha: string;
  content: string;
}

/**
 * Probes `MARKETPLACE_DESCRIPTOR_PATHS` in order and returns the first
 * descriptor file that exists on the given branch, or `null` if none match.
 *
 * The official Claude Code layout is `.claude-plugin/marketplace.json`; a bare
 * root `marketplace.json` is accepted as a fallback. Probing stops at the first
 * hit so a present descriptor costs a single fetch.
 *
 * `IGitPort.getFileFromRepo` returns `null` for a missing file, which lets us
 * try the next candidate. Transport errors are thrown by the port and
 * propagate to the caller, so a network failure is never silently mistaken for
 * a missing descriptor.
 *
 * When `branch` is omitted the git port falls back to the repository's default
 * branch.
 */
export async function fetchMarketplaceDescriptorFile(
  gitPort: IGitPort,
  gitRepo: GitRepo,
  branch?: string,
): Promise<MarketplaceDescriptorFile | null> {
  for (const path of MARKETPLACE_DESCRIPTOR_PATHS) {
    const file = await gitPort.getFileFromRepo(gitRepo, path, branch);
    if (file) {
      return { path, sha: file.sha, content: file.content };
    }
  }

  return null;
}
