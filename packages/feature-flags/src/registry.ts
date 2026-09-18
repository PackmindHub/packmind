import { EVERY_ACCOUNT_ENTRY } from './isFeatureFlagEnabled';

/* Custom feature toggle for the "Propose change" links in the app */
export const ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY =
  'change-proposals-in-webapp';

export const ORGA_SPACE_MANAGEMENT_FEATURE_KEY = 'orga-space-management';

/**
 * Who is offered the plugin-first navigation, meaning who sees the switch on
 * their profile page. It guards the switch, not the mode: the mode itself is
 * readable by anyone, since `?nav=` pins it and it lives in local storage, so
 * a demo link works without the flag.
 *
 * Widen this one to hand the beta out. Somebody invited by link who is outside
 * this audience has no control at all, only another link, which is why the two
 * move together.
 */
export const SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY = 'space-nav-plugin-first';

/**
 * Who *lands* on the plugin-first navigation without having chosen anything.
 *
 * Separate from the key above because the two answer different questions, and
 * a single key could not be widened without answering both at once: opening
 * the offer to everybody would also move everybody, which is not a beta. A
 * chosen mode still wins over this, so it is a default and not a lock.
 */
export const SPACE_NAV_PLUGIN_FIRST_BY_DEFAULT_FEATURE_KEY =
  'space-nav-plugin-first-by-default';

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
  | 'space-nav-plugin-first-by-default'
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
  [SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY]: [EVERY_ACCOUNT_ENTRY],
  [SPACE_NAV_PLUGIN_FIRST_BY_DEFAULT_FEATURE_KEY]: [
    '@packmind.com',
    '@promyze.com',
  ],
  [PACKAGE_RELEASES_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};
