import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  FeatureFlagKey,
  isFeatureFlagEnabled,
} from '@packmind/feature-flags';
import { Configuration } from '../config/config/Configuration';

export type FeatureFlagContext = { userEmail?: string | null };

/**
 * Converts a kebab-case flag key into its SCREAMING_SNAKE env-var suffix.
 * e.g. `change-proposals-in-webapp` => `CHANGE_PROPOSALS_IN_WEBAPP`.
 */
const screamingSnake = (flag: string): string =>
  flag.replace(/-/g, '_').toUpperCase();

/**
 * Backend feature-flag gate. Plain async function (no port/adapter/registry).
 *
 * Resolution order:
 *   1. Env kill-switch `FF_<SCREAMING_SNAKE>`:
 *      - `all` / `on` / `true`   => force ON
 *      - `none` / `off` / `false` => force OFF
 *      - unset OR empty/whitespace => defer to the shared email-domain rule
 *   2. Shared email-domain rule from `@packmind/feature-flags`.
 *
 * This is the ONLY backend place that reads `Configuration.getConfig`, so
 * consuming use cases never touch infra/config directly.
 */
export async function isFeatureEnabled(
  flag: FeatureFlagKey,
  ctx: FeatureFlagContext,
): Promise<boolean> {
  const envKey = `FF_${screamingSnake(flag)}`;
  const raw = await Configuration.getConfig(envKey);
  const normalized = raw?.trim().toLowerCase();

  if (normalized) {
    if (normalized === 'all' || normalized === 'on' || normalized === 'true') {
      return true;
    }
    if (
      normalized === 'none' ||
      normalized === 'off' ||
      normalized === 'false'
    ) {
      return false;
    }
  }

  return isFeatureFlagEnabled({
    featureKeys: [flag],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: ctx.userEmail,
  });
}
