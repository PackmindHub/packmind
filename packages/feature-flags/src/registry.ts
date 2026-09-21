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
 * Opened to `EVERY_ACCOUNT_ENTRY`: the beta is handed out, not turned on, so
 * nobody already on the current navigation is moved, only offered the choice.
 * It also closes a gap the invitation link used to have — outside this
 * audience, the switch was hidden, so a `?nav=` link was the only way in.
 */
export const SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY = 'space-nav-plugin-first';

/**
 * Who *lands* on the plugin-first navigation without having chosen anything.
 *
 * Open to every account: the new navigation is what a space opens on now. It
 * stays a default and not a lock — a chosen mode wins over it, and the switch
 * on the profile page hands the current navigation back to anybody who wants
 * it.
 *
 * Still a separate key from the one above, because the two answer different
 * questions and only one of them can be narrowed again without also taking the
 * switch away.
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
  [SPACE_NAV_PLUGIN_FIRST_BY_DEFAULT_FEATURE_KEY]: [EVERY_ACCOUNT_ENTRY],
  [PACKAGE_RELEASES_FEATURE_KEY]: ['@packmind.com', '@promyze.com'],
};
