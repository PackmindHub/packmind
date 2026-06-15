import { GitRepo, IGitPort } from '@packmind/types';
import { MARKETPLACE_SYNC_BRANCH } from './marketplaceSyncPullRequest';

/**
 * Resolves which branch should be used as the source of truth when reading
 * the marketplace descriptor (`marketplace.json`) and the standalone
 * `packmind-lock.json` during publish / unpublish operations.
 *
 * Rationale: the publish + remove jobs always write to the rolling
 * `MARKETPLACE_SYNC_BRANCH` (`packmind/sync`), but historically read from the
 * marketplace's default branch. After the first publish, the rolling branch
 * carries the new plugin listing while the default branch is still untouched.
 * Reading from the default branch on the second publish would therefore drop
 * the previous plugin's descriptor + lock entries — even though the plugin
 * folder itself stays intact via GitHub's `base_tree` inheritance.
 *
 * Algorithm:
 *  - Probe whether `packmind/sync` exists on the marketplace repo.
 *  - If it does, return `packmind/sync` so successive publishes accumulate
 *    descriptor + lock entries on top of the unmerged state.
 *  - Otherwise fall back to the marketplace's default branch — covers the
 *    first publish ever (the branch will be created by
 *    `createBranchFromBase` just before the commit) and the post-merge
 *    case (GitHub's typical flow deletes the head branch after merge, so
 *    the merged plugins now live on the default branch).
 *
 * The "first publish ever" case and the "N-th publish after merge" case
 * follow the exact same code path: `checkBranchExists` returns `false`, we
 * read from the default branch, and downstream code creates the rolling
 * branch from that same base. Accumulation continues seamlessly from
 * whatever the default branch already contains.
 */
export async function resolveMarketplaceReadBranch(
  gitPort: IGitPort,
  marketplaceGitRepo: GitRepo,
): Promise<string> {
  const rollingBranchExists = await gitPort.checkBranchExists(
    marketplaceGitRepo.providerId,
    marketplaceGitRepo.owner,
    marketplaceGitRepo.repo,
    MARKETPLACE_SYNC_BRANCH,
  );
  return rollingBranchExists
    ? MARKETPLACE_SYNC_BRANCH
    : marketplaceGitRepo.branch;
}
