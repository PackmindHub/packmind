import {
  packageAttentionInstallCount,
  packageBehindInstallCount,
  packageFailedInstallCount,
} from '../redesign/selectors/buildPackageDriftOverview';
import type { PackageDrift } from '../redesign/types';

/**
 * The number carried by the Distribution tab of a package, and what it is made
 * of.
 *
 * It counts destinations, not artifacts: what the user acts on from that tab is
 * a repository to redistribute to, and a package that is three versions behind
 * in one repository is one thing to fix, not three. It is derived from the same
 * selectors as the Distribution entry in the navigation, so the two can never
 * disagree about the same package.
 */
export type DistributionTabBadge = {
  text: string;
  /** Read on hover, since a bare number does not say behind from failed. */
  tooltip: string;
};

/**
 * `undefined` when there is nothing to say, which is the common case: a tab
 * that always carries a zero trains the eye to stop reading it.
 *
 * A package with no drift data at all also gets nothing, because "not
 * distributed anywhere" is not a problem the tab can state in one number. The
 * tab body says it in words instead.
 */
export function buildDistributionTabBadge(
  pkg: PackageDrift | null,
): DistributionTabBadge | undefined {
  if (!pkg) return undefined;

  const needingAttention = packageAttentionInstallCount(pkg);
  if (needingAttention === 0) return undefined;

  return { text: String(needingAttention), tooltip: describe(pkg) };
}

/**
 * The two parts are stated separately rather than added up: they overlap, since
 * a destination that failed its last distribution is usually also behind.
 */
function describe(pkg: PackageDrift): string {
  const behind = packageBehindInstallCount(pkg);
  const failed = packageFailedInstallCount(pkg);
  const parts: string[] = [];

  if (behind > 0) {
    parts.push(`${behind} destination${behind === 1 ? '' : 's'} behind`);
  }
  if (failed > 0) {
    const noun = behind > 0 ? '' : `destination${failed === 1 ? '' : 's'} `;
    parts.push(`${failed} ${noun}with a failed distribution`);
  }

  return parts.join(', ');
}
