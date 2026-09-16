/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const ORGA_SPACE_MANAGEMENT_FEATURE_KEY = 'orga-space-management';

/**
 * Gates the switch that flips a space's navigation between the current
 * information architecture and the plugin-first one. The flag guards the
 * switch, not the new navigation: the mode itself is readable by anyone (it
 * lives in local storage), so a demo can be pinned without the flag.
 */
export const SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY = 'space-nav-plugin-first';

/**
 * Gates the package version area - the released version and the action that
 * cuts a new one. It is off for customers because a release is inert until the
 * consumer story ships: nothing installs a version yet, so a visible action
 * would only invite curators to cut immutable records that no one can consume.
 */
export const PACKAGE_RELEASES_FEATURE_KEY = 'package-releases';

/**
 * Union of all known feature-flag keys. Extend this whenever a new
 * `*_FEATURE_KEY` constant + `DEFAULT_FEATURE_DOMAIN_MAP` entry is added.
 */
export type FeatureFlagKey =
  | 'change-proposals-in-webapp'
  | 'orga-space-management'
  | 'space-nav-plugin-first'
  | 'package-releases';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<
  FeatureFlagKey,
  readonly string[]
> = {
  [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
  [ORGA_SPACE_MANAGEMENT_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
  [PACKAGE_RELEASES_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};
