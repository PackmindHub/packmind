import { FeatureFlagContext, isFeatureEnabled } from '@packmind/node-utils';

/**
 * Bare kebab-case feature-flag key gating the CLI repository-tracking surface.
 * Mirrors `CLI_REPO_TRACKING_FEATURE_KEY` in the `@packmind/feature-flags`
 * registry; declared as a literal here to avoid a package dependency on the
 * registry from the git domain.
 */
export const CLI_REPO_TRACKING_FEATURE_KEY = 'cli-repo-tracking' as const;

/**
 * Server-side guard: resolves whether the CLI repository-tracking feature is
 * enabled for the given user.
 */
export function isCliRepoTrackingEnabled(
  ctx: FeatureFlagContext,
): Promise<boolean> {
  return isFeatureEnabled(CLI_REPO_TRACKING_FEATURE_KEY, ctx);
}
