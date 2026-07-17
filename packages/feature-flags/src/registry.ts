/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const ORGA_SPACE_MANAGEMENT_FEATURE_KEY = 'orga-space-management';

export const GOVERNANCE_FEATURE_KEY = 'governance';

export const CLI_REPO_TRACKING_FEATURE_KEY = 'cli-repo-tracking';

/**
 * Union of all known feature-flag keys. Extend this whenever a new
 * `*_FEATURE_KEY` constant + `DEFAULT_FEATURE_DOMAIN_MAP` entry is added.
 */
export type FeatureFlagKey =
  | 'change-proposals-in-webapp'
  | 'orga-space-management'
  | 'governance'
  | 'cli-repo-tracking';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<
  FeatureFlagKey,
  readonly string[]
> = {
  [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
  [ORGA_SPACE_MANAGEMENT_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [GOVERNANCE_FEATURE_KEY]: ['joan.racenet@packmind.com'],
  [CLI_REPO_TRACKING_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};
